import { describe, expect, it } from "vitest";

import { pageItems } from "./pagination";

describe("pageItems", () => {
  it("kosong bila tidak ada halaman", () => expect(pageItems(1, 0)).toEqual([]));
  it("satu halaman", () => expect(pageItems(1, 1)).toEqual([1]));
  it("sedikit halaman tanpa ellipsis", () => expect(pageItems(2, 4)).toEqual([1, 2, 3, 4]));
  it("ellipsis di kedua sisi", () =>
    expect(pageItems(10, 20)).toEqual([1, "ellipsis", 9, 10, 11, "ellipsis", 20]));
  it("celah satu halaman diisi angka, bukan ellipsis", () =>
    expect(pageItems(4, 10)).toEqual([1, 2, 3, 4, 5, "ellipsis", 10]));
  it("halaman terakhir", () => expect(pageItems(20, 20)).toEqual([1, "ellipsis", 19, 20]));
});
