import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Accessibility, Download, FileText, RefreshCw, Sparkles } from "lucide-react";
import { toPng } from "html-to-image";
import JSZip from "jszip";
import { useProject, type ScreenKind, type ScreenRecord } from "@/lib/mm/store";
import { Locked, StepNav, useStepAccess } from "@/components/mm/StudioShell";
import { Busy, ErrorNote, Section, SkeletonBlock, StaleNote, fieldClass, toAiError } from "@/components/mm/ui";
import { Button } from "@/components/ui/button";
import { PhoneScreen } from "@/components/mm/PhoneScreen";
import { generateScreens, reviewAccessibility, reviewOnboardingCopy } from "@/lib/mm/ai.functions";
import { downloadBlob, withTimeout } from "@/lib/mm/client";
import { briefToMarkdown } from "@/lib/mm/schema";
import { automaticChecks, copyFromPlan } from "@/lib/mm/review";

export const Route = createFileRoute("/mockups")({
  head: () => ({
    meta: [
      { title: "Mockups — Moodboard to Mockups" },
      { name: "description", content: "Mobile screen mockups styled by your brief, with accessibility and wording reviews and exports." },
      { property: "og:title", content: "Mockups — Moodboard to Mockups" },
      { property: "og:description", content: "Phone mockups styled by your design brief." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://moodboard-to-mockup-magic.lovable.app/mockups" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://moodboard-to-mockup-magic.lovable.app/mockups" }],
    scripts: [{ type: "application/ld+json", children: JSON.stringify({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Mood board", "item": "https://moodboard-to-mockup-magic.lovable.app/"}, {"@type": "ListItem", "position": 2, "name": "Mockups", "item": "https://moodboard-to-mockup-magic.lovable.app/mockups"}]}) }],
  }),
  component: MockupsPage,
});

function MockupsPage() {
  const { state, dispatch, derived } = useProject();
  const access = useStepAccess();
  const refs = useRef<Partial<Record<ScreenKind, HTMLDivElement | null>>>({});
  const [exportMsg, setExportMsg] = useState<string | null>(null);
  if (!access[4] || !state.brief) return <Locked>Finish your brief and describe your app first.</Locked>;
  const brief = state.brief.value;
  const base = { brief, description: state.app.description.trim(), features: state.app.features };

  async function all() {
    dispatch({ type: "screensStart" });
    try {
      const r = await withTimeout(generateScreens({ data: base }));
      if (r.ok) dispatch({ type: "screensDone", plans: r.screens });
      else dispatch({ type: "screensFail", error: { kind: r.kind, message: r.message } });
    } catch (e) { dispatch({ type: "screensFail", error: toAiError(e) }); }
  }
  async function one(rec: ScreenRecord, style?: "minimal" | "bold" | "playful", tweak?: string) {
    const kind = rec.plan.kind;
    dispatch({ type: "screenStart", kind });
    try {
      const r = await withTimeout(generateScreens({ data: { ...base, target: { kind, previous: rec.plan, otherTitles: state.screens.filter((s) => s !== rec).map((s) => s.plan.title), ...(style ? { style } : {}), ...(tweak ? { tweak } : {}) } } }));
      if (r.ok && r.screens[0]) dispatch({ type: "screenDone", plan: r.screens[0] });
      else dispatch({ type: "screenFail", kind, error: r.ok ? { kind: "invalid_output", message: "No screen returned." } : { kind: r.kind, message: r.message } });
    } catch (e) { dispatch({ type: "screenFail", kind, error: toAiError(e) }); }
  }
  async function audit() {
    dispatch({ type: "a11yStart" });
    const plans = state.screens.map((s) => s.plan);
    try {
      const r = await withTimeout(reviewAccessibility({ data: { brief, screens: plans, audience: state.audience, description: base.description } }));
      if (r.ok) dispatch({ type: "a11yDone", summary: r.summary, findings: [...automaticChecks(brief, plans, state.audience), ...r.findings.map((f) => ({ ...f, source: "ai" as const }))], basedOn: derived.a11yKey });
      else dispatch({ type: "a11yFail", error: { kind: r.kind, message: r.message } });
    } catch (e) { dispatch({ type: "a11yFail", error: toAiError(e) }); }
  }
  async function copyReview() {
    dispatch({ type: "copyStart" });
    try {
      const r = await withTimeout(reviewOnboardingCopy({ data: { copy: state.copyText.trim(), audience: state.audience, description: base.description } }));
      if (r.ok) dispatch({ type: "copyDone", report: r.report, basedOn: derived.copyKey });
      else dispatch({ type: "copyFail", error: { kind: r.kind, message: r.message } });
    } catch (e) { dispatch({ type: "copyFail", error: toAiError(e) }); }
  }
  async function exportPngs() {
    setExportMsg("Preparing images…");
    await document.fonts.ready;
    const zip = new JSZip();
    const failed: string[] = [];
    for (const s of state.screens) {
      const el = refs.current[s.plan.kind];
      try {
        if (!el) throw new Error("missing");
        const url = await toPng(el, { pixelRatio: 2, cacheBust: true });
        zip.file(`${s.plan.kind}.png`, url.split(",")[1]!, { base64: true });
      } catch { failed.push(s.plan.title); }
    }
    zip.file("design-brief.md", briefToMarkdown(brief, { sawImages: state.brief!.sawImages, stale: derived.briefStale }));
    downloadBlob(await zip.generateAsync({ type: "blob" }), "mockups.zip");
    setExportMsg(failed.length ? `Downloaded. These screens couldn't be captured: ${failed.join(", ")}. Try again.` : "Downloaded mockups.zip");
  }

  const onboarding = state.screens.find((s) => s.plan.kind === "onboarding");
  const audienceReady = state.audience.summary.trim().length >= 3;

  return (
    <div className="space-y-6">
      <header className="rise-in flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-widest text-accent">Step 4</p>
          <h1 className="mt-1 text-5xl leading-[1.05] sm:text-6xl">Your mockups</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button className="rounded-full" disabled={state.screensLoading} onClick={() => void all()}>{state.screens.length ? <RefreshCw aria-hidden /> : <Sparkles aria-hidden />} {state.screens.length ? "Regenerate all" : "Design my screens"}</Button>
          {state.screens.length > 0 && <Button variant="outline" className="rounded-full" onClick={() => void exportPngs()}><Download aria-hidden /> Download PNGs</Button>}
          <Button variant="outline" className="rounded-full" onClick={() => downloadBlob(new Blob([briefToMarkdown(brief, { sawImages: state.brief!.sawImages, stale: derived.briefStale })], { type: "text/markdown" }), "design-brief.md")}><FileText aria-hidden /> Brief .md</Button>
        </div>
      </header>
      {exportMsg && <p role="status" className="text-sm">{exportMsg}</p>}
      {state.screensLoading && <Busy label="Designing screens…" />}
      {state.screensError && <ErrorNote error={state.screensError} onRetry={() => void all()} />}
      {derived.anyScreenStale && <StaleNote>Your brief or app details changed. Screens marked “Out of date” use the old version.</StaleNote>}

      {state.screensLoading && state.screens.length === 0 && (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <SkeletonBlock key={i} className="h-[560px] rounded-[44px]" />)}</div>
      )}

      <ul className="grid justify-items-center gap-8 sm:grid-cols-2 xl:grid-cols-4">
        {state.screens.map((s) => <ScreenCard key={s.plan.kind} rec={s} stale={derived.screenStale(s)} busy={!!state.screenBusy[s.plan.kind]} error={state.screenErrors[s.plan.kind]} onRun={(st, tw) => void one(s, st, tw)} refSet={(el) => { refs.current[s.plan.kind] = el; }} />)}
      </ul>

      {state.screens.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Section title="Accessibility review" id="a11y-h" aside={<Button size="sm" className="rounded-full" disabled={!audienceReady || state.a11yLoading} onClick={() => void audit()}><Accessibility aria-hidden /> {state.a11y ? "Review again" : "Review screens"}</Button>}>
            {!audienceReady && <p className="text-sm text-muted-foreground">Describe your audience in step 3 to get recommendations tailored to them.</p>}
            {state.a11yLoading && <Busy label="Reviewing screens…" />}
            {state.a11yError && <ErrorNote error={state.a11yError} onRetry={() => void audit()} />}
            {state.a11y && (
              <div aria-live="polite">
                {derived.a11yStale && <StaleNote>Screens or audience changed since this review.</StaleNote>}
                <p className="my-3 text-sm">{state.a11y.summary}</p>
                <ul className="space-y-2">
                  {state.a11y.findings.map((f, i) => (
                    <li key={i} className="rounded-2xl bg-glass-strong p-3 text-sm">
                      <p className="flex flex-wrap gap-2 text-xs font-bold uppercase tracking-wide">
                        <span className={f.severity === "critical" ? "text-destructive" : f.severity === "warning" ? "text-accent" : "text-primary"}>{f.severity}</span>
                        <span className="text-muted-foreground">{f.screen}{f.blockIndex != null ? ` · block ${f.blockIndex + 1}` : ""} · {f.category.replace("_", " ")}{f.source === "check" ? " · automatic check" : ""}</span>
                      </p>
                      <p className="mt-1">{f.issue}</p>
                      <p className="mt-1 text-muted-foreground">→ {f.recommendation}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Section>
          <Section title="Onboarding wording check" id="copy-h">
            <label htmlFor="copy" className="text-sm">Paste or load your onboarding text</label>
            <textarea id="copy" rows={5} maxLength={3000} className={`${fieldClass} mt-2`} value={state.copyText} onChange={(e) => dispatch({ type: "setCopy", text: e.target.value })} />
            <div className="mt-3 flex flex-wrap gap-2">
              {onboarding && <Button size="sm" variant="outline" className="rounded-full" onClick={() => dispatch({ type: "setCopy", text: copyFromPlan(onboarding.plan) })}>Use onboarding screen text</Button>}
              <Button size="sm" className="rounded-full" disabled={!audienceReady || state.copyText.trim().length < 3 || state.copyLoading} onClick={() => void copyReview()}>Check wording</Button>
            </div>
            {state.copyLoading && <Busy label="Reading your wording…" />}
            {state.copyError && <ErrorNote error={state.copyError} onRetry={() => void copyReview()} />}
            {state.copyReview && (
              <div aria-live="polite" className="mt-3 space-y-2 text-sm">
                {derived.copyStale && <StaleNote>Text or audience changed since this check.</StaleNote>}
                <p>{state.copyReview.report.summary} <span className="text-muted-foreground">(Reading level: {state.copyReview.report.readingLevel.replace("_", " ")})</span></p>
                {state.copyReview.report.findings.map((f, i) => (
                  <div key={i} className="rounded-2xl bg-glass-strong p-3">
                    <p><s className="text-muted-foreground">{f.original}</s> → <strong>{f.suggestion}</strong></p>
                    <p className="text-xs text-muted-foreground">{f.problem.replace("_", " ")}: {f.explanation}</p>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>
      )}
      <StepNav back="/app" />
    </div>
  );
}

function ScreenCard({ rec, stale, busy, error, onRun, refSet }: { rec: ScreenRecord; stale: boolean; busy: boolean; error: { kind: string; message: string } | undefined; onRun: (style?: "minimal" | "bold" | "playful", tweak?: string) => void; refSet: (el: HTMLDivElement | null) => void }) {
  const { state } = useProject();
  const [tweak, setTweak] = useState("");
  return (
    <li className="rise-in flex w-full max-w-[320px] flex-col gap-3">
      <div className={`relative transition-opacity ${busy ? "opacity-50" : ""}`}>
        <PhoneScreen ref={refSet} plan={rec.plan} brief={state.brief!.value} />
        {stale && <span className="absolute left-3 top-3 rounded-full bg-warning px-2 py-0.5 text-[11px] font-bold text-warning-foreground">Out of date</span>}
      </div>
      <h2 className="text-2xl">{rec.plan.title}</h2>
      <p className="text-sm text-muted-foreground">{rec.plan.caption}</p>
      {busy && <Busy label="Redesigning…" />}
      {error && <ErrorNote error={error} onRetry={() => onRun()} />}
      <div className="flex flex-wrap gap-1.5">
        <Button size="sm" variant="outline" className="rounded-full" disabled={busy} onClick={() => onRun()}><RefreshCw aria-hidden /> Regenerate</Button>
        {(["minimal", "bold", "playful"] as const).map((s) => (
          <Button key={s} size="sm" variant="ghost" className="rounded-full capitalize" disabled={busy} onClick={() => onRun(s)}>More {s}</Button>
        ))}
      </div>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (tweak.trim()) { onRun(undefined, tweak.trim()); setTweak(""); } }}>
        <label htmlFor={`tw-${rec.plan.kind}`} className="sr-only">Tweak {rec.plan.title}</label>
        <input id={`tw-${rec.plan.kind}`} maxLength={400} className={fieldClass} value={tweak} onChange={(e) => setTweak(e.target.value)} placeholder="Tweak this screen…" />
        <Button type="submit" size="sm" className="shrink-0 rounded-full" disabled={busy || !tweak.trim()}>Apply</Button>
      </form>
    </li>
  );
}