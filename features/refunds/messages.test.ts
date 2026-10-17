import { describe, expect, it } from "vitest";

import { maskAccountNumber, refundMessages } from "./messages";

const account = { bankName: "BCA", accountNumber: "1234567890", accountHolder: "Budi Santoso" };

describe("maskAccountNumber", () => {
  it("hanya 4 digit terakhir", () => {
    expect(maskAccountNumber("1234567890")).toBe("••••7890");
    expect(maskAccountNumber("123")).toBe("123");
  });
});

describe("refundMessages", () => {
  it("pembatalan oleh pembeli dengan rekening (nomor disamarkan)", () => {
    const text = refundMessages.cancelled({
      actor: "customer",
      reason: "Berubah pikiran",
      amount: 125000,
      account,
    });
    expect(text).toContain("oleh pembeli");
    expect(text).toContain("Berubah pikiran");
    expect(text).toContain("••••7890 a.n. Budi Santoso");
    expect(text).not.toContain("1234567890");
  });

  it("pembatalan oleh admin meminta rekening", () => {
    const text = refundMessages.cancelled({ actor: "admin", reason: "Stok habis", amount: 1 });
    expect(text).toContain("oleh admin");
    expect(text).toMatch(/isi data rekening/i);
  });

  it("refund selesai menyebut nominal & rekening", () => {
    const text = refundMessages.completed({
      amount: 125000,
      at: "2026-10-17T03:00:00Z",
      account,
    });
    expect(text).toMatch(/Refund Rp\s?125\.000 sudah ditransfer/);
    expect(text).toContain("BCA ••••7890");
  });
});
