import { z } from "zod";

export const SORT_OPTIONS = {
  newest: "Terbaru",
  price_asc: "Harga terendah",
  price_desc: "Harga tertinggi",
} as const;

export type ProductSort = keyof typeof SORT_OPTIONS;

export const PAGE_SIZE = 12;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined))
    .catch(undefined);

const optionalPrice = z.coerce.number().int().min(0).max(1_000_000_000).optional().catch(undefined);

/**
 * Parameter daftar produk dari URL. Nilai tidak valid diabaikan (bukan error)
 * agar URL hasil ketikan/bookmark lama tetap bisa dibuka.
 */
export const productListParamsSchema = z.object({
  category: optionalText(100),
  q: optionalText(100),
  min: optionalPrice,
  max: optionalPrice,
  sort: z.enum(["newest", "price_asc", "price_desc"]).catch("newest").default("newest"),
  page: z.coerce.number().int().min(1).max(500).catch(1).default(1),
});

export type ProductListParams = {
  category?: string;
  q?: string;
  min?: number;
  max?: number;
  sort: ProductSort;
  page: number;
};

type RawSearchParams = Record<string, string | string[] | undefined>;

export function parseProductListParams(raw: RawSearchParams): ProductListParams {
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  return productListParamsSchema.parse({
    category: first(raw.category),
    q: first(raw.q),
    min: first(raw.min) || undefined,
    max: first(raw.max) || undefined,
    sort: first(raw.sort),
    page: first(raw.page),
  });
}

/** Bangun query string daftar produk; nilai default tidak ditulis. */
export function productListHref(params: Partial<ProductListParams>): string {
  const sp = new URLSearchParams();
  if (params.category) sp.set("category", params.category);
  if (params.q) sp.set("q", params.q);
  if (params.min !== undefined) sp.set("min", String(params.min));
  if (params.max !== undefined) sp.set("max", String(params.max));
  if (params.sort && params.sort !== "newest") sp.set("sort", params.sort);
  if (params.page && params.page > 1) sp.set("page", String(params.page));
  const qs = sp.toString();
  return qs ? `/products?${qs}` : "/products";
}
