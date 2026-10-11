import { describe, expect, it } from "vitest";

import { compareOptionRank, variantLabelFromRows, type VariantOptionRow } from "./variant-options";

const row = (value: string, sortOrder: number, optionOrder: number): VariantOptionRow => ({
  value: { value, sort_order: sortOrder, option: { sort_order: optionOrder } },
});

describe("variantLabelFromRows", () => {
  it("mengurutkan nilai sesuai urutan opsi", () => {
    expect(variantLabelFromRows([row("M", 0, 1), row("Merah", 1, 0)])).toBe("Merah / M");
  });

  it("memakai fallback untuk produk tanpa opsi", () => {
    expect(variantLabelFromRows([], "Default")).toBe("Default");
    expect(variantLabelFromRows([{ value: null }])).toBe("");
  });
});

describe("compareOptionRank", () => {
  it("membandingkan per opsi, opsi pertama dulu", () => {
    const merahL = [row("Merah", 0, 0), row("L", 1, 1)];
    const biruM = [row("Biru", 1, 0), row("M", 0, 1)];
    expect(compareOptionRank(merahL, biruM)).toBeLessThan(0);
    expect(compareOptionRank(biruM, merahL)).toBeGreaterThan(0);
  });
});
