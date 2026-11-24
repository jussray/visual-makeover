import type { BoardItem, AppSpec } from "./types";

/** Small deterministic string hash (FNV-1a, 32-bit) -> hex. */
export function hashString(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

export type BoardFingerprint = string & { readonly __brand: "board" };
export type AppFingerprint = string & { readonly __brand: "app" };

/** Fingerprint of everything the brief depends on. Order-insensitive. */
export function boardFingerprint(items: BoardItem[], imageConsent: boolean): BoardFingerprint {
  const parts = items
    .map((i) => `${i.id}|${i.note.trim()}|${[...i.tags].sort().join(",")}`)
    .sort();
  return hashString(`${imageConsent ? 1 : 0}::${parts.join("§")}`) as BoardFingerprint;
}

export function appFingerprint(spec: AppSpec): AppFingerprint {
  const feats = spec.features.map((f) => f.trim()).filter(Boolean);
  return hashString(`${spec.description.trim()}::${feats.join("§")}`) as AppFingerprint;
}

export interface Staleness {
  briefStale: boolean;
  screensStale: boolean;
  reasons: string[];
}

export function computeStaleness(args: {
  board: BoardFingerprint;
  app: AppFingerprint;
  brief: { basedOn: BoardFingerprint; revision: string } | null;
  screens: { briefRevision: string; app: AppFingerprint; briefWasStale: boolean } | null;
}): Staleness {
  const reasons: string[] = [];
  const briefStale = !!args.brief && args.brief.basedOn !== args.board;
  if (briefStale) reasons.push("Your mood board changed after this brief was written.");
  let screensStale = false;
  if (args.screens) {
    if (!args.brief || args.screens.briefRevision !== args.brief.revision) {
      screensStale = true;
      reasons.push("The design brief changed after these mockups were made.");
    }
    if (args.screens.app !== args.app) {
      screensStale = true;
      reasons.push("Your app description or features changed.");
    }
    if (briefStale) {
      screensStale = true;
      if (!reasons.includes("The design brief is out of date."))
        reasons.push("The design brief is out of date.");
    }
  }
  return { briefStale, screensStale, reasons };
}