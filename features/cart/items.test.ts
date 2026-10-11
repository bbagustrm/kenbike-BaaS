import { describe, expect, it } from "vitest";

import {
  addItem,
  countItems,
  MAX_CART_LINES,
  MAX_PER_ITEM,
  removeItem,
  setItemQuantity,
  subtotal,
} from "./items";
import type { CartLine } from "./types";

describe("addItem", () => {
  it("menambah varian baru di akhir", () => {
    expect(addItem([{ variantId: "a", quantity: 1 }], "b", 2)).toEqual([
      { variantId: "a", quantity: 1 },
      { variantId: "b", quantity: 2 },
    ]);
  });

  it("menjumlahkan varian yang sudah ada, dibatasi MAX_PER_ITEM", () => {
    expect(addItem([{ variantId: "a", quantity: 3 }], "a", 2)).toEqual([
      { variantId: "a", quantity: 5 },
    ]);
    expect(addItem([{ variantId: "a", quantity: 9 }], "a", 5)[0]?.quantity).toBe(MAX_PER_ITEM);
  });

  it("mengabaikan jumlah tidak valid dan batas jenis varian", () => {
    expect(addItem([], "a", 0)).toEqual([]);
    expect(addItem([], "a", Number.NaN)).toEqual([]);
    const full = Array.from({ length: MAX_CART_LINES }, (_, i) => ({
      variantId: `v${i}`,
      quantity: 1,
    }));
    expect(addItem(full, "baru", 1)).toBe(full);
  });
});

describe("setItemQuantity / removeItem", () => {
  const items = [
    { variantId: "a", quantity: 2 },
    { variantId: "b", quantity: 1 },
  ];

  it("mengubah jumlah dalam batas", () => {
    expect(setItemQuantity(items, "a", 4)[0]?.quantity).toBe(4);
    expect(setItemQuantity(items, "a", 99)[0]?.quantity).toBe(MAX_PER_ITEM);
  });

  it("jumlah 0 menghapus varian", () => {
    expect(setItemQuantity(items, "a", 0)).toEqual([{ variantId: "b", quantity: 1 }]);
    expect(removeItem(items, "b")).toEqual([{ variantId: "a", quantity: 2 }]);
  });

  it("menghitung total unit", () => {
    expect(countItems(items)).toBe(3);
  });
});

describe("subtotal", () => {
  const line = (quantity: number, available: number, price = 1000): CartLine => ({
    variantId: `v${quantity}${available}`,
    quantity,
    available,
    price,
    productName: "x",
    slug: "x",
    variantLabel: "",
    sku: "x",
    imagePath: null,
    preorderDays: null,
  });

  it("melewati baris yang stoknya tidak cukup", () => {
    expect(subtotal([line(2, 5), line(3, 1), line(1, 0)])).toBe(2000);
  });
});
