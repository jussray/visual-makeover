import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Sparkles, X } from "lucide-react";
import { useProject } from "@/lib/mm/store";
import { Locked, StepNav, useStepAccess } from "@/components/mm/StudioShell";
import { Busy, ErrorNote, Section, fieldClass, toAiError } from "@/components/mm/ui";
import { Button } from "@/components/ui/button";
import { suggestFeatures } from "@/lib/mm/ai.functions";
import { withTimeout } from "@/lib/mm/client";
import { A11Y_NEEDS, A11Y_NEED_LABELS, AUDIENCE_PRESETS, applyPreset } from "@/lib/mm/review";
import type { AiError } from "@/lib/mm/store";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "Your app — Moodboard to Mockups" },
      { name: "description", content: "Describe your app, its core features, audience and accessibility needs." },
      { property: "og:title", content: "Your app — Moodboard to Mockups" },
      { property: "og:description", content: "Describe what your app does and who it serves." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://moodboard-to-mockup-magic.lovable.app/app" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://moodboard-to-mockup-magic.lovable.app/app" }],
    scripts: [{ type: "application/ld+json", children: JSON.stringify({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Mood board", "item": "https://moodboard-to-mockup-magic.lovable.app/"}, {"@type": "ListItem", "position": 2, "name": "Your app", "item": "https://moodboard-to-mockup-magic.lovable.app/app"}]}) }],
  }),
  component: AppPage,
});

function AppPage() {
  const { state, dispatch } = useProject();
  const access = useStepAccess();
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<AiError | null>(null);
  if (!access[3]) return <Locked>Create your design brief first.</Locked>;
  const { app, audience } = state;
  const setApp = (a: typeof app) => dispatch({ type: "setApp", app: a });
  const addFeature = (f: string) => {
    const v = f.trim().slice(0, 80);
    if (v && app.features.length < 8 && !app.features.includes(v)) setApp({ ...app, features: [...app.features, v] });
  };

  async function suggest() {
    setBusy(true); setErr(null);
    try {
      const r = await withTimeout(suggestFeatures({ data: { description: app.description.trim() } }));
      if (r.ok) setApp({ ...app, features: Array.from(new Set([...app.features, ...r.features])).slice(0, 8) });
      else setErr({ kind: r.kind, message: r.message });
    } catch (e) { setErr(toAiError(e)); }
    setBusy(false);
  }

  return (
    <div className="space-y-6">
      <header className="rise-in max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-widest text-accent">Step 3</p>
        <h1 className="mt-1 text-5xl leading-[1.05] sm:text-6xl">Tell us about your app</h1>
        <p className="mt-3 text-muted-foreground">Mockups are designed for phones.</p>
      </header>
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="What does it do?" id="what-h">
          <label htmlFor="desc" className="text-sm font-semibold">One sentence <span className="text-destructive">*</span></label>
          <input id="desc" required maxLength={300} className={`${fieldClass} mt-2`} value={app.description} onChange={(e) => setApp({ ...app, description: e.target.value })} placeholder="e.g. Helps neighbors share garden tools" />
          <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xl">Core features</h3>
            <Button size="sm" variant="outline" className="rounded-full" disabled={busy || app.description.trim().length < 3} onClick={() => void suggest()}><Sparkles aria-hidden /> Suggest</Button>
          </div>
          {busy && <Busy label="Thinking of features…" />}
          {err && <ErrorNote error={err} onRetry={() => void suggest()} />}
          <ul className="mt-3 space-y-2">
            {app.features.map((f) => (
              <li key={f} className="flex items-center justify-between rounded-2xl bg-glass-strong px-4 py-2 text-sm">
                {f}
                <Button size="icon" variant="ghost" aria-label={`Remove ${f}`} onClick={() => setApp({ ...app, features: app.features.filter((x) => x !== f) })}><X aria-hidden /></Button>
              </li>
            ))}
          </ul>
          <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); addFeature(draft); setDraft(""); }}>
            <label htmlFor="feat" className="sr-only">New feature</label>
            <input id="feat" className={fieldClass} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Add a feature (3–6 is ideal)" />
            <Button type="submit" size="icon" aria-label="Add feature" className="shrink-0 rounded-full"><Plus aria-hidden /></Button>
          </form>
        </Section>

        <Section title="Who is it for?" id="who-h">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Audience presets">
            {AUDIENCE_PRESETS.map((p) => (
              <Button key={p.id} size="sm" variant="outline" className="rounded-full" onClick={() => dispatch({ type: "setAudience", audience: applyPreset(audience, p) })}>{p.label}</Button>
            ))}
          </div>
          <label htmlFor="aud" className="mt-4 block text-sm font-semibold">Target audience</label>
          <textarea id="aud" rows={2} maxLength={400} className={`${fieldClass} mt-2`} value={audience.summary} onChange={(e) => dispatch({ type: "setAudience", audience: { ...audience, summary: e.target.value } })} />
          <fieldset className="mt-4">
            <legend className="text-sm font-semibold">Accessibility needs</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {A11Y_NEEDS.map((n) => {
                const on = audience.needs.includes(n);
                return (
                  <label key={n} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-2xl px-3 text-sm transition-colors ${on ? "bg-primary/10" : "bg-foreground/5"}`}>
                    <input type="checkbox" className="size-4 accent-[var(--primary)]" checked={on} onChange={() => dispatch({ type: "setAudience", audience: { ...audience, needs: on ? audience.needs.filter((x) => x !== n) : [...audience.needs, n] } })} />
                    {A11Y_NEED_LABELS[n]}
                  </label>
                );
              })}
            </div>
          </fieldset>
          <label htmlFor="anotes" className="mt-4 block text-sm font-semibold">Other notes</label>
          <textarea id="anotes" rows={2} maxLength={600} className={`${fieldClass} mt-2`} value={audience.notes} onChange={(e) => dispatch({ type: "setAudience", audience: { ...audience, notes: e.target.value } })} />
        </Section>
      </div>
      <StepNav back="/brief" next="/mockups" nextLabel="Mockups" nextDisabled={!access[4]} hint={!access[4] ? "Describe your app first" : undefined} />
    </div>
  );
}