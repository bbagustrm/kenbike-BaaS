import { describe, expect, it } from "vitest";

import { canDownloadInvoice, canDownloadLabel, documentFileName, paymentMethodLabel } from "./data";

describe("akses dokumen", () => {
  it("invoice hanya setelah dibayar", () => {
    expect(canDownloadInvoice("paid")).toBe(true);
    expect(canDownloadInvoice("refunded")).toBe(true);
    expect(canDownloadInvoice("pending_payment")).toBe(false);
    expect(canDownloadInvoice("expired")).toBe(false);
  });

  it("resi hanya untuk pesanan dibayar yang masih dikirim", () => {
    expect(canDownloadLabel("paid", "processing")).toBe(true);
    expect(canDownloadLabel("paid", null)).toBe(true);
    expect(canDownloadLabel("paid", "cancelled")).toBe(false);
    expect(canDownloadLabel("refunded", "delivered")).toBe(false);
  });
});

describe("paymentMethodLabel", () => {
  it("menggabungkan tipe & kanal", () => {
    expect(paymentMethodLabel("bank_transfer", "bca")).toBe("Transfer bank (VA) · BCA");
    expect(paymentMethodLabel("qris", "qris")).toBe("QRIS");
    expect(paymentMethodLabel(null, "bni")).toBe("BNI");
    expect(paymentMethodLabel(null, null)).toBeNull();
  });
});

describe("documentFileName", () => {
  it("hanya karakter aman", () => {
    expect(documentFileName("Invoice", "KB-20261014-0001")).toBe("Invoice-KB-20261014-0001.pdf");
    expect(documentFileName("Resi", 'KB-1"\r\n')).toBe("Resi-KB-1.pdf");
  });
});
