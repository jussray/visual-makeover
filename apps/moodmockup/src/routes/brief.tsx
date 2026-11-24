import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Copy, Download, RefreshCw, Sparkles } from "lucide-react";
import { useProject } from "@/lib/mm/store";
import { Locked, StepNav, useStepAccess } from "@/components/mm/StudioShell";
import { Busy, ErrorNote, Section, SkeletonBlock, StaleNote, fieldClass, toAiError } from "@/components/mm/ui";
import { Button } from "@/components/ui/button";
import { generateBrief } from "@/lib/mm/ai.functions";
import { downloadBlob, downscaleToDataUrl, onColor, withTimeout } from "@/lib/mm/client";
import { briefToMarkdown } from "@/lib/mm/schema";
import { fontStack } from "@/lib/mm/fonts";

export const Route = createFileRoute("/brief")({
  head: () => ({
    meta: [
      { title: "Design brief — Moodboard to Mockups" },
      { name: "description", content: "An AI-written design brief with palette, typography and layout direction from your mood board." },
      { property: "og:title", content: "Design brief — Moodboard to Mockups" },
      { property: "og:description", content: "Palette, typography and layout direction drawn from your mood board." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://moodboard-to-mockup-magic.lovable.app/brief" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://moodboard-to-mockup-magic.lovable.app/brief" }],
    scripts: [{ type: "application/ld+json", children: JSON.stringify({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Mood board", "item": "https://moodboard-to-mockup-magic.lovable.app/"}, {"@type": "ListItem", "position": 2, "name": "Design brief", "item": "https://moodboard-to-mockup-magic.lovable.app/brief"}]}) }],
  }),
  component: BriefPage,
});

function BriefPage() {
  const { state, dispatch, derived } = useProject();
  const access = useStepAccess();
  const [note, setNote] = useState("");
  const [copied, setCopied] = useState(false);
  if (!access[2]) return <Locked>Add at least 3 images to your mood board first.</Locked>;
  const b = state.brief;

  async function run(feedback?: string) {
    dispatch({ type: "briefStart" });
    try {
      const images = state.imageConsent
        ? await Promise.all(state.items.filter((i) => i.source === "upload").slice(0, 12).map((i) => downscaleToDataUrl(i.src)))
        : [];
      const r = await withTimeout(generateBrief({ data: {
        items: state.items.map((i) => ({ name: i.name, note: i.note, tags: i.tags, ...(i.description ? { description: i.description } : {}) })),
        images, imageConsent: state.imageConsent, ...(feedback ? { feedback } : {}),
      } }));
      if (r.ok) { dispatch({ type: "briefDone", brief: r.brief, sawImages: r.sawImages, basedOn: derived.board }); setNote(""); }
      else dispatch({ type: "briefFail", error: { kind: r.kind, message: r.message, ...(r.visionUnavailable ? { visionUnavailable: true } : {}) } });
    } catch (e) { dispatch({ type: "briefFail", error: toAiError(e) }); }
  }

  const md = b ? briefToMarkdown(b.value, { sawImages: b.sawImages, stale: derived.briefStale }) : "";
  const uploads = state.items.filter((i) => i.source === "upload").length;

  return (
    <div className="space-y-6">
      <header className="rise-in max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-widest text-accent">Step 2</p>
        <h1 className="mt-1 text-5xl leading-[1.05] sm:text-6xl">Your design brief</h1>
      </header>

      <Section title="Before we write it" id="consent-h">
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" className="mt-1 size-5 accent-[var(--primary)]" checked={state.imageConsent} disabled={uploads === 0} onChange={(e) => dispatch({ type: "setConsent", value: e.target.checked })} />
          <span>
            <strong>Let the AI look at my {uploads} uploaded image{uploads === 1 ? "" : "s"}.</strong> Smaller copies are sent to the Lovable AI service for this one request. Its provider processes them under its own policies; this app stores nothing. Leave unchecked to use only your notes, tags and library descriptions.
          </span>
        </label>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button className="rounded-full" onClick={() => void run()} disabled={state.briefLoading}>
            {b ? <RefreshCw aria-hidden /> : <Sparkles aria-hidden />} {b ? "Regenerate brief" : "Write my brief"}
          </Button>
          {state.briefLoading && <Busy label="Writing your brief…" />}
        </div>
        {state.briefError && <div className="mt-4"><ErrorNote error={state.briefError} onRetry={() => void run()} /></div>}
      </Section>

      {state.briefLoading && !b && <div className="grid gap-4 md:grid-cols-2"><SkeletonBlock className="h-48" /><SkeletonBlock className="h-48" /></div>}

      {b && (
        <>
          {derived.briefStale && <StaleNote>Your mood board changed since this brief was written. Regenerate to bring it up to date.</StaleNote>}
          <p className="text-sm text-muted-foreground">{b.sawImages ? "Written from your images, notes and tags." : "Written from your notes, tags and reference descriptions only — the AI did not see your images."}</p>
          <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
            <Section title="Direction" id="dir-h">
              <p className="text-lg leading-relaxed">{b.value.direction}</p>
              <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
                {([["Imagery", b.value.imagery], ["Layout & spacing", b.value.layout], ["Tone", b.value.tone]] as const).map(([k, v]) => (
                  <div key={k}><dt className="font-semibold">{k}</dt><dd className="text-muted-foreground">{v}</dd></div>
                ))}
                <div><dt className="font-semibold">Avoid</dt><dd><ul className="list-disc pl-4 text-muted-foreground">{b.value.avoid.map((a) => <li key={a}>{a}</li>)}</ul></dd></div>
              </dl>
            </Section>
            <div className="space-y-6">
              <Section title="Palette" id="pal-h">
                <ul className="grid grid-cols-3 gap-2">
                  {b.value.palette.map((p) => (
                    <li key={p.role} className="flex aspect-square flex-col justify-end rounded-2xl p-2 text-xs shadow-inner" style={{ background: p.hex, color: onColor(p.hex, "#1a1a1a") }}>
                      <span className="font-bold capitalize">{p.role}</span><span>{p.name}</span><span className="font-mono">{p.hex}</span>
                    </li>
                  ))}
                </ul>
              </Section>
              <Section title="Typography" id="type-h">
                <p className="text-4xl" style={{ fontFamily: fontStack(b.value.typography.heading) }}>{b.value.typography.heading}</p>
                <p className="mt-2" style={{ fontFamily: fontStack(b.value.typography.body) }}>{b.value.typography.body} — The quick brown fox jumps over the lazy dog.</p>
                <p className="mt-3 text-sm text-muted-foreground">{b.value.typography.reasoning}</p>
              </Section>
            </div>
          </div>
          <Section title="Refine it" id="ref-h">
            <label htmlFor="fb" className="text-sm">What should change?</label>
            <textarea id="fb" rows={2} maxLength={800} className={`${fieldClass} mt-2`} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. warmer colors, less formal type" />
            <div className="mt-3 flex flex-wrap gap-2">
              <Button className="rounded-full" disabled={!note.trim() || state.briefLoading} onClick={() => void run(note.trim())}><RefreshCw aria-hidden /> Add note and regenerate</Button>
              <Button variant="outline" className="rounded-full" onClick={() => { void navigator.clipboard.writeText(md).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }); }}><Copy aria-hidden /> {copied ? "Copied" : "Copy as Markdown"}</Button>
              <Button variant="outline" className="rounded-full" onClick={() => downloadBlob(new Blob([md], { type: "text/markdown" }), "design-brief.md")}><Download aria-hidden /> Download .md</Button>
            </div>
          </Section>
        </>
      )}
      <StepNav back="/" next="/app" nextLabel="Your app" nextDisabled={!b} />
    </div>
  );
}