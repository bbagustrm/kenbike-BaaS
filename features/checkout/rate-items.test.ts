import { describe, expect, it } from "vitest";

import { toRateItems } from "./rate-items";

describe("toRateItems", () => {
  it("memetakan baris keranjang ke item Biteship", () => {
    expect(
      toRateItems([
        {
          name: "Polygon Strattos S3",
          price: 12_500_000,
          quantity: 2,
          weightGram: 15000,
          lengthCm: 140,
          widthCm: 25,
          heightCm: 75,
        },
      ]),
    ).toEqual([
      {
        name: "Polygon Strattos S3",
        value: 12_500_000,
        quantity: 2,
        weight: 15000,
        length: 140,
        width: 25,
        height: 75,
      },
    ]);
  });

  it("membulatkan, memberi batas bawah 1, dan membuang jumlah 0", () => {
    const [item, ...rest] = toRateItems([
      {
        name: "Pentil",
        price: 999.6,
        quantity: 1,
        weightGram: 0.4,
        lengthCm: 0,
        widthCm: 2.6,
        heightCm: 1,
      },
      {
        name: "Kosong",
        price: 1,
        quantity: 0,
        weightGram: 1,
        lengthCm: 1,
        widthCm: 1,
        heightCm: 1,
      },
    ]);
    expect(item).toMatchObject({ value: 1000, weight: 1, length: 1, width: 3 });
    expect(rest).toHaveLength(0);
  });
});
