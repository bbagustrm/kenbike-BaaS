import { describe, expect, it } from "vitest";

import { isProductImagePath, productImagePath, validateImageFile } from "./images";

const productId = "11111111-2222-4333-8444-555555555555";
const fileId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

describe("isProductImagePath", () => {
  it("menerima path yang dibuat productImagePath", () => {
    expect(isProductImagePath(productImagePath(productId, fileId, "webp"), productId)).toBe(true);
  });

  it.each([
    `products/${productId}/../../etc/passwd.jpg`,
    `products/other-product/${fileId}.jpg`,
    `products/${productId}/${fileId}.gif`,
    `${productId}/${fileId}.jpg`,
  ])("menolak %s", (path) => {
    expect(isProductImagePath(path, productId)).toBe(false);
  });
});

describe("validateImageFile", () => {
  const file = (type: string, size: number) => new File([new Uint8Array(size)], "foto", { type });

  it("menerima JPG kecil", () => expect(validateImageFile(file("image/jpeg", 1000))).toBeNull());
  it("menolak GIF", () => expect(validateImageFile(file("image/gif", 1000))).toMatch(/format/));
  it("menolak file > 5 MB", () =>
    expect(validateImageFile(file("image/png", 5 * 1024 * 1024 + 1))).toMatch(/5 MB/));
});
