import "server-only";

import { emailEnv } from "@/lib/env/server";
import { errorMessage, log } from "@/lib/log";

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Kategori untuk log, mis. "chat_reply". */
  tag: string;
};

/**
 * Kirim email lewat Resend REST API. Tidak pernah melempar: notifikasi tidak
 * boleh menggagalkan aksi utama. Tanpa RESEND_API_KEY email hanya dicatat.
 * MAIL_DEV_TO mengalihkan semua email ke satu inbox (penerima asli di subjek).
 */
export async function sendEmail(message: EmailMessage): Promise<boolean> {
  let env: ReturnType<typeof emailEnv>;
  try {
    env = emailEnv();
  } catch (error) {
    log("error", "email.env_invalid", { message: errorMessage(error) });
    return false;
  }
  if (!env.RESEND_API_KEY) {
    log("info", "email.skipped", { tag: message.tag, reason: "RESEND_API_KEY kosong" });
    return false;
  }

  const to = env.MAIL_DEV_TO ?? message.to;
  const subject = env.MAIL_DEV_TO ? `[DEV → ${message.to}] ${message.subject}` : message.subject;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.RESEND_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: env.MAIL_FROM,
        to: [to],
        subject: subject.slice(0, 250),
        html: message.html,
        text: message.text,
        tags: [{ name: "type", value: message.tag }],
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      log("error", "email.failed", {
        tag: message.tag,
        status: res.status,
        body: body.slice(0, 300),
      });
      return false;
    }
    log("info", "email.sent", { tag: message.tag, redirected: Boolean(env.MAIL_DEV_TO) });
    return true;
  } catch (error) {
    log("error", "email.failed", { tag: message.tag, message: errorMessage(error) });
    return false;
  }
}
