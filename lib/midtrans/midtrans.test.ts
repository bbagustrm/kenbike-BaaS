import { describe, expect, it } from "vitest";

import { buildSnapItems, mapMidtransStatus, midtransTime, paymentAttemptExpiry } from "./mapping";
import { midtransSignature, verifyMidtransSignature } from "./signature";

const KEY = "SB-Mid-server-test";

describe("signature", () => {
  const payload = { order_id: "KB-1-1", status_code: "200", gross_amount: "125000.00" };

  it("menerima signature yang benar", () => {
    const signature_key = midtransSignature(payload, KEY);
    expect(signature_key).toMatch(/^[0-9a-f]{128}$/);
    expect(verifyMidtransSignature({ ...payload, signature_key }, KEY)).toBe(true);
  });

  it("menolak signature salah, kosong, atau payload yang diubah", () => {
    const signature_key = midtransSignature(payload, KEY);
    expect(verifyMidtransSignature({ ...payload, signature_key }, "kunci-lain")).toBe(false);
    expect(verifyMidtransSignature({ ...payload, gross_amount: "1.00", signature_key }, KEY)).toBe(
      false,
    );
    expect(verifyMidtransSignature({ ...payload, signature_key: "abc" }, KEY)).toBe(false);
    expect(verifyMidtransSignature(payload, KEY)).toBe(false);
  });
});

describe("mapMidtransStatus", () => {
  it.each([
    ["settlement", undefined, "settlement", "paid"],
    ["capture", "accept", "capture", "paid"],
    ["capture", "challenge", "pending", null],
    ["capture", "deny", "deny", null],
    ["pending", undefined, "pending", null],
    ["deny", undefined, "deny", null],
    ["cancel", undefined, "cancel", null],
    ["expire", undefined, "expire", null],
    ["failure", undefined, "failure", null],
    ["refund", undefined, "refund", "refunded"],
    ["partial_refund", undefined, "refund", "refunded"],
  ] as const)("%s/%s → %s, order %s", (status, fraud, attempt, order) => {
    expect(mapMidtransStatus(status, fraud)).toEqual({ attempt, order });
  });

  it("status tidak dikenal → null", () => {
    expect(mapMidtransStatus("authorize")).toBeNull();
  });
});

describe("buildSnapItems", () => {
  const lines = [
    { variantId: "v1", name: "Sepeda", variantLabel: "Merah - M", price: 100000, quantity: 2 },
    { variantId: "v2", name: "Botol", variantLabel: null, price: 25000, quantity: 1 },
  ];

  it("menambahkan ongkir sebagai item dan totalnya cocok", () => {
    const items = buildSnapItems(lines, { courier: "jne", service: "reg", cost: 24000 }, 249000);
    expect(items.map((i) => i.name)).toEqual(["Sepeda (Merah - M)", "Botol", "Ongkir JNE REG"]);
  });

  it("memotong nama > 50 karakter", () => {
    const [item] = buildSnapItems(
      [{ variantId: "v", name: "x".repeat(80), variantLabel: null, price: 1, quantity: 1 }],
      { courier: "jne", service: "reg", cost: 0 },
      1,
    );
    expect(item!.name).toHaveLength(50);
  });

  it("melempar bila total tidak cocok", () => {
    expect(() => buildSnapItems(lines, { courier: "jne", service: "reg", cost: 0 }, 1)).toThrow();
  });
});

describe("paymentAttemptExpiry", () => {
  const now = new Date("2026-10-12T00:00:00Z");
  const hours = (h: number) => new Date(now.getTime() + h * 3_600_000);

  it("order baru (24 jam): attempt 23j45m", () => {
    expect(paymentAttemptExpiry(now, hours(24))).toEqual({
      expiresAt: new Date("2026-10-12T23:45:00Z"),
      durationMinutes: 1425,
    });
  });

  it("retry: berakhir 15 menit sebelum order kadaluarsa", () => {
    expect(paymentAttemptExpiry(now, hours(2))?.expiresAt).toEqual(
      new Date("2026-10-12T01:45:00Z"),
    );
  });

  it("sisa waktu terlalu pendek → null", () => {
    expect(paymentAttemptExpiry(now, new Date(now.getTime() + 19 * 60_000))).toBeNull();
    expect(paymentAttemptExpiry(now, new Date(now.getTime() + 20 * 60_000))).not.toBeNull();
  });
});

describe("midtransTime", () => {
  it("format UTC Midtrans", () => {
    expect(midtransTime(new Date("2026-10-12T03:04:05.678Z"))).toBe("2026-10-12 03:04:05 +0000");
  });
});
