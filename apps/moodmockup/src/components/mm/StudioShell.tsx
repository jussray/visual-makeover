import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Check, Info } from "lucide-react";
import { useProject } from "@/lib/mm/store";

export const STEPS = [
  { n: 1, to: "/", label: "Mood board" },
  { n: 2, to: "/brief", label: "Design brief" },
  { n: 3, to: "/app", label: "Your app" },
  { n: 4, to: "/mockups", label: "Mockups" },
] as const;

export function useStepAccess() {
  const { state } = useProject();
  return {
    1: true,
    2: state.items.length >= 3,
    3: !!state.brief,
    4: !!state.brief && state.app.description.trim().length >= 3,
  } as Record<1 | 2 | 3 | 4, boolean>;
}

export function StudioShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { state, derived } = useProject();
  const access = useStepAccess();
  const done: Record<number, boolean> = { 1: state.items.length >= 3, 2: !!state.brief, 3: state.app.description.trim().length >= 3, 4: state.screens.length > 0 };
  const stale: Record<number, boolean> = { 2: derived.briefStale, 4: derived.anyScreenStale };
  return (
    <div className="min-h-dvh">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground">
        Skip to content
      </a>
      <header className="sticky top-0 z-30 border-b border-glass-border glass-strong">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <p className="font-display text-2xl leading-none">Moodboard to Mockups</p>
          <nav aria-label="Steps">
            <ol className="flex gap-1 overflow-x-auto sm:gap-2">
              {STEPS.map((s) => {
                const current = s.to === path;
                const enabled = access[s.n];
                const inner = (
                  <>
                    <span className={`grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold ${current ? "bg-primary-foreground text-primary" : done[s.n] ? "bg-primary text-primary-foreground" : "bg-foreground/10"}`}>
                      {done[s.n] && !current ? <Check className="size-3.5" aria-hidden /> : s.n}
                    </span>
                    <span className="whitespace-nowrap">{s.label}</span>
                    {stale[s.n] && <span className="rounded-full bg-warning px-1.5 text-[10px] font-bold text-warning-foreground">Out of date</span>}
                  </>
                );
                const cls = `flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-semibold transition-colors ${current ? "bg-primary text-primary-foreground" : enabled ? "hover:bg-foreground/5" : "opacity-45"}`;
                return (
                  <li key={s.n}>
                    {enabled ? (
                      <Link to={s.to} className={`${cls} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`} aria-current={current ? "step" : undefined}>
                        {inner}
                      </Link>
                    ) : (
                      <span className={cls} aria-disabled="true" title="Finish the earlier steps first">
                        {inner}
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        </div>
      </header>
      <p className="mx-auto mt-4 flex max-w-6xl items-center gap-2 px-4 text-xs text-muted-foreground sm:px-6">
        <Info className="size-3.5 shrink-0" aria-hidden />
        Your work lives only in this browser tab. Refreshing or closing it clears everything — export what you want to keep.
      </p>
      <main id="main" className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}

export function StepNav({ back, next, nextLabel, nextDisabled, hint }: { back?: string | undefined; next?: string | undefined; nextLabel?: string | undefined; nextDisabled?: boolean | undefined; hint?: string | undefined }) {
  return (
    <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
      {back ? (
        <Link to={back} className="inline-flex min-h-11 items-center rounded-full px-5 text-sm font-semibold glass hover:bg-glass-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          ← Back
        </Link>
      ) : <span />}
      <div className="flex items-center gap-3">
        {hint && <span className="text-sm text-muted-foreground">{hint}</span>}
        {next &&
          (nextDisabled ? (
            <span aria-disabled="true" className="inline-flex min-h-11 items-center rounded-full bg-primary/40 px-6 text-sm font-semibold text-primary-foreground">
              {nextLabel} →
            </span>
          ) : (
            <Link to={next} className="inline-flex min-h-11 items-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              {nextLabel} →
            </Link>
          ))}
      </div>
    </div>
  );
}

export function Locked({ children }: { children: ReactNode }) {
  return (
    <div className="glass rounded-3xl p-8 text-center">
      <p className="mb-4">{children}</p>
      <Link to="/" className="inline-flex min-h-11 items-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground">Go to the mood board</Link>
    </div>
  );
}