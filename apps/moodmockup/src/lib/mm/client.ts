import type { Brief, Role } from "./schema";

export const CLIENT_TIMEOUT_MS = 90_000;

export async function withTimeout<T>(p: Promise<T>, ms = CLIENT_TIMEOUT_MS): Promise<T> {
  let t: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, rej) => {
    t = setTimeout(() => rej(new Error("timeout")), ms);
  });
  try {
    return await Promise.race([p, timeout]);
  } finally {
    clearTimeout(t);
  }
}

/** Downscale an image to a JPEG data URL so we send far less data to the AI service. */
export async function downscaleToDataUrl(src: string, max = 768): Promise<string> {
  const img = new Image();
  img.src = src;
  await img.decode();
  const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(img.naturalWidth * scale));
  c.height = Math.max(1, Math.round(img.naturalHeight * scale));
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.8);
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export function paletteMap(b: Brief): Record<Role, string> {
  const get = (r: Role) => b.palette.find((p) => p.role === r)?.hex;
  const bg = get("background") ?? "#ffffff";
  return {
    primary: get("primary") ?? "#222222",
    secondary: get("secondary") ?? "#666666",
    accent: get("accent") ?? "#cc6633",
    background: bg,
    text: get("text") ?? "#111111",
    surface: get("surface") ?? mix(bg, get("text") ?? "#111111", 0.06),
  };
}

function hexToRgb(h: string) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const;
}
export function mix(a: string, b: string, t: number) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return "#" + A.map((v, i) => Math.round(v + (B[i]! - v) * t).toString(16).padStart(2, "0")).join("");
}
export function luminance(h: string) {
  const [r, g, b] = hexToRgb(h).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrast(a: string, b: string) {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m) as [number, number];
  return (x + 0.05) / (y + 0.05);
}
/** Pick readable text over a fill: the brief's text color if it passes, else black/white. */
export function onColor(fill: string, preferred: string) {
  if (contrast(fill, preferred) >= 4.5) return preferred;
  return contrast(fill, "#ffffff") >= contrast(fill, "#111111") ? "#ffffff" : "#111111";
}