import { describe, expect, it } from "vitest";

import { inboxQuery, parseInboxParams } from "./inbox-params";

describe("parseInboxParams", () => {
  it("default butuh balasan & membuang nilai asing", () => {
    expect(parseInboxParams({})).toEqual({
      filter: "needs_reply",
      kind: undefined,
      q: undefined,
      before: undefined,
    });
    expect(parseInboxParams({ status: "hapus", kind: "x" }).filter).toBe("needs_reply");
  });

  it("membersihkan pencarian & cursor", () => {
    const p = parseInboxParams({
      status: "all",
      kind: "order",
      q: "  budi%,(x) ",
      before: "2026-10-17T10:00:00.000Z_6f1c2a3b-1111-4222-8333-944455556666",
    });
    expect(p).toEqual({
      filter: "all",
      kind: "order",
      q: "budi x",
      before: { at: "2026-10-17T10:00:00.000Z", id: "6f1c2a3b-1111-4222-8333-944455556666" },
    });
    expect(parseInboxParams({ before: "bukan_cursor" }).before).toBeUndefined();
  });

  it("inboxQuery bolak-balik", () => {
    const p = parseInboxParams({ status: "closed", q: "KB-1" });
    expect(parseInboxParams(Object.fromEntries(new URLSearchParams(inboxQuery(p))))).toEqual(p);
    expect(inboxQuery(parseInboxParams({}))).toBe("");
  });
});
