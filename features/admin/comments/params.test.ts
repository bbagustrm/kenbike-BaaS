import { describe, expect, it } from "vitest";

import { adminCommentsHref, parseAdminCommentParams } from "./params";

describe("parseAdminCommentParams", () => {
  it("default belum dijawab & membuang nilai asing", () => {
    expect(parseAdminCommentParams({})).toEqual({
      filter: "unanswered",
      productId: undefined,
      q: undefined,
      page: 1,
    });
    expect(parseAdminCommentParams({ status: "hapus", product: "x" }).filter).toBe("unanswered");
  });

  it("href bolak-balik", () => {
    const p = parseAdminCommentParams({ status: "hidden", q: " cod% ", page: "2" });
    expect(p.q).toBe("cod");
    expect(adminCommentsHref(p)).toBe("/admin/comments?status=hidden&q=cod&page=2");
    expect(adminCommentsHref(parseAdminCommentParams({}))).toBe("/admin/comments");
  });
});
