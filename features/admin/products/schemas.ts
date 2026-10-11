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
  weightGram: int(1, 1_000_000, "Berat"),
  lengthCm: int(1, 1000, "Panjang"),
  widthCm: int(1, 1000, "Lebar"),
  heightCm: int(1, 1000, "Tinggi"),
  isActive: z.boolean(),
  /** Hanya untuk varian baru; stok varian lama diubah lewat penyesuaian stok. */
  initialStock: int(0, 100_000, "Stok awal").optional(),
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
    options: z.array(optionFormSchema).max(MAX_OPTIONS, { error: `Maksimal ${MAX_OPTIONS} opsi` }),
    variants: z
      .array(variantFormSchema)
      .min(1, { error: "Produk wajib punya minimal satu varian" })
      .max(MAX_VARIANTS, { error: `Maksimal ${MAX_VARIANTS} varian` }),
  })
  .superRefine((value, ctx) => {
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
    options: values.options.map((o) => ({ name: o.name, values: o.values })),
    variants: values.variants.map((v) => ({
      ...(v.id ? { id: v.id } : { initial_stock: v.initialStock ?? 0 }),
      sku: v.sku,
      price: v.price,
      weight_gram: v.weightGram,
      length_cm: v.lengthCm,
      width_cm: v.widthCm,
      height_cm: v.heightCm,
      is_active: v.isActive,
      options: v.options,
    })),
  };
}
