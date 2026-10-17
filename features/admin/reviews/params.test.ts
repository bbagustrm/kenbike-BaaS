import { describe, expect, it } from "vitest";

import { adminReviewsHref, parseAdminReviewParams } from "./params";

describe("parseAdminReviewParams", () => {
  it("menerima filter valid & membuang yang tidak", () => {
    expect(
      parseAdminReviewParams({
        q: " budi,(x) ",
        rating: "5",
        status: "unreplied",
        source: "imported",
        product: "6f1c2a3b-1111-4222-8333-944455556666",
        page: "2",
      }),
    ).toEqual({
      q: "budi x",
      rating: 5,
      status: "unreplied",
      source: "imported",
      productId: "6f1c2a3b-1111-4222-8333-944455556666",
      page: 2,
    });
    expect(parseAdminReviewParams({ rating: "9", status: "x", product: "bukan-uuid" })).toEqual({
      q: undefined,
      rating: undefined,
      status: undefined,
      source: undefined,
      productId: undefined,
      page: 1,
    });
  });

  it("href bolak-balik", () => {
    const p = parseAdminReviewParams({ rating: "2", status: "replied", page: "3" });
    expect(adminReviewsHref(p)).toBe("/admin/reviews?rating=2&status=replied&page=3");
    expect(adminReviewsHref(parseAdminReviewParams({}))).toBe("/admin/reviews");
  });
});
