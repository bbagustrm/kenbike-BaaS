/**
 * Validasi tujuan redirect setelah login (param `next`) agar tidak bisa
 * dipakai untuk open redirect ke domain lain. Hanya path internal yang lolos.
 */
export function safeNextPath(raw: unknown, fallback = "/"): string {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 512) return fallback;
  // "//evil.com" dan "/\evil.com" ditafsirkan browser sebagai URL eksternal.
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return fallback;
  // Tolak karakter kontrol (mis. tab/newline yang dibuang browser saat parsing URL).
  if (/[\u0000-\u001f\u007f]/.test(raw)) return fallback;
  return raw;
}
