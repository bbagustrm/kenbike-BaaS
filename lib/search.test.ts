import { describe, expect, it } from "vitest";

import { escapeLike, firstParam } from "./search";

describe("escapeLike", () => {
  it("meng-escape wildcard LIKE dan backslash", () => {
    expect(escapeLike("100%_a\\b")).toBe("100\\%\\_a\\\\b");
    expect(escapeLike("sepeda")).toBe("sepeda");
  });
});

describe("firstParam", () => {
  it("mengambil nilai pertama", () => {
    expect(firstParam(["a", "b"])).toBe("a");
    expect(firstParam("a")).toBe("a");
    expect(firstParam(undefined)).toBeUndefined();
  });
});
