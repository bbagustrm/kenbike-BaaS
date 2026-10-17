import { describe, expect, it } from "vitest";

import { commentSchema, parseReplies } from "./types";

describe("parseReplies", () => {
  it("memetakan balasan & membuang item rusak", () => {
    expect(
      parseReplies([
        { id: "a", author_name: "Admin", author_is_admin: true, body: "Ready", created_at: "t" },
        { id: "b" },
        null,
      ]),
    ).toEqual([
      { id: "a", authorName: "Admin", authorIsAdmin: true, body: "Ready", createdAt: "t" },
    ]);
    expect(parseReplies("x")).toEqual([]);
  });
});

describe("commentSchema", () => {
  it("wajib diisi & dipangkas", () => {
    expect(commentSchema.safeParse("   ").success).toBe(false);
    expect(commentSchema.parse("  Ready? ")).toBe("Ready?");
  });
});
