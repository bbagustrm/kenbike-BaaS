import { formatRupiah } from "@/lib/format";

/** Escape teks yang masuk ke HTML email (isi pesan, nama, dll. berasal dari pengguna). */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

type Layout = {
  title: string;
  /** Paragraf teks polos (di-escape). */
  paragraphs: string[];
  /** Kutipan opsional, mis. potongan pesan. */
  quote?: string;
  cta: { label: string; url: string };
  footer?: string;
};

/** HTML email sederhana (tabel + inline style agar tampil di Gmail/Outlook) + versi teks. */
export function renderEmail({ title, paragraphs, quote, cta, footer }: Layout) {
  const p = (text: string) =>
    `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#374151">${escapeHtml(text)}</p>`;
  const html = `<!doctype html>
<html lang="id"><body style="margin:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;padding:28px">
<tr><td>
<p style="margin:0 0 20px;font-size:18px;font-weight:bold;color:#111827">KenBike</p>
<h1 style="margin:0 0 16px;font-size:20px;color:#111827">${escapeHtml(title)}</h1>
${paragraphs.map(p).join("\n")}
${
  quote
    ? `<blockquote style="margin:0 0 16px;padding:10px 14px;border-left:3px solid #d1d5db;background:#f9fafb;color:#4b5563;font-size:14px;white-space:pre-line">${escapeHtml(quote)}</blockquote>`
    : ""
}
<p style="margin:20px 0"><a href="${escapeHtml(cta.url)}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:14px;font-weight:bold">${escapeHtml(cta.label)}</a></p>
<p style="margin:24px 0 0;font-size:12px;color:#9ca3af">${escapeHtml(footer ?? "Email ini dikirim otomatis oleh KenBike. Mohon tidak membalas email ini.")}</p>
</td></tr></table>
</td></tr></table>
</body></html>`;
  const text = [
    title,
    "",
    ...paragraphs,
    ...(quote ? ["", `"${quote}"`] : []),
    "",
    `${cta.label}: ${cta.url}`,
  ].join("\n");
  return { html, text };
}

const clip = (text: string, max = 300) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

export function chatReplyEmail(input: { subject: string; preview: string; url: string }) {
  return {
    subject: `Balasan baru dari KenBike: ${clip(input.subject, 80)}`,
    ...renderEmail({
      title: "Ada balasan baru untukmu",
      paragraphs: [`Tim KenBike membalas percakapan "${input.subject}".`],
      quote: clip(input.preview),
      cta: { label: "Buka percakapan", url: input.url },
    }),
  };
}

export function orderCancelledEmail(input: {
  orderNumber: string;
  amount: number;
  byAdmin: boolean;
  needsAccount: boolean;
  url: string;
}) {
  return {
    subject: `Pesanan ${input.orderNumber} dibatalkan`,
    ...renderEmail({
      title: `Pesanan ${input.orderNumber} dibatalkan`,
      paragraphs: [
        input.byAdmin
          ? "Pesananmu dibatalkan oleh tim KenBike."
          : "Pembatalan pesananmu sudah kami terima.",
        `Dana ${formatRupiah(input.amount)} akan dikembalikan penuh lewat transfer manual.`,
        input.needsAccount
          ? "Mohon isi data rekening tujuan refund agar dana bisa segera kami transfer."
          : "Kami akan mentransfer ke rekening yang sudah kamu isi.",
      ],
      cta: {
        label: input.needsAccount ? "Isi data rekening" : "Lihat pesanan",
        url: input.url,
      },
    }),
  };
}

export function refundCompletedEmail(input: { orderNumber: string; amount: number; url: string }) {
  return {
    subject: `Refund pesanan ${input.orderNumber} sudah ditransfer`,
    ...renderEmail({
      title: "Refund sudah ditransfer",
      paragraphs: [
        `Dana ${formatRupiah(input.amount)} untuk pesanan ${input.orderNumber} sudah kami transfer.`,
        "Bukti transfer bisa dilihat di detail pesanan.",
      ],
      cta: { label: "Lihat bukti transfer", url: input.url },
    }),
  };
}

export function reviewReplyEmail(input: { productName: string; reply: string; url: string }) {
  return {
    subject: `KenBike membalas ulasanmu untuk ${clip(input.productName, 80)}`,
    ...renderEmail({
      title: "Ulasanmu dibalas",
      paragraphs: [`Tim KenBike membalas ulasanmu untuk ${input.productName}.`],
      quote: clip(input.reply),
      cta: { label: "Lihat ulasan", url: input.url },
    }),
  };
}

export function commentReplyEmail(input: { productName: string; reply: string; url: string }) {
  return {
    subject: `Pertanyaanmu tentang ${clip(input.productName, 80)} sudah dijawab`,
    ...renderEmail({
      title: "Pertanyaanmu sudah dijawab",
      paragraphs: [`Tim KenBike menjawab pertanyaanmu tentang ${input.productName}.`],
      quote: clip(input.reply),
      cta: { label: "Lihat jawaban", url: input.url },
    }),
  };
}

export function adminNewMessageEmail(input: {
  customerName: string;
  subject: string;
  preview: string;
  url: string;
}) {
  return {
    subject: `Pesan baru dari ${clip(input.customerName, 60)}: ${clip(input.subject, 60)}`,
    ...renderEmail({
      title: "Pesan baru dari pembeli",
      paragraphs: [`${input.customerName} mengirim pesan di "${input.subject}".`],
      quote: clip(input.preview),
      cta: { label: "Balas di admin", url: input.url },
      footer: "Notifikasi admin KenBike.",
    }),
  };
}
