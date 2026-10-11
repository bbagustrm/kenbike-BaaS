import { describe, expect, it } from "vitest";

import type { ProductOption, ProductVariant } from "./types";
import { findVariant, initialSelection, valueState } from "./variant-selection";

const options: ProductOption[] = [
  {
    id: "warna",
    name: "Warna",
    values: [
      { id: "merah", value: "Merah" },
      { id: "biru", value: "Biru" },
    ],
  },
  {
    id: "ukuran",
    name: "Ukuran",
    values: [
      { id: "m", value: "M" },
      { id: "l", value: "L" },
    ],
  },
];

const variant = (id: string, values: string[], price = 100): ProductVariant => ({
  id,
  sku: id,
  price,
  weightGram: 100,
  dimensionsCm: [1, 1, 1],
  optionValueIds: values,
});

// Biru-L tidak dijual.
const variants = [
  variant("merah-m", ["merah", "m"]),
  variant("merah-l", ["merah", "l"]),
  variant("biru-m", ["biru", "m"]),
];

describe("initialSelection", () => {
  it("memakai nilai dari varian pertama", () => {
    expect(initialSelection(options, variants)).toEqual({ warna: "merah", ukuran: "m" });
  });
  it("kosong bila tidak ada varian", () => {
    expect(initialSelection(options, [])).toEqual({});
  });
});

describe("findVariant", () => {
  it("menemukan varian dari pilihan lengkap", () => {
    expect(findVariant(options, variants, { warna: "biru", ukuran: "m" })?.id).toBe("biru-m");
  });
  it("null untuk kombinasi yang tidak dijual", () => {
    expect(findVariant(options, variants, { warna: "biru", ukuran: "l" })).toBeNull();
  });
  it("null bila pilihan belum lengkap", () => {
    expect(findVariant(options, variants, { warna: "merah" })).toBeNull();
  });
  it("produk tanpa opsi memakai satu-satunya varian", () => {
    expect(findVariant([], [variant("default", [])], {})?.id).toBe("default");
  });
});

describe("valueState", () => {
  const stock = { "merah-m": 2, "merah-l": 0, "biru-m": 1 };

  it("unavailable bila kombinasi tidak dijual", () => {
    expect(
      valueState(options, variants, { warna: "biru", ukuran: "m" }, "ukuran", "l", stock),
    ).toBe("unavailable");
  });
  it("sold-out bila kombinasi ada tetapi stok habis", () => {
    expect(
      valueState(options, variants, { warna: "merah", ukuran: "m" }, "ukuran", "l", stock),
    ).toBe("sold-out");
  });
  it("available bila ada stok", () => {
    expect(
      valueState(options, variants, { warna: "merah", ukuran: "l" }, "warna", "biru", stock),
    ).toBe("unavailable");
    expect(
      valueState(options, variants, { warna: "merah", ukuran: "m" }, "warna", "biru", stock),
    ).toBe("available");
  });
  it("tanpa data stok hanya membedakan kombinasi yang dijual", () => {
    expect(
      valueState(options, variants, { warna: "merah", ukuran: "m" }, "ukuran", "l", null),
    ).toBe("available");
  });
});
