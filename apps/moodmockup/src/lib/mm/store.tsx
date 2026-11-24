import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from "react";
import type { BoardItem, AppSpec, Tag } from "./types";
import type { Brief, ScreenPlan } from "./schema";
import { emptyAudience, audienceFingerprint, type Audience, type A11yFinding, type CopyReport } from "./review";
import { appFingerprint, boardFingerprint, hashString, type AppFingerprint, type BoardFingerprint } from "./fingerprint";

export type AiError = { kind: string; message: string; visionUnavailable?: boolean };

export interface BriefRecord {
  value: Brief;
  basedOn: BoardFingerprint;
  revision: string;
  sawImages: boolean;
}
export interface ScreenRecord {
  plan: ScreenPlan;
  revision: number;
  briefRevision: string;
  app: AppFingerprint;
}
export type ScreenKind = ScreenPlan["kind"];

export interface State {
  items: BoardItem[];
  imageConsent: boolean;
  brief: BriefRecord | null;
  briefLoading: boolean;
  briefError: AiError | null;
  app: AppSpec;
  screens: ScreenRecord[];
  screensLoading: boolean;
  screensError: AiError | null;
  screenBusy: Partial<Record<ScreenKind, boolean>>;
  screenErrors: Partial<Record<ScreenKind, AiError>>;
  audience: Audience;
  a11y: { summary: string; findings: A11yFinding[]; basedOn: string } | null;
  a11yLoading: boolean;
  a11yError: AiError | null;
  copyText: string;
  copyReview: { report: CopyReport; basedOn: string } | null;
  copyLoading: boolean;
  copyError: AiError | null;
}

export const initialState: State = {
  items: [],
  imageConsent: false,
  brief: null,
  briefLoading: false,
  briefError: null,
  app: { description: "", features: [] },
  screens: [],
  screensLoading: false,
  screensError: null,
  screenBusy: {},
  screenErrors: {},
  audience: emptyAudience,
  a11y: null,
  a11yLoading: false,
  a11yError: null,
  copyText: "",
  copyReview: null,
  copyLoading: false,
  copyError: null,
};

export type Action =
  | { type: "addItems"; items: BoardItem[] }
  | { type: "removeItem"; id: string }
  | { type: "updateItem"; id: string; note?: string; toggleTag?: Tag }
  | { type: "setConsent"; value: boolean }
  | { type: "briefStart" }
  | { type: "briefDone"; brief: Brief; sawImages: boolean; basedOn: BoardFingerprint }
  | { type: "briefFail"; error: AiError }
  | { type: "setApp"; app: AppSpec }
  | { type: "screensStart" }
  | { type: "screensDone"; plans: ScreenPlan[] }
  | { type: "screensFail"; error: AiError }
  | { type: "screenStart"; kind: ScreenKind }
  | { type: "screenDone"; plan: ScreenPlan }
  | { type: "screenFail"; kind: ScreenKind; error: AiError }
  | { type: "setAudience"; audience: Audience }
  | { type: "a11yStart" }
  | { type: "a11yDone"; summary: string; findings: A11yFinding[]; basedOn: string }
  | { type: "a11yFail"; error: AiError }
  | { type: "setCopy"; text: string }
  | { type: "copyStart" }
  | { type: "copyDone"; report: CopyReport; basedOn: string }
  | { type: "copyFail"; error: AiError };

export function reducer(s: State, a: Action): State {
  switch (a.type) {
    case "addItems":
      return { ...s, items: [...s.items, ...a.items.filter((n) => !s.items.some((i) => i.id === n.id))] };
    case "removeItem":
      return { ...s, items: s.items.filter((i) => i.id !== a.id) };
    case "updateItem":
      return {
        ...s,
        items: s.items.map((i) => {
          if (i.id !== a.id) return i;
          const tags = a.toggleTag ? (i.tags.includes(a.toggleTag) ? i.tags.filter((t) => t !== a.toggleTag) : [...i.tags, a.toggleTag]) : i.tags;
          return { ...i, note: a.note ?? i.note, tags };
        }),
      };
    case "setConsent":
      return { ...s, imageConsent: a.value };
    case "briefStart":
      return { ...s, briefLoading: true, briefError: null };
    case "briefDone":
      return {
        ...s,
        briefLoading: false,
        briefError: null,
        brief: { value: a.brief, basedOn: a.basedOn, sawImages: a.sawImages, revision: hashString(JSON.stringify(a.brief) + a.basedOn + Date.now()) },
      };
    case "briefFail":
      // Keep the previous brief; never delete work on failure.
      return { ...s, briefLoading: false, briefError: a.error };
    case "setApp":
      return { ...s, app: a.app };
    case "screensStart":
      return { ...s, screensLoading: true, screensError: null };
    case "screensDone": {
      if (!s.brief) return s;
      const briefRevision = s.brief.revision;
      const app = appFingerprint(s.app);
      const prev = new Map(s.screens.map((r) => [r.plan.kind, r.revision]));
      return {
        ...s,
        screensLoading: false,
        screenErrors: {},
        screens: a.plans.map((plan) => ({ plan, briefRevision, app, revision: (prev.get(plan.kind) ?? 0) + 1 })),
      };
    }
    case "screensFail":
      return { ...s, screensLoading: false, screensError: a.error };
    case "screenStart":
      return { ...s, screenBusy: { ...s.screenBusy, [a.kind]: true }, screenErrors: { ...s.screenErrors, [a.kind]: undefined } };
    case "screenDone": {
      if (!s.brief) return s;
      const briefRevision = s.brief.revision;
      const app = appFingerprint(s.app);
      return {
        ...s,
        screenBusy: { ...s.screenBusy, [a.plan.kind]: false },
        screens: s.screens.map((r) => (r.plan.kind === a.plan.kind ? { plan: a.plan, briefRevision, app, revision: r.revision + 1 } : r)),
      };
    }
    case "screenFail":
      return { ...s, screenBusy: { ...s.screenBusy, [a.kind]: false }, screenErrors: { ...s.screenErrors, [a.kind]: a.error } };
    case "setAudience":
      return { ...s, audience: a.audience };
    case "a11yStart":
      return { ...s, a11yLoading: true, a11yError: null };
    case "a11yDone":
      return { ...s, a11yLoading: false, a11y: { summary: a.summary, findings: a.findings, basedOn: a.basedOn } };
    case "a11yFail":
      return { ...s, a11yLoading: false, a11yError: a.error };
    case "setCopy":
      return { ...s, copyText: a.text };
    case "copyStart":
      return { ...s, copyLoading: true, copyError: null };
    case "copyDone":
      return { ...s, copyLoading: false, copyReview: { report: a.report, basedOn: a.basedOn } };
    case "copyFail":
      return { ...s, copyLoading: false, copyError: a.error };
  }
}

export function derive(s: State) {
  const board = boardFingerprint(s.items, s.imageConsent);
  const app = appFingerprint(s.app);
  const briefStale = !!s.brief && s.brief.basedOn !== board;
  const screenStale = (r: ScreenRecord) => briefStale || !s.brief || r.briefRevision !== s.brief.revision || r.app !== app;
  const anyScreenStale = s.screens.some(screenStale);
  const audience = audienceFingerprint(s.audience);
  const a11yKey = hashString(audience + JSON.stringify(s.screens.map((r) => [r.plan.kind, r.revision])) + (s.brief?.revision ?? ""));
  const copyKey = hashString(audience + s.copyText.trim());
  const a11yStale = !!s.a11y && s.a11y.basedOn !== a11yKey;
  const copyStale = !!s.copyReview && s.copyReview.basedOn !== copyKey;
  return { board, app, briefStale, screenStale, anyScreenStale, a11yKey, copyKey, a11yStale, copyStale, hasWork: s.items.length > 0 };
}

type Ctx = { state: State; dispatch: React.Dispatch<Action> };
const StoreCtx = createContext<Ctx | null>(null);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const urls = useRef(new Set<string>());
  useEffect(() => {
    for (const i of state.items) if (i.source === "upload") urls.current.add(i.src);
  }, [state.items]);
  // Revoke every object URL when the workspace unmounts.
  useEffect(() => {
    const set = urls.current;
    return () => {
      set.forEach((u) => URL.revokeObjectURL(u));
      set.clear();
    };
  }, []);
  // Warn before a refresh wipes in-memory work.
  useEffect(() => {
    if (state.items.length === 0) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [state.items.length]);
  const wrapped = useCallback<React.Dispatch<Action>>(
    (a) => {
      if (a.type === "removeItem") {
        const it = state.items.find((i) => i.id === a.id);
        if (it?.source === "upload") {
          URL.revokeObjectURL(it.src);
          urls.current.delete(it.src);
        }
      }
      dispatch(a);
    },
    [state.items],
  );
  const value = useMemo(() => ({ state, dispatch: wrapped }), [state, wrapped]);
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useProject() {
  const c = useContext(StoreCtx);
  if (!c) throw new Error("useProject must be used inside ProjectProvider");
  return { ...c, derived: derive(c.state) };
}