import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { ImagePlus, Library, Trash2, Upload } from "lucide-react";
import { useProject } from "@/lib/mm/store";
import { StepNav } from "@/components/mm/StudioShell";
import { Section, fieldClass } from "@/components/mm/ui";
import { Button } from "@/components/ui/button";
import { checkImageBytes } from "@/lib/mm/files";
import { LIBRARY, libraryDataUrl } from "@/lib/mm/library";
import { TAGS, type BoardItem } from "@/lib/mm/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mood board — Moodboard to Mockups" },
      { name: "description", content: "Collect images and references you love, annotate them, and turn them into a design brief." },
      { property: "og:title", content: "Mood board — Moodboard to Mockups" },
      { property: "og:description", content: "Collect and annotate visual references for your next app." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://moodboard-to-mockup-magic.lovable.app/" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://moodboard-to-mockup-magic.lovable.app/" }],
    scripts: [{ type: "application/ld+json", children: JSON.stringify({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Mood board", "item": "https://moodboard-to-mockup-magic.lovable.app/"}]}) }],
  }),
  component: MoodBoard,
});

function MoodBoard() {
  const { state, dispatch } = useProject();
  const [errors, setErrors] = useState<string[]>([]);
  const [drag, setDrag] = useState(false);
  const [showLib, setShowLib] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const n = state.items.length;

  async function addFiles(files: FileList | File[]) {
    const hashes = new Set(state.items.map((i) => i.contentHash).filter(Boolean) as string[]);
    const out: BoardItem[] = [];
    const errs: string[] = [];
    for (const f of Array.from(files)) {
      const bytes = new Uint8Array(await f.arrayBuffer());
      const c = checkImageBytes(f.name, bytes, hashes);
      if (!c.ok) { errs.push(c.reason); continue; }
      hashes.add(c.hash);
      out.push({ id: `up-${c.hash}`, source: "upload", src: URL.createObjectURL(new Blob([bytes], { type: c.mime })), name: f.name.slice(0, 120), note: "", tags: [], contentHash: c.hash });
    }
    setErrors(errs);
    if (out.length) dispatch({ type: "addItems", items: out });
  }

  const onBoard = new Set(state.items.map((i) => i.id));

  return (
    <div className="space-y-6">
      <header className="rise-in max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-widest text-accent">Step 1</p>
        <h1 className="mt-1 text-5xl leading-[1.05] sm:text-6xl">Gather what inspires you</h1>
        <p className="mt-3 text-muted-foreground">Add at least 3 images — 8 to 12 works best. Note what you like about each so the brief reflects it.</p>
      </header>

      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); void addFiles(e.dataTransfer.files); }}
        className={`glass rise-in flex flex-col items-center gap-3 rounded-3xl border-2 border-dashed p-8 text-center transition-colors ${drag ? "border-primary bg-primary/5" : "border-foreground/15"}`}
      >
        <Upload className="size-8 text-primary" aria-hidden />
        <p className="font-semibold">Drop JPG, PNG or WebP images here</p>
        <p className="text-sm text-muted-foreground">Up to 10 MB each. Images stay in this tab unless you later agree to share them with the AI.</p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button onClick={() => input.current?.click()} className="rounded-full"><ImagePlus aria-hidden /> Choose images</Button>
          <Button variant="outline" className="rounded-full" onClick={() => setShowLib((v) => !v)} aria-expanded={showLib}><Library aria-hidden /> {showLib ? "Hide" : "Browse"} reference library</Button>
        </div>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" aria-label="Choose images" onChange={(e) => { if (e.target.files) void addFiles(e.target.files); e.target.value = ""; }} />
      </div>
      {errors.length > 0 && (
        <ul role="alert" className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
          {errors.map((e) => <li key={e}>{e}</li>)}
        </ul>
      )}

      {showLib && (
        <Section title="Reference library" id="lib-h" aside={<span className="text-sm text-muted-foreground">24 original styles</span>}>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {LIBRARY.map((r) => {
              const added = onBoard.has(r.id);
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    aria-pressed={added}
                    onClick={() => added ? dispatch({ type: "removeItem", id: r.id }) : dispatch({ type: "addItems", items: [{ id: r.id, source: "library", src: libraryDataUrl(r), name: r.name, description: r.description, note: "", tags: [] }] })}
                    className={`group w-full overflow-hidden rounded-2xl border-2 text-left transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${added ? "border-primary" : "border-transparent"}`}
                  >
                    <img src={libraryDataUrl(r)} alt="" className="aspect-[4/5] w-full object-cover" />
                    <span className="block bg-glass-strong px-2 py-1.5 text-xs font-semibold">{added ? "✓ " : "+ "}{r.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      <Section title={`Your board (${n})`} id="board-h" aside={<span className="text-sm text-muted-foreground">{n < 3 ? `Add ${3 - n} more to continue` : n < 8 ? "Good start — 8–12 is ideal" : "Great collection"}</span>}>
        {n === 0 ? (
          <p className="py-10 text-center text-muted-foreground">Nothing here yet. Add images or pick from the library.</p>
        ) : (
          <ul className="columns-1 gap-4 sm:columns-2 lg:columns-3">
            {state.items.map((it) => (
              <li key={it.id} className="rise-in mb-4 break-inside-avoid overflow-hidden rounded-2xl bg-glass-strong shadow-sm">
                <img src={it.src} alt={it.description ?? it.name} className="w-full" />
                <div className="space-y-2 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold">{it.name}</p>
                    <Button size="icon" variant="ghost" aria-label={`Remove ${it.name}`} onClick={() => dispatch({ type: "removeItem", id: it.id })}><Trash2 aria-hidden /></Button>
                  </div>
                  <label className="sr-only" htmlFor={`note-${it.id}`}>What do you like about {it.name}?</label>
                  <textarea id={`note-${it.id}`} rows={2} maxLength={600} placeholder="What do you like about it?" className={fieldClass} value={it.note} onChange={(e) => dispatch({ type: "updateItem", id: it.id, note: e.target.value })} />
                  <div className="flex flex-wrap gap-1.5" role="group" aria-label="Quick tags">
                    {TAGS.map((t) => {
                      const on = it.tags.includes(t);
                      return (
                        <button key={t} type="button" aria-pressed={on} onClick={() => dispatch({ type: "updateItem", id: it.id, toggleTag: t })}
                          className={`min-h-8 rounded-full px-3 text-xs font-semibold capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${on ? "bg-primary text-primary-foreground" : "bg-foreground/5 hover:bg-foreground/10"}`}>{t}</button>
                      );
                    })}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>
      <StepNav next="/brief" nextLabel="Design brief" nextDisabled={n < 3} hint={n < 3 ? `${n}/3 images` : undefined} />
    </div>
  );
}