// Fonts are bundled locally (same-origin) so PNG export can embed them.
// The AI may only suggest families from this list.
export const FONT_FAMILIES = [
  "Fraunces",
  "Playfair Display",
  "Instrument Serif",
  "Libre Baskerville",
  "Space Grotesk",
  "DM Sans",
  "Syne",
  "Manrope",
  "IBM Plex Mono",
  "Nunito",
  "Work Sans",
  "Bricolage Grotesque",
  "Archivo Black",
  "Inter Tight",
] as const;

export type FontFamily = (typeof FONT_FAMILIES)[number];

const FALLBACK: Record<FontFamily, string> = {
  Fraunces: "Georgia, serif",
  "Playfair Display": "Georgia, serif",
  "Instrument Serif": "Georgia, serif",
  "Libre Baskerville": "Georgia, serif",
  "IBM Plex Mono": "ui-monospace, monospace",
  "Space Grotesk": "system-ui, sans-serif",
  "DM Sans": "system-ui, sans-serif",
  Syne: "system-ui, sans-serif",
  Manrope: "system-ui, sans-serif",
  Nunito: "system-ui, sans-serif",
  "Work Sans": "system-ui, sans-serif",
  "Bricolage Grotesque": "system-ui, sans-serif",
  "Archivo Black": "Impact, system-ui, sans-serif",
  "Inter Tight": "system-ui, sans-serif",
};

export function fontStack(family: string): string {
  const known = (FONT_FAMILIES as readonly string[]).includes(family)
    ? (family as FontFamily)
    : null;
  if (!known) return "system-ui, sans-serif";
  return `"${known}", ${FALLBACK[known]}`;
}