import { z } from "zod";
import { FONT_FAMILIES } from "./fonts";

const cap = (n: number) =>
  z.preprocess((v) => (typeof v === "string" ? v.trim().slice(0, n) : v), z.string().min(1));
const capOpt = (n: number) =>
  z.preprocess(
    (v) => (typeof v === "string" ? v.trim().slice(0, n) || undefined : v ?? undefined),
    z.string().optional(),
  );

export const HEX = /^#[0-9a-fA-F]{6}$/;
export const ROLES = ["primary", "secondary", "accent", "background", "text", "surface"] as const;
export type Role = (typeof ROLES)[number];

const fontEnum = z.enum(FONT_FAMILIES);

export const BriefSchema = z.object({
  direction: cap(600),
  palette: z
    .array(
      z.object({
        hex: z.string().regex(HEX),
        role: z.enum(ROLES),
        name: cap(40),
      }),
    )
    .min(5)
    .max(6)
    .refine(
      (p) => ["primary", "secondary", "accent", "background", "text"].every((r) => p.some((s) => s.role === r)),
      "Palette must define primary, secondary, accent, background and text",
    )
    .refine((p) => new Set(p.map((s) => s.role)).size === p.length, "Palette roles must be unique"),
  typography: z.object({
    heading: fontEnum,
    body: fontEnum,
    reasoning: cap(400),
  }),
  imagery: cap(400),
  layout: cap(400),
  tone: cap(300),
  avoid: z.array(cap(140)).min(1).max(6),
});
export type Brief = z.infer<typeof BriefSchema>;

export const ICONS = [
  "home", "search", "user", "settings", "bell", "heart", "star", "calendar", "clock", "map-pin",
  "camera", "image", "music", "book", "check", "plus", "chevron-right", "arrow-right", "message",
  "chart", "wallet", "cart", "leaf", "sparkle", "sun", "moon", "flame", "bookmark", "filter", "list",
] as const;
export type IconName = (typeof ICONS)[number];
const icon = z.preprocess((v) => ((ICONS as readonly unknown[]).includes(v) ? v : undefined), z.enum(ICONS).optional());
const tone = z.preprocess(
  (v) => (["primary", "secondary", "accent", "surface"].includes(v as string) ? v : "surface"),
  z.enum(["primary", "secondary", "accent", "surface"]),
);

const Block = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("header"), title: cap(40), subtitle: capOpt(60), icon }),
  z.object({ kind: z.literal("hero"), eyebrow: capOpt(30), title: cap(70), body: capOpt(140), cta: capOpt(24), tone }),
  z.object({ kind: z.literal("text"), body: cap(220) }),
  z.object({ kind: z.literal("stats"), items: z.array(z.object({ label: cap(18), value: cap(10) })).min(1).max(3) }),
  z.object({ kind: z.literal("list"), title: capOpt(30), items: z.array(z.object({ title: cap(40), subtitle: capOpt(50), meta: capOpt(12), icon })).min(1).max(5) }),
  z.object({ kind: z.literal("cards"), items: z.array(z.object({ title: cap(28), icon, tone })).min(1).max(4) }),
  z.object({ kind: z.literal("chips"), items: z.array(cap(18)).min(1).max(6) }),
  z.object({ kind: z.literal("button"), label: cap(24), variant: z.enum(["primary", "secondary"]).catch("primary") }),
  z.object({ kind: z.literal("input"), label: cap(24), placeholder: capOpt(40) }),
  z.object({ kind: z.literal("progress"), label: cap(30), value: z.number().min(0).max(100) }),
  z.object({ kind: z.literal("toggles"), items: z.array(z.object({ label: cap(30), on: z.boolean() })).min(1).max(5) }),
  z.object({ kind: z.literal("media"), label: capOpt(30), tone }),
  z.object({ kind: z.literal("tabbar"), items: z.array(z.object({ label: cap(12), icon })).min(2).max(5), active: z.number().int().min(0).max(4).catch(0) }),
]);
export type ScreenBlock = z.infer<typeof Block>;
export const BLOCK_KINDS = Block.options.map((o) => o.shape.kind.value);

export const ScreenSchema = z.object({
  kind: z.enum(["onboarding", "home", "feature", "detail", "settings"]),
  title: cap(40),
  caption: cap(320),
  density: z.enum(["compact", "comfortable", "airy"]).catch("comfortable"),
  radius: z.enum(["sharp", "soft", "round"]).catch("soft"),
  blocks: z.array(Block).min(2).max(9),
});
export type ScreenPlan = z.infer<typeof ScreenSchema>;

export const ScreensSchema = z.object({ screens: z.array(ScreenSchema).min(3).max(4) });

/** Fail closed: parse raw model text as JSON and validate. Never throws. */
export function parseStrict<S extends z.ZodTypeAny>(schema: S, raw: string): { ok: true; value: z.output<S> } | { ok: false; error: string } {
  let json: unknown;
  try {
    const trimmed = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
    json = JSON.parse(trimmed);
  } catch {
    return { ok: false, error: "The AI returned something that wasn't valid JSON." };
  }
  const r = schema.safeParse(json);
  if (!r.success) return { ok: false, error: `The AI response didn't match the expected format (${r.error.issues[0]?.path.join(".") || "root"}: ${r.error.issues[0]?.message}).` };
  return { ok: true, value: r.data as z.output<S> };
}

export function briefToMarkdown(b: Brief, opts: { sawImages: boolean; stale: boolean }): string {
  const lines = [
    "# Design brief",
    "",
    opts.stale ? "> Note: this brief is out of date with the current mood board.\n" : "",
    `_Based on ${opts.sawImages ? "your board images and notes" : "your notes and tags only (images were not sent)"}._`,
    "",
    "## Overall direction",
    b.direction,
    "",
    "## Palette",
    ...b.palette.map((p) => `- **${p.role}** — ${p.name} \`${p.hex.toUpperCase()}\``),
    "",
    "## Typography",
    `- Heading: ${b.typography.heading}`,
    `- Body: ${b.typography.body}`,
    "",
    b.typography.reasoning,
    "",
    "## Imagery & illustration",
    b.imagery,
    "",
    "## Layout & spacing",
    b.layout,
    "",
    "## Tone of voice",
    b.tone,
    "",
    "## Things to avoid",
    ...b.avoid.map((a) => `- ${a}`),
    "",
  ];
  return lines.filter((l, i) => !(l === "" && lines[i - 1] === "")).join("\n");
}