import { describe, expect, it } from "vitest";

import {
  hasQuickText,
  isOwnReviewPhotoPath,
  reviewPhotoPath,
  reviewSchema,
  toggleQuickText,
} from "./schemas";

const UID = "6f1c2a3b-1111-4222-8333-944455556666";
const FILE = "0a1b2c3d-aaaa-4bbb-8ccc-ddddeeeeffff";

describe("reviewSchema", () => {
  it("bintang wajib, teks opsional", () => {
    expect(reviewSchema.safeParse({ rating: 0, body: "", photoPaths: [] }).success).toBe(false);
    expect(reviewSchema.parse({ rating: 5, body: "  ", photoPaths: [] }).body).toBe("");
    expect(
      reviewSchema.safeParse({ rating: 5, body: "", photoPaths: Array(6).fill("x") }).success,
    ).toBe(false);
  });
});

describe("foto ulasan", () => {
  it("path harus di folder pengguna", () => {
    expect(isOwnReviewPhotoPath(UID, reviewPhotoPath(UID, FILE, "webp"))).toBe(true);
    expect(isOwnReviewPhotoPath(UID, `lain/${FILE}.jpg`)).toBe(false);
    expect(isOwnReviewPhotoPath(UID, `${UID}/${FILE}.gif`)).toBe(false);
  });
});

describe("toggleQuickText", () => {
  it("menambah lalu menghapus pilihan cepat (dipisah spasi)", () => {
    const a = toggleQuickText("", "Mantul! 🔥");
    expect(a).toBe("Mantul! 🔥");
    const b = toggleQuickText(a, "Pengiriman ngebut 🚀");
    expect(b).toBe("Mantul! 🔥 Pengiriman ngebut 🚀");
    expect(hasQuickText(b, "Pengiriman ngebut 🚀")).toBe(true);
    expect(toggleQuickText(b, "Mantul! 🔥")).toBe("Pengiriman ngebut 🚀");
    expect(toggleQuickText("Bagus sekali", "Mantul! 🔥")).toBe("Bagus sekali Mantul! 🔥");
  });
});
