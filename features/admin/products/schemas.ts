import { z } from "zod";

import { SLUG_PATTERN } from "@/lib/slug";

export const MAX_OPTIONS = 3;
export const MAX_VALUES_PER_OPTION = 30;
export const MAX_VARIANTS = 100;

const int = (min: number, max: number, label: string) =>
  z
    .number({ error: `${label} wajib diisi` })
    .int({ error: `${label} harus bilangan bulat` })
    .min(min, { error: `${label} minimal ${min}` })
    .max(max, { error: `${label} terlalu besar` });

export const variantFormSchema = z.object({
  /** Ada untuk varian yang sudah tersimpan. */
  id: z.uuid().optional(),
  /** Nilai opsi per nama opsi, mis. { Warna: "Merah", Ukuran: "M" }. */
  options: z.record(z.string(), z.string()),
  sku: z
    .string()
    .trim()
    .min(1, { error: "SKU wajib diisi" })
    .max(50, { error: "SKU maksimal 50 karakter" })
    .regex(/^[A-Za-z0-9._-]+$/, { error: "SKU hanya huruf, angka, titik, - dan _" }),
  price: int(0, 10_000_000_000, "Harga"),
  /** Stok fisik yang diinginkan. Varian baru: stok awal. */
  stock: int(0, 100_000, "Stok"),
  /** Stok fisik saat form dimuat (varian lama) — selisihnya dicatat sebagai penyesuaian. */
  stockOriginal: z.number().int().optional(),
  isActive: z.boolean(),
});

export const optionFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: "Nama opsi wajib diisi" })
    .max(50, { error: "Nama opsi maksimal 50 karakter" }),
  values: z
    .array(z.string().trim().min(1).max(50))
    .min(1, { error: "Tambahkan minimal satu nilai" })
    .max(MAX_VALUES_PER_OPTION, { error: `Maksimal ${MAX_VALUES_PER_OPTION} nilai` })
    .refine((values) => new Set(values.map((v) => v.toLowerCase())).size === values.length, {
      error: "Nilai opsi tidak boleh ganda",
    }),
});

export const productFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, { error: "Nama produk wajib diisi" })
      .max(200, { error: "Maksimal 200 karakter" }),
    slug: z
      .string()
      .trim()
      .min(1, { error: "Slug wajib diisi" })
      .max(150, { error: "Maksimal 150 karakter" })
      .regex(SLUG_PATTERN, { error: "Hanya huruf kecil, angka, dan tanda hubung" }),
    categoryId: z.uuid({ error: "Pilih kategori" }),
    description: z.string().trim().max(5000, { error: "Maksimal 5000 karakter" }),
    isActive: z.boolean(),
    isPreorder: z.boolean(),
    /** Estimasi siap kirim (hari); wajib bila pre-order. */
    preorderDays: int(1, 365, "Estimasi hari").nullable(),
    /** Ukuran paket pengiriman — sama untuk semua varian. */
    weightGram: int(1, 1_000_000, "Berat"),
    lengthCm: int(1, 1000, "Panjang"),
    widthCm: int(1, 1000, "Lebar"),
    heightCm: int(1, 1000, "Tinggi"),
    options: z.array(optionFormSchema).max(MAX_OPTIONS, { error: `Maksimal ${MAX_OPTIONS} opsi` }),
    variants: z
      .array(variantFormSchema)
      .min(1, { error: "Produk wajib punya minimal satu varian" })
      .max(MAX_VARIANTS, { error: `Maksimal ${MAX_VARIANTS} varian` }),
  })
  .superRefine((value, ctx) => {
    if (value.isPreorder && value.preorderDays === null) {
      ctx.addIssue({
        code: "custom",
        path: ["preorderDays"],
        message: "Isi estimasi hari pengiriman untuk pre-order",
      });
    }
    const names = value.options.map((o) => o.name.toLowerCase());
    names.forEach((name, i) => {
      if (names.indexOf(name) !== i) {
        ctx.addIssue({ code: "custom", path: ["options", i, "name"], message: "Nama opsi ganda" });
      }
    });
    const skus = value.variants.map((v) => v.sku.toLowerCase());
    skus.forEach((sku, i) => {
      if (skus.indexOf(sku) !== i) {
        ctx.addIssue({ code: "custom", path: ["variants", i, "sku"], message: "SKU ganda" });
      }
    });
    if (value.variants.every((v) => !v.isActive)) {
      ctx.addIssue({
        code: "custom",
        path: ["variants"],
        message: "Minimal satu varian harus aktif",
      });
    }
  });

export type ProductFormValues = z.infer<typeof productFormSchema>;
export type VariantFormValues = z.infer<typeof variantFormSchema>;
export type OptionFormValues = z.infer<typeof optionFormSchema>;

/** Bentuk payload RPC admin_create_product / admin_update_product. */
export function toRpcPayload(values: ProductFormValues) {
  return {
    category_id: values.categoryId,
    name: values.name,
    slug: values.slug,
    description: values.description || null,
    is_active: values.isActive,
    is_preorder: values.isPreorder,
    preorder_days: values.isPreorder ? values.preorderDays : null,
    options: values.options.map((o) => ({ name: o.name, values: o.values })),
    variants: values.variants.map((v) => ({
      ...(v.id ? { id: v.id } : { initial_stock: v.stock }),
      sku: v.sku,
      price: v.price,
      // Ukuran paket diterapkan sama ke semua varian.
      weight_gram: values.weightGram,
      length_cm: values.lengthCm,
      width_cm: values.widthCm,
      height_cm: values.heightCm,
      is_active: v.isActive,
      options: v.options,
    })),
  };
}

/** Perubahan stok varian lama dari form → penyesuaian stok (delta, bukan nilai absolut). */
export function stockAdjustments(
  values: ProductFormValues,
): { variantId: string; delta: number }[] {
  return values.variants.flatMap((v) =>
    v.id && v.stockOriginal !== undefined && v.stock !== v.stockOriginal
      ? [{ variantId: v.id, delta: v.stock - v.stockOriginal }]
      : [],
  );
}
