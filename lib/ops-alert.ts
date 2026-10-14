import "server-only";

import { log } from "@/lib/log";

/**
 * Kirim alert operasional ke Discord (opsional). Aktif bila env
 * OPS_DISCORD_WEBHOOK_URL diisi; tanpa env hanya dicatat di log. Tidak pernah
 * melempar error — alert tidak boleh menggagalkan webhook/aksi utama.
 */
export async function opsAlert(title: string, details: Record<string, string | number> = {}) {
  log("warn", "ops.alert", { title, ...details });
  const url = process.env.OPS_DISCORD_WEBHOOK_URL;
  if (!url?.startsWith("https://discord.com/api/webhooks/")) return;

  const lines = Object.entries(details).map(([k, v]) => `**${k}**: ${v}`);
  try {
    await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: [`⚠️ ${title}`, ...lines].join("\n").slice(0, 1900) }),
      signal: AbortSignal.timeout(5_000),
    });
  } catch (error) {
    log("error", "ops.alert_failed", { message: String(error) });
  }
}
