/** Escape wildcard LIKE agar input pencarian diperlakukan sebagai teks biasa. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

/** Nilai pertama dari searchParams (`?a=1&a=2` → "1"). */
export function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
