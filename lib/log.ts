type Level = "info" | "warn" | "error";

/** Kunci yang tidak boleh masuk log (dicocokkan tanpa memperhatikan huruf besar). */
const SENSITIVE =
  /(signature|token|secret|password|authorization|api_?key|server_?key|email|phone|address|va_number|bill_key|biller_code|card)/i;

/** Samarkan nilai sensitif secara rekursif (objek & array). */
export function redact(value: unknown, depth = 0): unknown {
  if (depth > 5 || value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  return Object.fromEntries(
    Object.entries(value).map(([key, v]) => [
      key,
      SENSITIVE.test(key) ? "[redacted]" : redact(v, depth + 1),
    ]),
  );
}

/**
 * Log terstruktur satu baris JSON (mudah dicari di log Vercel), dengan data
 * sensitif disamarkan. `event` = nama singkat, mis. "webhook.midtrans".
 */
export function log(level: Level, event: string, data: Record<string, unknown> = {}) {
  const line = JSON.stringify({
    level,
    event,
    at: new Date().toISOString(),
    ...(redact(data) as Record<string, unknown>),
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

/** Pesan error yang aman untuk log. */
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
