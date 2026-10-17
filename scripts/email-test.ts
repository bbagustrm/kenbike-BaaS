// Uji konfigurasi Resend: kirim satu email contoh ke MAIL_DEV_TO.
// Pemakaian: bun run email:test
import { chatReplyEmail } from "../lib/email/templates";

const key = process.env.RESEND_API_KEY;
const to = process.env.MAIL_DEV_TO;
const from = process.env.MAIL_FROM || "KenBike <onboarding@resend.dev>";
if (!key || !to) {
  console.error("Isi RESEND_API_KEY dan MAIL_DEV_TO di .env.local terlebih dahulu.");
  process.exit(1);
}

const email = chatReplyEmail({
  subject: "Uji notifikasi KenBike",
  preview: "Halo! Ini email uji dari localhost. Kalau email ini sampai, Resend sudah siap.",
  url: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/account/messages`,
});
const res = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
  body: JSON.stringify({
    from,
    to: [to],
    subject: `[UJI] ${email.subject}`,
    html: email.html,
    text: email.text,
  }),
});
console.log(res.ok ? `Terkirim ke ${to} ✓` : `Gagal (${res.status}): ${await res.text()}`);
process.exit(res.ok ? 0 : 1);
