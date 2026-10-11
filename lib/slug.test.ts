import { describe, expect, it } from "vitest";

import { SLUG_PATTERN, slugify } from "./slug";

describe("slugify", () => {
  it.each([
    ["Polygon Xtrada 5", "polygon-xtrada-5"],
    ["  Helm   Kalibre—Air!! ", "helm-kalibre-air"],
    ["Café Ündérwear", "cafe-underwear"],
    ["Ban 27.5x2.25 (Tubeless)", "ban-27-5x2-25-tubeless"],
    ["---", ""],
  ])("%s → %s", (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });

  it("memotong tanpa menyisakan tanda hubung di akhir", () => {
    expect(slugify("abc def ghi", 4)).toBe("abc");
  });

  it("hasilnya lolos pola slug DB", () => {
    expect(slugify('Sepeda Lipat 20" Ecosmo')).toMatch(SLUG_PATTERN);
  });
});
