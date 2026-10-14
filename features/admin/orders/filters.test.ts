import { describe, expect, it } from "vitest";

import { adminOrdersHref, parseAdminOrderParams, wibDayStart } from "./filters";

describe("parseAdminOrderParams", () => {
  it("menerima filter & tanggal valid, membuang yang tidak", () => {
    expect(
      parseAdminOrderParams({
        status: "attention",
        q: "  KB-2026 ",
        from: "2026-10-01",
        to: "bukan-tanggal",
        page: "3",
      }),
    ).toEqual({ filter: "attention", q: "KB-2026", from: "2026-10-01", to: undefined, page: 3 });
    expect(parseAdminOrderParams({ status: "hapus", page: "-1" })).toEqual({
      filter: undefined,
      q: undefined,
      from: undefined,
      to: undefined,
      page: 1,
    });
  });
});

describe("parseAdminOrderParams (q)", () => {
  it("membuang karakter sintaks filter", () => {
    expect(parseAdminOrderParams({ q: "budi),id.eq.(1" }).q).toBe("budi id.eq. 1");
  });
});

describe("adminOrdersHref", () => {
  it("membangun URL dengan query", () => {
    expect(adminOrdersHref({})).toBe("/admin/orders");
    expect(adminOrdersHref({ filter: "unpaid", q: "budi", page: 2 })).toBe(
      "/admin/orders?status=unpaid&q=budi&page=2",
    );
  });
});

describe("wibDayStart", () => {
  it("tengah malam WIB = 17:00 UTC hari sebelumnya", () => {
    expect(wibDayStart("2026-10-14")).toBe("2026-10-13T17:00:00.000Z");
  });
});
