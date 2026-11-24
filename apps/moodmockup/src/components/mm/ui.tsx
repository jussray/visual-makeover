import type { ReactNode } from "react";
import { AlertTriangle, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AiError } from "@/lib/mm/store";

export function Section({ title, children, aside, id }: { title: string; children: ReactNode; aside?: ReactNode; id?: string }) {
  return (
    <section aria-labelledby={id} className="glass rise-in rounded-3xl p-5 sm:p-7">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 id={id} className="text-2xl sm:text-3xl">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function StaleNote({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="flex items-start gap-2 rounded-2xl border border-warning/40 bg-warning/15 px-4 py-3 text-sm text-foreground">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

export function ErrorNote({ error, onRetry }: { error: AiError; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-center gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
      <AlertTriangle className="size-4 shrink-0 text-destructive" aria-hidden />
      <span className="flex-1">{error.message} Your work is kept.</span>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry}>
          <RotateCcw aria-hidden /> Try again
        </Button>
      )}
    </div>
  );
}

export function Busy({ label }: { label: string }) {
  return (
    <span role="status" aria-live="polite" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" aria-hidden /> {label}
    </span>
  );
}

export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-2xl bg-foreground/10 ${className}`} />;
}

export const fieldClass =
  "w-full rounded-2xl border border-glass-border bg-glass-strong px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function toAiError(e: unknown): AiError {
  if (e instanceof Error && e.message === "timeout") return { kind: "timeout", message: "The AI took too long to answer." };
  return { kind: "error", message: "Something went wrong reaching the AI service." };
}