import { describe, expect, it } from "vitest";

import { safeNextPath } from "./redirect";

describe("safeNextPath", () => {
  it.each(["/", "/account", "/checkout?step=2", "/products/sepeda-x#ulasan"])(
    "menerima path internal %s",
    (path) => {
      expect(safeNextPath(path)).toBe(path);
    },
  );

  it.each([
    "https://evil.com",
    "//evil.com",
    "/\\evil.com",
    "javascript:alert(1)",
    "account",
    "/\taccount",
    "",
    undefined,
    null,
    42,
  ])("menolak %s", (value) => {
    expect(safeNextPath(value)).toBe("/");
  });

  it("memakai fallback yang diberikan", () => {
    expect(safeNextPath("https://evil.com", "/account")).toBe("/account");
  });
});
