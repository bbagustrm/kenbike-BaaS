import { describe, expect, it } from "vitest";

import { reviewPhotoUrl, toDistribution } from "./types";

describe("toDistribution", () => {
  it("mengisi bintang yang hilang dengan 0 dan membuang nilai aneh", () => {
    expect(toDistribution({ "5": 3, "4": "2", "1": -1, x: 9 })).toEqual({
      1: 0,
      2: 0,
      3: 0,
      4: 2,
      5: 3,
    });
    expect(toDistribution(null)).toEqual({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
  });
});

describe("reviewPhotoUrl", () => {
  it("URL publik bucket review-photos", () => {
    expect(reviewPhotoUrl("abc/x y.jpg")).toBe(
      "https://example.supabase.co/storage/v1/object/public/review-photos/abc/x%20y.jpg",
    );
  });
});
