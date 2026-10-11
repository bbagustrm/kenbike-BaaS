import { describe, expect, it } from "vitest";

import type { OptionFormValues, VariantFormValues } from "./schemas";
import {
  buildVariantRows,
  combinations,
  comboLabel,
  skuBaseFromSlug,
  suggestSku,
} from "./variant-matrix";

const defaults = { price: 100_000, stock: 0 };

const row = (
  options: Record<string, string>,
  extra: Partial<VariantFormValues> = {},
): VariantFormValues => ({
  options,
  sku: "SKU",
  price: 1,
  stock: 1,
  isActive: true,
  ...extra,
});

const warna: OptionFormValues = { name: "Warna", values: ["Merah", "Biru"] };
const ukuran: OptionFormValues = { name: "Ukuran", values: ["M", "L"] };

describe("combinations", () => {
  it("tanpa opsi menghasilkan satu kombinasi kosong", () => {
    expect(combinations([])).toEqual([{}]);
  });

  it("menghasilkan produk kartesius sesuai urutan opsi", () => {
    expect(combinations([warna, ukuran])).toEqual([
      { Warna: "Merah", Ukuran: "M" },
      { Warna: "Merah", Ukuran: "L" },
      { Warna: "Biru", Ukuran: "M" },
      { Warna: "Biru", Ukuran: "L" },
    ]);
  });
});

describe("comboLabel & suggestSku", () => {
  it("label gabungan nilai, atau Default", () => {
    expect(comboLabel([warna, ukuran], { Warna: "Merah", Ukuran: "M" })).toBe("Merah / M");
    expect(comboLabel([], {})).toBe("Default");
  });

  it("SKU dari basis + potongan nilai", () => {
    expect(suggestSku("KB-HELM", [warna, ukuran], { Warna: "Hitam Doff", Ukuran: "XL" })).toBe(
      "KB-HELM-HITAMD-XL",
    );
  });
});

describe("buildVariantRows", () => {
  it("produk baru tanpa opsi: satu varian dengan nilai default", () => {
    const rows = buildVariantRows([], [], "KB-BEL", defaults);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ options: {}, sku: "KB-BEL", price: 100_000, isActive: true });
  });

  it("mempertahankan baris yang kombinasinya tetap ada", () => {
    const current = [
      row({ Warna: "Merah" }, { id: "00000000-0000-4000-8000-000000000001", sku: "A", price: 5 }),
      row({ Warna: "Biru" }, { sku: "B", price: 6 }),
    ];
    const rows = buildVariantRows(
      [{ name: "Warna", values: ["Biru", "Hijau"] }],
      current,
      "KB",
      defaults,
    );
    expect(rows.map((r) => r.sku)).toEqual(["B", "KB-HIJAU"]);
    expect(rows[1]!.price).toBe(5); // baris baru mewarisi harga baris pertama yang ada
    expect(rows[1]!.stock).toBe(0); // stok tidak ikut diwarisi
  });

  it("mengganti nama opsi tidak menghapus data varian", () => {
    const current = [
      row({ Color: "Merah" }, { id: "00000000-0000-4000-8000-000000000001", sku: "A" }),
    ];
    const rows = buildVariantRows([{ name: "Warna", values: ["Merah"] }], current, "KB", defaults);
    expect(rows[0]).toMatchObject({
      id: "00000000-0000-4000-8000-000000000001",
      sku: "A",
      options: { Warna: "Merah" },
    });
  });

  it("menambah opsi pertama ke produk tanpa opsi mempertahankan varian Default", () => {
    const current = [row({}, { id: "00000000-0000-4000-8000-000000000001", sku: "DEF" })];
    const rows = buildVariantRows(
      [{ name: "Ukuran", values: ["M", "L"] }],
      current,
      "KB",
      defaults,
    );
    expect(rows[0]).toMatchObject({
      id: "00000000-0000-4000-8000-000000000001",
      sku: "DEF",
      options: { Ukuran: "M" },
    });
    expect(rows[1]).toMatchObject({ sku: "KB-L", options: { Ukuran: "L" } });
    expect(rows[1]!.id).toBeUndefined();
  });

  it("mengabaikan opsi yang belum lengkap", () => {
    const rows = buildVariantRows(
      [warna, { name: "", values: ["X"] }, { name: "Ukuran", values: [] }],
      [],
      "KB",
      defaults,
    );
    expect(rows).toHaveLength(2);
  });
});

describe("skuBaseFromSlug", () => {
  it("huruf pertama tiap kata", () => {
    expect(skuBaseFromSlug("polygon-xtrada-5")).toBe("KB-PX5");
  });
  it("slug kosong", () => {
    expect(skuBaseFromSlug("")).toBe("KB");
  });
});
