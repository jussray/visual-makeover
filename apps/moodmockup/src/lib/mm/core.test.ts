import { describe, expect, it } from "vitest";
import { appFingerprint, boardFingerprint, computeStaleness } from "./fingerprint";
import { checkImageBytes, MAX_IMAGE_BYTES, sniffImageType } from "./files";
import { BriefSchema, ScreensSchema, parseStrict, briefToMarkdown } from "./schema";
import type { BoardItem } from "./types";

const item = (id: string, note = "", tags: BoardItem["tags"] = []): BoardItem => ({
  id, source: "library", src: "", name: id, note, tags,
});

const validBrief = {
  direction: "Warm and calm.",
  palette: [
    { hex: "#112233", role: "primary", name: "Ink" },
    { hex: "#445566", role: "secondary", name: "Slate" },
    { hex: "#AA3300", role: "accent", name: "Clay" },
    { hex: "#FAF6EE", role: "background", name: "Cream" },
    { hex: "#111111", role: "text", name: "Black" },
  ],
  typography: { heading: "Fraunces", body: "DM Sans", reasoning: "Contrast." },
  imagery: "Soft photos.", layout: "Generous.", tone: "Kind.", avoid: ["Neon"],
};

describe("fingerprints", () => {
  it("changes when a note changes, not when order changes", () => {
    const a = boardFingerprint([item("1", "x"), item("2")], false);
    expect(boardFingerprint([item("2"), item("1", "x")], false)).toBe(a);
    expect(boardFingerprint([item("1", "y"), item("2")], false)).not.toBe(a);
  });
  it("changes when image consent changes", () => {
    expect(boardFingerprint([item("1")], true)).not.toBe(boardFingerprint([item("1")], false));
  });
  it("ignores empty features", () => {
    expect(appFingerprint({ description: "A", features: ["x", " "] })).toBe(
      appFingerprint({ description: "A", features: ["x"] }),
    );
  });
});

describe("staleness", () => {
  const board = boardFingerprint([item("1")], false);
  const app = appFingerprint({ description: "d", features: [] });
  it("is fresh when fingerprints match", () => {
    const s = computeStaleness({ board, app, brief: { basedOn: board, revision: "r1" }, screens: { briefRevision: "r1", app, briefWasStale: false } });
    expect(s.briefStale).toBe(false);
    expect(s.screensStale).toBe(false);
  });
  it("marks brief AND screens stale when the board changes", () => {
    const newBoard = boardFingerprint([item("1", "edited")], false);
    const s = computeStaleness({ board: newBoard, app, brief: { basedOn: board, revision: "r1" }, screens: { briefRevision: "r1", app, briefWasStale: false } });
    expect(s.briefStale).toBe(true);
    expect(s.screensStale).toBe(true);
  });
  it("marks only screens stale when the app spec changes", () => {
    const app2 = appFingerprint({ description: "other", features: [] });
    const s = computeStaleness({ board, app: app2, brief: { basedOn: board, revision: "r1" }, screens: { briefRevision: "r1", app, briefWasStale: false } });
    expect(s.briefStale).toBe(false);
    expect(s.screensStale).toBe(true);
  });
  it("marks screens stale when the brief was regenerated", () => {
    const s = computeStaleness({ board, app, brief: { basedOn: board, revision: "r2" }, screens: { briefRevision: "r1", app, briefWasStale: false } });
    expect(s.screensStale).toBe(true);
  });
});

describe("file checks", () => {
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2]);
  const jpg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 9]);
  const webp = new Uint8Array([...("RIFF".split("").map((c) => c.charCodeAt(0))), 0, 0, 0, 0, ...("WEBP".split("").map((c) => c.charCodeAt(0)))]);
  it("sniffs real signatures", () => {
    expect(sniffImageType(png)).toBe("image/png");
    expect(sniffImageType(jpg)).toBe("image/jpeg");
    expect(sniffImageType(webp)).toBe("image/webp");
    expect(sniffImageType(new TextEncoder().encode("<svg>"))).toBeNull();
  });
  it("rejects files over 10 MB", () => {
    const big = new Uint8Array(MAX_IMAGE_BYTES + 1);
    big.set(png);
    expect(checkImageBytes("big.png", big, new Set()).ok).toBe(false);
  });
  it("accepts exactly 10 MB", () => {
    const ok = new Uint8Array(MAX_IMAGE_BYTES);
    ok.set(png);
    expect(checkImageBytes("ok.png", ok, new Set()).ok).toBe(true);
  });
  it("rejects duplicates", () => {
    const first = checkImageBytes("a.png", png, new Set());
    expect(first.ok).toBe(true);
    if (first.ok) expect(checkImageBytes("b.png", png, new Set([first.hash])).ok).toBe(false);
  });
});

describe("brief validation", () => {
  it("accepts a valid brief", () => {
    expect(parseStrict(BriefSchema, JSON.stringify(validBrief)).ok).toBe(true);
  });
  it("fails closed on invalid JSON", () => {
    expect(parseStrict(BriefSchema, "{not json").ok).toBe(false);
  });
  it("rejects 3-digit hex", () => {
    const bad = { ...validBrief, palette: validBrief.palette.map((p, i) => (i === 0 ? { ...p, hex: "#123" } : p)) };
    expect(parseStrict(BriefSchema, JSON.stringify(bad)).ok).toBe(false);
  });
  it("rejects palettes missing a required role", () => {
    const bad = { ...validBrief, palette: [...validBrief.palette.slice(0, 4), { hex: "#000000", role: "surface", name: "x" }] };
    expect(parseStrict(BriefSchema, JSON.stringify(bad)).ok).toBe(false);
  });
  it("rejects fonts that aren't bundled", () => {
    const bad = { ...validBrief, typography: { ...validBrief.typography, heading: "Comic Sans" } };
    expect(parseStrict(BriefSchema, JSON.stringify(bad)).ok).toBe(false);
  });
  it("markdown states whether images were seen", () => {
    expect(briefToMarkdown(BriefSchema.parse(validBrief), { sawImages: false, stale: false })).toContain("images were not sent");
  });
});

describe("screen plan validation", () => {
  const screen = (blocks: unknown[]) => ({ kind: "home", title: "Home", caption: "c", density: "airy", radius: "soft", blocks });
  it("rejects unknown block kinds (e.g. html)", () => {
    const r = parseStrict(ScreensSchema, JSON.stringify({ screens: [1, 2, 3].map(() => screen([{ kind: "html", html: "<script>" }, { kind: "text", body: "x" }])) }));
    expect(r.ok).toBe(false);
  });
  it("drops unknown icons and caps long text", () => {
    const r = parseStrict(ScreensSchema, JSON.stringify({ screens: [1, 2, 3].map(() => screen([{ kind: "header", title: "x".repeat(200), icon: "javascript:alert(1)" }, { kind: "text", body: "y" }])) }));
    expect(r.ok).toBe(true);
    if (r.ok) {
      const h = r.value.screens[0]!.blocks[0]!;
      expect(h.kind === "header" && h.title.length).toBe(40);
      expect(h.kind === "header" && h.icon).toBeUndefined();
    }
  });
  it("requires 3 to 4 screens", () => {
    const one = { screens: [screen([{ kind: "text", body: "a" }, { kind: "text", body: "b" }])] };
    expect(parseStrict(ScreensSchema, JSON.stringify(one)).ok).toBe(false);
  });
});