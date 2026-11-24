import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { BriefSchema, ScreenSchema, ScreensSchema, parseStrict, ICONS, BLOCK_KINDS, type Brief, type ScreenPlan } from "./schema";
import { FONT_FAMILIES } from "./fonts";
import { TAGS } from "./types";
import { A11Y_NEEDS, A11yReportSchema, CopyReportSchema, groundFindings, groundCopyFindings, MAX_COPY_CHARS } from "./review";

// Stateless: nothing is persisted. Prompts, images and results only pass through.
const MODEL = "openai/gpt-6-astra" as const;
const TIMEOUT_MS = 75_000;
const MAX_IMAGES = 12;
const MAX_IMAGE_CHARS = 1_400_000; // ~1 MB of base64 per downsized image

export type AiFailure = {
  ok: false;
  kind: "unavailable" | "rate_limited" | "invalid_output" | "timeout" | "credits" | "rejected" | "error";
  message: string;
  visionUnavailable?: boolean;
};

// Best-effort per-instance limiter (the gateway also enforces workspace limits).
const hits = new Map<string, number[]>();
function rateLimited(key: string, max = 15, windowMs = 10 * 60_000) {
  const now = Date.now();
  const list = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (list.length >= max) return true;
  list.push(now);
  hits.set(key, list);
  if (hits.size > 5000) hits.clear();
  return false;
}
async function callerKey() {
  try {
    const { getRequestHeader } = await import("@tanstack/react-start/server");
    return getRequestHeader("cf-connecting-ip") ?? getRequestHeader("x-forwarded-for")?.split(",")[0] ?? "anon";
  } catch {
    return "anon";
  }
}

function extractText(res: unknown): string {
  if (!res || typeof res !== "object") return "";
  const output = (res as { output?: unknown }).output;
  if (!Array.isArray(output)) return "";
  let out = "";
  for (const item of output) {
    if (item && typeof item === "object" && (item as { type?: string }).type === "message") {
      const content = (item as { content?: unknown }).content;
      if (Array.isArray(content))
        for (const c of content)
          if (c && typeof c === "object" && (c as { type?: string }).type === "output_text")
            out += String((c as { text?: unknown }).text ?? "");
    }
  }
  return out;
}

type Part = { type: "input_text"; text: string } | { type: "input_image"; image_url: string; detail: "low" };

async function runJson(system: string, parts: Part[], hasImages: boolean): Promise<{ ok: true; text: string } | AiFailure> {
  const key = await callerKey();
  if (rateLimited(key)) return { ok: false, kind: "rate_limited", message: "Too many requests in a short time. Please wait a few minutes and try again." };
  const sdk = await import("@lovable.dev/ai-gateway");
  try {
    const res = await sdk.generateResponse(
      {
        model: MODEL,
        instructions: system,
        input: [{ role: "user", content: parts }],
        text: { format: { type: "json_object" } },
        max_output_tokens: 6000,
      },
      { signal: AbortSignal.timeout(TIMEOUT_MS), maxRetries: 1 },
    );
    return { ok: true, text: extractText(res) };
  } catch (e) {
    console.error("ai gateway error", e instanceof Error ? e.name : "unknown");
    if (e instanceof sdk.RateLimitError) return { ok: false, kind: "rate_limited", message: "The AI service is busy right now. Please try again in a minute." };
    if (e instanceof sdk.PaymentRequiredError) return { ok: false, kind: "credits", message: "The AI service is out of credits for this workspace." };
    if (e instanceof sdk.TimeoutError || (e instanceof Error && e.name === "TimeoutError"))
      return { ok: false, kind: "timeout", message: "The AI took too long to answer. Your work is safe — try again." };
    if (e instanceof sdk.RequestRejectedError || e instanceof sdk.PermissionDeniedError)
      return { ok: false, kind: "rejected", message: hasImages ? "The AI service couldn't accept the images." : "The AI service rejected the request.", visionUnavailable: hasImages };
    if (e instanceof sdk.ConfigurationError || e instanceof sdk.AuthenticationError)
      return { ok: false, kind: "unavailable", message: "The AI service isn't available in this environment." };
    return { ok: false, kind: "error", message: "The AI service failed to respond. Your work is safe — try again." };
  }
}

const BoardInput = z.object({
  items: z
    .array(z.object({ name: z.string().max(120), note: z.string().max(600), tags: z.array(z.enum(TAGS)).max(6), description: z.string().max(300).optional() }))
    .min(3)
    .max(40),
  images: z.array(z.string().startsWith("data:image/").max(MAX_IMAGE_CHARS)).max(MAX_IMAGES),
  feedback: z.string().max(800).optional(),
  imageConsent: z.boolean(),
}).refine((d) => d.imageConsent || d.images.length === 0, "Images can only be sent after the user agrees.");

const BRIEF_SYSTEM = `You are a senior product designer writing a concise design brief from a user's mood board.
Return JSON only with exactly this shape:
{"direction": string (2-3 sentences), "palette": [{"hex":"#RRGGBB","role":"primary|secondary|accent|background|text|surface","name": string}] (5 or 6 items, roles unique, must include primary, secondary, accent, background, text; ensure text/background contrast >= 4.5:1),
"typography":{"heading": font, "body": font, "reasoning": string}, "imagery": string, "layout": string, "tone": string, "avoid": string[] (3-6)}
font must be one of: ${FONT_FAMILIES.join(", ")}.
Ground every choice in the user's notes, tags and (if provided) the images. Never mention images you were not given.`;

export const generateBrief = createServerFn({ method: "POST" })
  .validator((d: unknown) => BoardInput.parse(d))
  .handler(async ({ data }): Promise<{ ok: true; brief: Brief; sawImages: boolean } | AiFailure> => {
    const hasImages = data.images.length > 0;
    const lines = data.items.map(
      (it, i) => `${i + 1}. ${it.name}${it.description ? ` — reference: ${it.description}` : ""}\n   Likes: ${it.note || "(no note)"}\n   Tags: ${it.tags.join(", ") || "none"}`,
    );
    const text = `Mood board (${data.items.length} items):\n${lines.join("\n")}\n\n${
      hasImages ? `${data.images.length} of the user's uploaded images are attached.` : "No images are attached; work from the notes, tags and reference descriptions only."
    }${data.feedback ? `\n\nUser feedback on the previous brief: ${data.feedback}` : ""}\n\nReturn JSON.`;
    const parts: Part[] = [{ type: "input_text", text }, ...data.images.map((u) => ({ type: "input_image" as const, image_url: u, detail: "low" as const }))];
    const r = await runJson(BRIEF_SYSTEM, parts, hasImages);
    if (!r.ok) return r;
    const parsed = parseStrict(BriefSchema, r.text);
    if (!parsed.ok) return { ok: false, kind: "invalid_output", message: parsed.error };
    return { ok: true, brief: parsed.value, sawImages: hasImages };
  });

const ScreensInput = z.object({
  brief: BriefSchema,
  description: z.string().min(3).max(300),
  features: z.array(z.string().max(80)).max(8),
  target: z
    .object({
      kind: z.enum(["onboarding", "home", "feature", "detail", "settings"]),
      previous: ScreenSchema.optional(),
      style: z.enum(["minimal", "bold", "playful"]).optional(),
      tweak: z.string().max(400).optional(),
      otherTitles: z.array(z.string().max(60)).max(4),
    })
    .optional(),
});

const SCREEN_SPEC = `Each screen: {"kind":"onboarding|home|feature|detail|settings","title":string<=40,"caption":string<=320 explaining how the screen applies specific brief principles and serves specific features,"density":"compact|comfortable|airy","radius":"sharp|soft|round","blocks":[...2-9 blocks]}
Allowed blocks (no other kinds, no HTML, no code, no CSS, no URLs):
{"kind":"header","title","subtitle"?,"icon"?}
{"kind":"hero","eyebrow"?,"title","body"?,"cta"?,"tone"}
{"kind":"text","body"}
{"kind":"stats","items":[{"label","value"}] 1-3}
{"kind":"list","title"?,"items":[{"title","subtitle"?,"meta"?,"icon"?}] 1-5}
{"kind":"cards","items":[{"title","icon"?,"tone"}] 1-4}
{"kind":"chips","items":[string] 1-6}
{"kind":"button","label","variant":"primary|secondary"}
{"kind":"input","label","placeholder"?}
{"kind":"progress","label","value":0-100}
{"kind":"toggles","items":[{"label","on":boolean}] 1-5}
{"kind":"media","label"?,"tone"}
{"kind":"tabbar","items":[{"label","icon"?}] 2-5,"active":index}
tone is one of primary|secondary|accent|surface. icon is one of: ${ICONS.join(", ")}.
Allowed kinds: ${BLOCK_KINDS.join(", ")}. Use realistic, specific copy for this app (no lorem ipsum).`;

export const generateScreens = createServerFn({ method: "POST" })
  .validator((d: unknown) => ScreensInput.parse(d))
  .handler(async ({ data }): Promise<{ ok: true; screens: ScreenPlan[] } | AiFailure> => {
    const ctx = `App: ${data.description}\nCore features: ${data.features.join("; ") || "(none given — infer sensible ones)"}\nDesign brief JSON: ${JSON.stringify(data.brief)}`;
    if (data.target) {
      const t = data.target;
      const sys = `You design one mobile app screen as a JSON plan. Return JSON only: a single screen object.\n${SCREEN_SPEC}`;
      const ask = `${ctx}\n\nRedesign the "${t.kind}" screen. Keep kind "${t.kind}". Other screens in the set: ${t.otherTitles.join(", ")}.${
        t.previous ? `\nPrevious version: ${JSON.stringify(t.previous)}` : ""
      }${t.style ? `\nMake it noticeably more ${t.style}, while staying within the brief palette.` : ""}${t.tweak ? `\nUser request: ${t.tweak}` : ""}\n\nReturn JSON.`;
      const r = await runJson(sys, [{ type: "input_text", text: ask }], false);
      if (!r.ok) return r;
      const parsed = parseStrict(ScreenSchema, r.text);
      if (!parsed.ok) return { ok: false, kind: "invalid_output", message: parsed.error };
      return { ok: true, screens: [{ ...parsed.value, kind: t.kind }] };
    }
    const sys = `You plan 3-4 mobile app screens as JSON. Return JSON only: {"screens":[...]}.
Choose screens from onboarding, home, feature (the main feature), detail and settings based on what the actual features need; kinds must be unique.
${SCREEN_SPEC}`;
    const r = await runJson(sys, [{ type: "input_text", text: `${ctx}\n\nReturn JSON.` }], false);
    if (!r.ok) return r;
    const parsed = parseStrict(ScreensSchema, r.text);
    if (!parsed.ok) return { ok: false, kind: "invalid_output", message: parsed.error };
    const kinds = parsed.value.screens.map((s) => s.kind);
    if (new Set(kinds).size !== kinds.length) return { ok: false, kind: "invalid_output", message: "The AI returned duplicate screen types." };
    return { ok: true, screens: parsed.value.screens };
  });

export const suggestFeatures = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ description: z.string().min(3).max(300) }).parse(d))
  .handler(async ({ data }): Promise<{ ok: true; features: string[] } | AiFailure> => {
    const r = await runJson(
      `Suggest 3 to 6 core features for a mobile app. Return JSON only: {"features": [string <= 60 chars]}.`,
      [{ type: "input_text", text: `App: ${data.description}\n\nReturn JSON.` }],
      false,
    );
    if (!r.ok) return r;
    const parsed = parseStrict(z.object({ features: z.array(z.string().min(1).max(80)).min(3).max(6) }), r.text);
    if (!parsed.ok) return { ok: false, kind: "invalid_output", message: parsed.error };
    return { ok: true, features: parsed.value.features };
  });

/* ---------- Accessibility review & onboarding wording review ---------- */

const AudienceInput = z.object({
  summary: z.string().trim().min(3).max(400),
  needs: z.array(z.enum(A11Y_NEEDS)).max(A11Y_NEEDS.length),
  notes: z.string().max(600),
});

const A11Y_SYSTEM = `You are an accessibility specialist reviewing mobile app screen plans (JSON) for a specific audience.
Return JSON only: {"summary": string, "findings": [{"screen":"onboarding|home|feature|detail|settings","blockIndex": number|null (0-based index into that screen's blocks),"category":"contrast|touch_targets|text_size|screen_reader|cognitive_load|motion|color_use|wording","severity":"critical|warning|tip","issue": string,"recommendation": string (specific and actionable),"need": one of ${A11Y_NEEDS.join("|")} or null}]}
Only comment on screens and blocks that exist in the plans. Quote the actual copy or block when relevant. Prioritise the audience's stated needs. 2-5 findings per screen.`;

export const reviewAccessibility = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z.object({ brief: BriefSchema, screens: z.array(ScreenSchema).min(1).max(4), audience: AudienceInput, description: z.string().max(300) }).parse(d),
  )
  .handler(async ({ data }) => {
    const text = `App: ${data.description}\nAudience: ${data.audience.summary}\nAccessibility needs: ${data.audience.needs.join(", ") || "none stated (use WCAG 2.2 AA)"}\nNotes: ${data.audience.notes || "none"}\nPalette: ${JSON.stringify(data.brief.palette)}\nFonts: ${data.brief.typography.heading} / ${data.brief.typography.body}\nScreens: ${JSON.stringify(data.screens)}\n\nReturn JSON.`;
    const r = await runJson(A11Y_SYSTEM, [{ type: "input_text", text }], false);
    if (!r.ok) return r;
    const parsed = parseStrict(A11yReportSchema, r.text);
    if (!parsed.ok) return { ok: false as const, kind: "invalid_output" as const, message: parsed.error };
    return { ok: true as const, summary: parsed.value.summary, findings: groundFindings(parsed.value.findings, data.screens) };
  });

const COPY_SYSTEM = `You are a UX writer reviewing onboarding screen copy for a specific audience.
Find words or sentences that could confuse this audience (jargon, vague, too long, ambiguous, passive, unclear call to action, wrong tone) and suggest clearer alternatives.
Return JSON only: {"summary": string,"readingLevel":"very_easy|easy|moderate|hard","findings":[{"original": exact phrase copied verbatim from the copy,"problem":"jargon|vague|too_long|ambiguous|passive|unclear_action|tone","explanation": string,"suggestion": string}]}
"original" MUST be copied exactly from the provided copy. Return an empty findings list if the copy is already clear.`;

export const reviewOnboardingCopy = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ copy: z.string().trim().min(3).max(MAX_COPY_CHARS), audience: AudienceInput, description: z.string().max(300) }).parse(d))
  .handler(async ({ data }) => {
    const text = `App: ${data.description || "(not given)"}\nAudience: ${data.audience.summary}\nNeeds: ${data.audience.needs.join(", ") || "none stated"}\nNotes: ${data.audience.notes || "none"}\n\nOnboarding copy:\n"""\n${data.copy}\n"""\n\nReturn JSON.`;
    const r = await runJson(COPY_SYSTEM, [{ type: "input_text", text }], false);
    if (!r.ok) return r;
    const parsed = parseStrict(CopyReportSchema, r.text);
    if (!parsed.ok) return { ok: false as const, kind: "invalid_output" as const, message: parsed.error };
    return { ok: true as const, report: { ...parsed.value, findings: groundCopyFindings(parsed.value.findings, data.copy) } };
  });

/* ---------- Storyboard scene panels (illustrated) ---------- */

const IMAGE_MODEL = "openai/gpt-image-2.5-sunburst" as const;

export const generatePanel = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        brief: BriefSchema,
        description: z.string().trim().min(3).max(300),
        audience: z.string().max(400),
        screen: z.object({ kind: z.string().max(20), title: z.string().max(80), caption: z.string().max(400) }),
        index: z.number().int().min(0).max(3),
        total: z.number().int().min(1).max(4),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<{ ok: true; image: string } | AiFailure> => {
    if (data.index >= data.total) return { ok: false, kind: "rejected", message: "Invalid storyboard position." };
    const key = await callerKey();
    if (rateLimited(`img:${key}`, 12)) return { ok: false, kind: "rate_limited", message: "Too many pictures in a short time. Please wait a few minutes." };
    const b = data.brief;
    const colors = b.palette.map((p) => `${p.name} ${p.hex}`).join(", ");
    const prompt = `Storyboard panel ${data.index + 1} of ${data.total} for a mobile app. App: ${data.description}.
${data.audience ? `The person: ${data.audience}.` : "Show a believable everyday person."}
Moment: they are on the "${data.screen.title}" screen (${data.screen.kind}). ${data.screen.caption}
Show the person in a real-life setting holding a phone at this moment of the journey; the phone screen may be blurred, no readable text, no logos, no words anywhere in the image.
Art direction: ${b.direction} Imagery: ${b.imagery} Tone: ${b.tone}. Use this color palette throughout: ${colors}. Avoid: ${b.avoid.join("; ")}.
Style: hand-drawn storyboard illustration, soft shading, cinematic 16:9 framing.`.slice(0, 3800);
    const sdk = await import("@lovable.dev/ai-gateway");
    try {
      const res = await sdk.generateImage(
        { model: IMAGE_MODEL, prompt, size: "1536x1024", quality: "medium", output_format: "jpeg", output_compression: 80, n: 1 },
        { signal: AbortSignal.timeout(150_000), maxRetries: 0 },
      );
      const b64 = (res as { data?: { b64_json?: string }[] }).data?.[0]?.b64_json;
      if (!b64) return { ok: false, kind: "invalid_output", message: "The AI didn't return a picture. Try again." };
      return { ok: true, image: `data:image/jpeg;base64,${b64}` };
    } catch (e) {
      console.error("image gateway error", e instanceof Error ? e.name : "unknown");
      if (e instanceof sdk.PaymentRequiredError) return { ok: false, kind: "credits", message: "The AI service is out of credits for this workspace." };
      if (e instanceof sdk.RateLimitError) return { ok: false, kind: "rate_limited", message: "The picture service is busy. Try again in a minute." };
      if (e instanceof sdk.TimeoutError || (e instanceof Error && e.name === "TimeoutError")) return { ok: false, kind: "timeout", message: "Drawing took too long. Try again." };
      if (e instanceof sdk.RequestRejectedError || e instanceof sdk.PermissionDeniedError) return { ok: false, kind: "rejected", message: "The picture service declined this scene." };
      return { ok: false, kind: "error", message: "The picture service failed. Your work is safe — try again." };
    }
  });