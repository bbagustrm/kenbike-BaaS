import { describe, expect, it } from "vitest";

import { type ProductFormValues, productFormSchema, toRpcPayload } from "./schemas";

const valid: ProductFormValues = {
  name: "Jersey Uji",
  slug: "jersey-uji",
  categoryId: "11111111-2222-4333-8444-555555555555",
  description: "",
  isActive: true,
  options: [{ name: "Ukuran", values: ["M", "L"] }],
  variants: [
    {
      id: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
      options: { Ukuran: "M" },
      sku: "KB-JU-M",
      price: 300000,
      weightGram: 200,
      lengthCm: 30,
      widthCm: 20,
      heightCm: 3,
      isActive: true,
    },
    {
      options: { Ukuran: "L" },
      sku: "KB-JU-L",
      price: 300000,
      weightGram: 200,
      lengthCm: 30,
      widthCm: 20,
      heightCm: 3,
      isActive: true,
      initialStock: 4,
    },
  ],
};

describe("productFormSchema", () => {
  it("menerima data valid", () => {
    expect(productFormSchema.safeParse(valid).success).toBe(true);
  });

  it("menolak SKU ganda (tanpa memedulikan huruf besar)", () => {
    const result = productFormSchema.safeParse({
      ...valid,
      variants: [valid.variants[0], { ...valid.variants[1], sku: "kb-ju-m" }],
    });
    expect(result.success).toBe(false);
  });

  it("menolak bila semua varian nonaktif", () => {
    const result = productFormSchema.safeParse({
      ...valid,
      variants: valid.variants.map((v) => ({ ...v, isActive: false })),
    });
    expect(result.success).toBe(false);
  });

  it("menolak harga kosong (NaN dari input angka)", () => {
    const result = productFormSchema.safeParse({
      ...valid,
      variants: [{ ...valid.variants[0], price: Number.NaN }],
    });
    expect(result.success).toBe(false);
  });
});

describe("toRpcPayload", () => {
  it("varian lama membawa id, varian baru membawa initial_stock", () => {
    const payload = toRpcPayload(valid);
    expect(payload.variants[0]).toMatchObject({ id: valid.variants[0]!.id, sku: "KB-JU-M" });
    expect(payload.variants[0]).not.toHaveProperty("initial_stock");
    expect(payload.variants[1]).toMatchObject({ initial_stock: 4, options: { Ukuran: "L" } });
    expect(payload.variants[1]).not.toHaveProperty("id");
    expect(payload.description).toBeNull();
  });
});
