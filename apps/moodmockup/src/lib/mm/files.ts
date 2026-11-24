export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export type ImageMime = "image/jpeg" | "image/png" | "image/webp";

/** Detect real image type from the first bytes, ignoring the declared MIME. */
export function sniffImageType(bytes: Uint8Array): ImageMime | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return "image/jpeg";
  if (
    bytes.length >= 8 &&
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => bytes[i] === b)
  )
    return "image/png";
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  )
    return "image/webp";
  return null;
}

export type FileCheck =
  | { ok: true; mime: ImageMime; hash: string }
  | { ok: false; reason: string };

export function hashBytes(bytes: Uint8Array): string {
  // FNV-1a over all bytes + length; good enough to catch duplicate uploads locally.
  let h = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i++) {
    h ^= bytes[i]!;
    h = Math.imul(h, 0x01000193);
  }
  return `${(h >>> 0).toString(16)}-${bytes.length}`;
}

export function checkImageBytes(
  name: string,
  bytes: Uint8Array,
  existingHashes: Set<string>,
): FileCheck {
  if (bytes.length > MAX_IMAGE_BYTES) return { ok: false, reason: `${name} is larger than 10 MB.` };
  if (bytes.length === 0) return { ok: false, reason: `${name} is empty.` };
  const mime = sniffImageType(bytes);
  if (!mime) return { ok: false, reason: `${name} isn't a JPG, PNG or WebP image.` };
  const hash = hashBytes(bytes);
  if (existingHashes.has(hash)) return { ok: false, reason: `${name} is already on your board.` };
  return { ok: true, mime, hash };
}