import { describe, expect, it } from "vitest";

import { phoneSchema } from "./schemas";

describe("phoneSchema", () => {
  it.each([
    ["0812-3456-7890", "081234567890"],
    ["+62 812 3456 7890", "+6281234567890"],
    ["(021) 555.1234", "0215551234"],
  ])("menormalkan %s", (input, expected) => {
    expect(phoneSchema.parse(input)).toBe(expected);
  });

  it("mengubah string kosong menjadi null", () => {
    expect(phoneSchema.parse("  ")).toBeNull();
  });

  it.each(["123", "08abc", "+62 812 3456 7890 1234 5"])("menolak %s", (input) => {
    expect(phoneSchema.safeParse(input).success).toBe(false);
  });
});
