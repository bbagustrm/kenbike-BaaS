import { describe, expect, it } from "vitest";

import { labelFontSize, labelSizeQuery, parseLabelSize } from "./label-size";

const q = (s: string) => new URLSearchParams(s);

describe("parseLabelSize", () => {
  it("memakai preset", () => {
    expect(parseLabelSize(q("size=100x100"))).toEqual({ width: 100, height: 100 });
    expect(parseLabelSize(q("size=58"))).toEqual({ width: 58, height: null });
  });

  it("ukuran kustom dijepit ke batas", () => {
    expect(parseLabelSize(q("w=75&h=120"))).toEqual({ width: 75, height: 120 });
    expect(parseLabelSize(q("w=10&h=999"))).toEqual({ width: 50, height: 300 });
    expect(parseLabelSize(q("w=80"))).toEqual({ width: 80, height: null });
  });

  it("nilai tidak valid → default 100×150", () => {
    expect(parseLabelSize(q(""))).toEqual({ width: 100, height: 150 });
    expect(parseLabelSize(q("size=__proto__"))).toEqual({ width: 100, height: 150 });
    expect(parseLabelSize(q("w=abc"))).toEqual({ width: 100, height: 150 });
  });
});

describe("labelSizeQuery", () => {
  it("bolak-balik dengan parseLabelSize", () => {
    expect(parseLabelSize(q(labelSizeQuery("80")))).toEqual({ width: 80, height: null });
    expect(parseLabelSize(q(labelSizeQuery({ width: 90, height: 140 })))).toEqual({
      width: 90,
      height: 140,
    });
  });
});

describe("labelFontSize", () => {
  it("mengecil untuk kertas sempit / label pendek", () => {
    expect(labelFontSize({ width: 100, height: 150 })).toBe(9);
    expect(labelFontSize({ width: 100, height: 100 })).toBe(8);
    expect(labelFontSize({ width: 80, height: null })).toBe(8);
    expect(labelFontSize({ width: 58, height: null })).toBe(7);
    expect(labelFontSize({ width: 50, height: 60 })).toBe(6);
  });
});
