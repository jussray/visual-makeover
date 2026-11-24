import { z } from "zod";
import type { Brief, ScreenPlan } from "./schema";
import { hashString } from "./fingerprint";
import { mix, onColor, paletteMap } from "./client";

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

/** Design-plan checks: not a measured interaction audit or WCAG certification. */
export function automaticChecks(brief: Brief, plans: ScreenPlan[], audience: Audience): A11yFinding[] {
  const p = paletteMap(brief), out: A11yFinding[] = [];
  const enhanced = audience.needs.includes("high_contrast");
  const motor = audience.needs.includes("large_touch_targets");
  const plain = audience.needs.includes("plain_language");
  for (const plan of plans) {
    const add = (category: A11yFinding["category"], severity: A11yFinding["severity"], issue: string, recommendation: string, blockIndex: number | null = null, need: A11yFinding["need"] = null) =>
      out.push({ source: "check", screen: plan.kind, blockIndex, category, severity, issue, recommendation, need });
    const check = (label: string, fg: string, bg: string, i: number | null = null) => {
      const ratio = contrastRatio(fg,bg);
      if (ratio < 4.5) add("contrast","critical",label+": "+ratio.toFixed(2)+":1, below the 4.5:1 normal-text target.","Adjust colors and recheck the actual rendering.",i);
      else if (enhanced && ratio < 7) add("contrast","warning",label+": "+ratio.toFixed(2)+":1, below the audience's enhanced 7:1 target.","Increase contrast where feasible.",i,"high_contrast");
    };
    check("Base text/background",p.text,p.background);
    if (plain && plan.blocks.length > 6) add("cognitive_load","warning","Design heuristic: more than six blocks may be difficult to scan.","Group related content and prioritize the main task.",null,"plain_language");
    let primary = 0;
    plan.blocks.forEach((b,i)=>{
      const small = mix(p.text,p.background,0.4);
      if(b.kind==="header" && b.subtitle) check("Header subtitle",small,p.background,i);
      if(b.kind==="hero"){
        const fill=p[b.tone], fg=onColor(fill,p.text);
        if(b.eyebrow)check("Hero eyebrow",mix(fill,fg,0.8),fill,i);
        if(b.body)check("Hero body",mix(fill,fg,0.9),fill,i);
        if(b.cta){primary++;check("Hero action",fill,fg,i);}
      }
      if(b.kind==="stats"){check("Statistic",p.primary,p.surface,i);check("Statistic label",small,p.surface,i);}
      if(b.kind==="list"){check("List label",p.text,p.surface,i);if(b.items.some(x=>x.subtitle||x.meta))check("List detail",small,p.surface,i);}
      if(b.kind==="cards")for(const c of b.items)check("Card label",onColor(p[c.tone],p.text),p[c.tone],i);
      if(b.kind==="chips"){check("Selected chip",onColor(p.primary,p.background),p.primary,i);check("Other chips",p.text,p.surface,i);}
      if(b.kind==="button"){if(b.variant==="primary"){primary++;check("Primary action",onColor(p.primary,p.background),p.primary,i);}else check("Secondary action",p.primary,p.background,i);}
      if(b.kind==="input" && b.placeholder)check("Placeholder",mix(p.text,p.background,0.5),p.background,i);
      if(b.kind==="tabbar"){check("Active tab",p.primary,p.surface,i);check("Inactive tab",mix(p.text,p.background,0.5),p.surface,i);}
      if(b.kind==="toggles"||b.kind==="progress")check("Control label",p.text,p.surface,i);
      if(motor && (["chips","tabbar","toggles"].includes(b.kind)||(b.kind==="hero"&&b.cta)))add("touch_targets","warning","Design heuristic: "+b.kind+" may contain small tap regions.","Measure actual hit areas; aim for 44×44 CSS px for this audience. WCAG 2.2 AA generally requires 24×24 CSS px or an applicable exception.",i,"large_touch_targets");
      if(audience.needs.includes("large_text")&&["stats","chips","tabbar","input"].includes(b.kind))add("text_size","tip","Design heuristic: compact typography.","Verify text resizing and reflow without lost content.",i,"large_text");
    });
    if(plain&&primary>1)add("cognitive_load","warning","Design heuristic: competing primary actions.","Choose one primary action.",null,"plain_language");
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