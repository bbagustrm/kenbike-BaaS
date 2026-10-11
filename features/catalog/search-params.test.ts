import { describe, expect, it } from "vitest";

import { parseProductListParams, productListHref } from "./search-params";

describe("parseProductListParams", () => {
  it("memberi nilai default untuk URL kosong", () => {
    expect(parseProductListParams({})).toEqual({
      category: undefined,
      q: undefined,
      min: undefined,
      max: undefined,
      sort: "newest",
      page: 1,
    });
  });

  it("membaca semua parameter yang valid", () => {
    expect(
      parseProductListParams({
        category: "mtb",
        q: " polygon ",
        min: "100000",
        max: "5000000",
        sort: "price_asc",
        page: "3",
      }),
    ).toEqual({
      category: "mtb",
      q: "polygon",
      min: 100000,
      max: 5000000,
      sort: "price_asc",
      page: 3,
    });
  });

  it("mengabaikan nilai tidak valid alih-alih error", () => {
    expect(parseProductListParams({ min: "abc", sort: "random", page: "-2", q: "" })).toMatchObject(
      {
        min: undefined,
        sort: "newest",
        page: 1,
        q: undefined,
      },
    );
  });

  it("memakai nilai pertama jika parameter berulang", () => {
    expect(parseProductListParams({ category: ["mtb", "road"] }).category).toBe("mtb");
  });
});

describe("productListHref", () => {
  it("tidak menulis nilai default", () => {
    expect(productListHref({ sort: "newest", page: 1 })).toBe("/products");
  });

  it("menyusun query string", () => {
    expect(productListHref({ category: "mtb", sort: "price_desc", page: 2 })).toBe(
      "/products?category=mtb&sort=price_desc&page=2",
    );
  });
});
