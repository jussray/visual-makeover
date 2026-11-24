import { z } from "zod";
import type { Brief, ScreenPlan } from "./schema";
import { hashString } from "./fingerprint";

/* ---------- Audience & accessibility profile (Step 3) ---------- */

export const A11Y_NEEDS = [
  "high_contrast",
  "large_touch_targets",
  "screen_reader",
  "plain_language",
  "reduced_motion",
  "color_blind_safe",
  "large_text",
] as const;
export type A11yNeed = (typeof A11Y_NEEDS)[number];

export const A11Y_NEED_LABELS: Record<A11yNeed, string> = {
  high_contrast: "Strong color contrast",
  large_touch_targets: "Large tap targets",
  screen_reader: "Works with screen readers",
  plain_language: "Plain, simple wording",
  reduced_motion: "Little or no motion",
  color_blind_safe: "Color-blind safe",
  large_text: "Larger text",
};

export interface AudiencePreset {
  id: string;
  label: string;
  audience: string;
  needs: A11yNeed[];
}
export const AUDIENCE_PRESETS: AudiencePreset[] = [
  { id: "everyday", label: "Everyday consumers", audience: "Busy adults using the app on the go, mixed tech confidence.", needs: ["large_touch_targets", "screen_reader"] },
  { id: "seniors", label: "Older adults / low tech confidence", audience: "Adults 65+, some with reduced vision or dexterity, new to apps like this.", needs: ["large_text", "large_touch_targets", "plain_language", "high_contrast", "reduced_motion"] },
  { id: "public", label: "Public service (strict accessibility)", audience: "Anyone in the general public, including people using assistive technology.", needs: ["high_contrast", "screen_reader", "plain_language", "color_blind_safe", "large_touch_targets"] },
  { id: "pro", label: "Professionals, dense data", audience: "Experienced professionals scanning lots of information quickly.", needs: ["color_blind_safe", "screen_reader"] },
];

export interface Audience {
  summary: string;
  needs: A11yNeed[];
  notes: string;
}
export const emptyAudience: Audience = { summary: "", needs: [], notes: "" };

export function applyPreset(current: Audience, preset: AudiencePreset): Audience {
  const needs = Array.from(new Set([...current.needs, ...preset.needs]));
  return { ...current, summary: current.summary.trim() ? current.summary : preset.audience, needs };
}

export function audienceFingerprint(a: Audience): string {
  return hashString(JSON.stringify([a.summary.trim(), [...a.needs].sort(), a.notes.trim()]));
}

/* ---------- Accessibility review (Step 4) ---------- */

export const A11Y_CATEGORIES = ["contrast", "touch_targets", "text_size", "screen_reader", "cognitive_load", "motion", "color_use", "wording"] as const;
const short = (n: number) => z.string().trim().min(1).max(n);

export const A11yFindingSchema = z.object({
  screen: z.enum(["onboarding", "home", "feature", "detail", "settings"]),
  blockIndex: z.number().int().min(0).max(20).nullable().optional(),
  category: z.enum(A11Y_CATEGORIES),
  severity: z.enum(["critical", "warning", "tip"]),
  issue: short(240),
  recommendation: short(320),
  need: z.enum(A11Y_NEEDS).nullable().optional(),
});
export type A11yFinding = z.infer<typeof A11yFindingSchema> & { source: "ai" | "check" };

export const A11yReportSchema = z.object({
  summary: short(500),
  findings: z.array(A11yFindingSchema).max(30),
});

/** Keep only findings that point at a screen (and block) that really exists in the plan set. */
export function groundFindings(findings: z.infer<typeof A11yFindingSchema>[], plans: ScreenPlan[]) {
  return findings.filter((f) => {
    const p = plans.find((s) => s.kind === f.screen);
    if (!p) return false;
    if (f.blockIndex == null) return true;
    return f.blockIndex < p.blocks.length;
  });
}

function lum(h: string) {
  const n = parseInt(h.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
export function contrastRatio(a: string, b: string) {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m) as [number, number];
  return (x + 0.05) / (y + 0.05);
}

/** Deterministic checks that never need AI: brief text/background contrast against the audience's needs. */
export function automaticChecks(brief: Brief, plans: ScreenPlan[], audience: Audience): A11yFinding[] {
  const get = (r: string) => brief.palette.find((p) => p.role === r)?.hex;
  const text = get("text"), bg = get("background");
  const out: A11yFinding[] = [];
  const target = audience.needs.includes("high_contrast") || audience.needs.includes("large_text") ? 7 : 4.5;
  const first = plans[0]?.kind;
  if (text && bg && first) {
    const r = contrastRatio(text, bg);
    if (r < target)
      out.push({
        source: "check",
        screen: first,
        category: "contrast",
        severity: r < 4.5 ? "critical" : "warning",
        issue: `Body text on the background has a contrast of ${r.toFixed(1)}:1; your audience needs at least ${target}:1.`,
        recommendation: "Darken the text color or lighten the background in the brief, then regenerate the screens.",
        need: target === 7 ? "high_contrast" : null,
      });
  }
  if (audience.needs.includes("large_touch_targets")) {
    for (const p of plans) {
      const chips = p.blocks.findIndex((b) => b.kind === "chips" && b.items.length > 4);
      if (chips >= 0)
        out.push({
          source: "check",
          screen: p.kind,
          blockIndex: chips,
          category: "touch_targets",
          severity: "warning",
          issue: "A row of more than four small chips is hard to tap accurately.",
          recommendation: "Use fewer, larger options (at least 44×44 px each) or a list.",
          need: "large_touch_targets",
        });
    }
  }
  return out;
}

/* ---------- Onboarding wording review ---------- */

export const CopyFindingSchema = z.object({
  original: short(300),
  problem: z.enum(["jargon", "vague", "too_long", "ambiguous", "passive", "unclear_action", "tone"]),
  explanation: short(240),
  suggestion: short(300),
});
export type CopyFinding = z.infer<typeof CopyFindingSchema>;
export const CopyReportSchema = z.object({
  summary: short(400),
  readingLevel: z.enum(["very_easy", "easy", "moderate", "hard"]),
  findings: z.array(CopyFindingSchema).max(15),
});
export type CopyReport = z.infer<typeof CopyReportSchema>;

const norm = (s: string) => s.toLowerCase().replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/\s+/g, " ").trim();
/** Only keep findings that quote wording the designer actually wrote, and that change something. */
export function groundCopyFindings(findings: CopyFinding[], copy: string): CopyFinding[] {
  const hay = norm(copy);
  return findings.filter((f) => hay.includes(norm(f.original)) && norm(f.original) !== norm(f.suggestion));
}

/** Copy text out of an onboarding screen plan so designers can review what the mockup says. */
export function copyFromPlan(plan: ScreenPlan): string {
  const lines: string[] = [];
  for (const b of plan.blocks) {
    switch (b.kind) {
      case "header": lines.push(b.title, b.subtitle ?? ""); break;
      case "hero": lines.push(b.eyebrow ?? "", b.title, b.body ?? "", b.cta ?? ""); break;
      case "text": lines.push(b.body); break;
      case "button": lines.push(b.label); break;
      case "input": lines.push(b.label, b.placeholder ?? ""); break;
      case "list": lines.push(b.title ?? "", ...b.items.flatMap((i) => [i.title, i.subtitle ?? ""])); break;
      case "cards": lines.push(...b.items.map((i) => i.title)); break;
      case "chips": lines.push(...b.items); break;
      case "toggles": lines.push(...b.items.map((i) => i.label)); break;
      case "progress": lines.push(b.label); break;
      default: break;
    }
  }
  return lines.filter((l) => l.trim()).join("\n");
}

export const MAX_COPY_CHARS = 3000;