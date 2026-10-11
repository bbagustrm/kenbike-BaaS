import { describe, expect, it } from "vitest";

import { type DbVariant, labelOf, sortOptions, toFormVariants } from "./form-mapping";

const options = sortOptions([
  {
    name: "Ukuran",
    sort_order: 1,
    values: [
      { id: "l", value: "L", sort_order: 1 },
      { id: "m", value: "M", sort_order: 0 },
    ],
  },
  {
    name: "Warna",
    sort_order: 0,
    values: [
      { id: "merah", value: "Merah", sort_order: 0 },
      { id: "biru", value: "Biru", sort_order: 1 },
    ],
  },
]);

const variant = (id: string, valueIds: string[], extra: Partial<DbVariant> = {}): DbVariant => ({
  id,
  sku: id,
  price: 100,
  is_active: true,
  created_at: "2026-01-01",
  option_values: valueIds.map((option_value_id) => ({ option_value_id })),
  ...extra,
});

describe("labelOf", () => {
  it("mengikuti urutan opsi", () => {
    expect(labelOf(options, ["l", "biru"])).toBe("Biru / L");
    expect(labelOf(sortOptions([]), [])).toBe("Default");
  });
});

describe("toFormVariants", () => {
  it("urut sesuai nilai opsi dan mengisi stok", () => {
    const rows = toFormVariants(
      options,
      [variant("biru-m", ["biru", "m"]), variant("merah-l", ["merah", "l"])],
      (id) => (id === "biru-m" ? 3 : 7),
    );
    expect(rows.map((r) => r.id)).toEqual(["merah-l", "biru-m"]);
    expect(rows[1]).toMatchObject({ stock: 3, stockOriginal: 3, options: { Warna: "Biru" } });
  });

  it("melewati mapping tidak lengkap dan kombinasi ganda (aktif didahulukan)", () => {
    const rows = toFormVariants(
      options,
      [
        variant("lama", ["merah", "m"], { is_active: false, created_at: "2025-01-01" }),
        variant("baru", ["merah", "m"]),
        variant("rusak", ["merah"]),
      ],
      () => 0,
    );
    expect(rows.map((r) => r.id)).toEqual(["baru"]);
  });
});
