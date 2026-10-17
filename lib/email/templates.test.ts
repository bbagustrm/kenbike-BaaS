import { describe, expect, it } from "vitest";

import { chatReplyEmail, escapeHtml, orderCancelledEmail, renderEmail } from "./templates";

describe("escapeHtml", () => {
  it("menetralkan tag & atribut", () => {
    expect(escapeHtml(`<script>alert("x")</script>&'`)).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;&amp;&#39;",
    );
  });
});

describe("renderEmail", () => {
  it("isi dari pengguna di-escape di HTML, teks polos tetap utuh", () => {
    const { html, text } = renderEmail({
      title: "Judul",
      paragraphs: ["Halo <b>kamu</b>"],
      quote: "<img src=x onerror=alert(1)>",
      cta: { label: "Buka", url: "http://localhost:3000/a?b=1&c=2" },
    });
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;b&gt;kamu&lt;/b&gt;");
    expect(html).toContain('href="http://localhost:3000/a?b=1&amp;c=2"');
    expect(text).toContain("Buka: http://localhost:3000/a?b=1&c=2");
  });
});

describe("template", () => {
  it("balasan chat memotong pratinjau panjang", () => {
    const email = chatReplyEmail({ subject: "Tanya ukuran", preview: "x".repeat(500), url: "u" });
    expect(email.subject).toBe("Balasan baru dari KenBike: Tanya ukuran");
    expect(email.text).toContain("…");
  });

  it("pembatalan meminta rekening bila belum diisi", () => {
    const email = orderCancelledEmail({
      orderNumber: "KB-1",
      amount: 125000,
      byAdmin: true,
      needsAccount: true,
      url: "u",
    });
    expect(email.subject).toBe("Pesanan KB-1 dibatalkan");
    expect(email.text).toContain("Isi data rekening: u");
    expect(email.text).toMatch(/Rp\s?125\.000/);
  });
});
