import { describe, expect, it } from "vitest";

import { buildTimeline, orderDisplayStatus, parseOrderFilter } from "./status";

describe("orderDisplayStatus", () => {
  it.each([
    ["pending_payment", null, "Menunggu pembayaran"],
    ["paid", "pending", "Diproses"],
    ["paid", "processing", "Diproses"],
    ["paid", "shipped", "Dikirim"],
    ["paid", "delivered", "Selesai"],
    ["paid", "returned", "Dikembalikan"],
    ["expired", null, "Kedaluwarsa"],
    ["cancelled", null, "Dibatalkan"],
  ] as const)("%s/%s → %s", (payment, shipping, label) => {
    expect(orderDisplayStatus(payment, shipping).label).toBe(label);
  });
});

describe("parseOrderFilter", () => {
  it("hanya menerima filter yang dikenal", () => {
    expect(parseOrderFilter("shipped")).toBe("shipped");
    expect(parseOrderFilter("hapus")).toBeUndefined();
    expect(parseOrderFilter(undefined)).toBeUndefined();
  });
});

describe("buildTimeline", () => {
  const row = (status_type: string, status_value: string, source: string, minute: number) => ({
    status_type,
    status_value,
    source,
    created_at: `2026-10-14T10:${String(minute).padStart(2, "0")}:00Z`,
  });

  it("urut waktu, menyaring event teknis, label ramah", () => {
    const timeline = buildTimeline([
      row("shipping", "picked", "biteship", 30),
      row("payment", "pending_payment", "system", 0),
      row("payment", "pending", "midtrans", 1),
      row("payment", "settlement", "midtrans", 5),
      row("payment", "paid", "system", 5),
      row("shipping", "processing", "system", 6),
      row("shipping", "order.waybill_id", "biteship", 7),
    ]);
    expect(timeline.map((t) => t.label)).toEqual([
      "Pesanan dibuat",
      "Pembayaran diterima",
      "Pesanan dikemas, kurir dijadwalkan",
      "Paket diambil kurir",
    ]);
  });

  it("menggabungkan label berurutan yang sama", () => {
    const timeline = buildTimeline([
      row("shipping", "picked", "biteship", 1),
      row("shipping", "picked", "biteship", 2),
    ]);
    expect(timeline).toHaveLength(1);
    expect(timeline[0]!.at).toBe("2026-10-14T10:01:00Z");
  });
});
