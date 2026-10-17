import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { sanitizeDoc } from "@/features/rich-text/document";
import { publicEnv } from "@/lib/env/public";
import { escapeLike } from "@/lib/search";
import { createPublicClient } from "@/lib/supabase/public";

import { PAGE_SIZE, type ProductListParams } from "./search-params";
import type { Category, ProductCardData, ProductDetail } from "./types";

/**
 * Query katalog publik. Semua di-cache ("use cache") dengan client anon tanpa
 * cookie, jadi hasilnya sama untuk semua pengunjung dan ikut static shell.
 * Invalidasi: Server Action admin memanggil updateTag("products"/"categories"/
 * `product:${slug}`). Stok TIDAK di-cache — lihat getVariantAvailability.
 */

export async function listCategories(): Promise<Category[]> {
  "use cache";
  cacheTag("categories");
  cacheLife("hours");

  const { data, error } = await createPublicClient()
    .from("categories")
    .select("id, name, slug, parent_id, sort_order")
    .order("sort_order")
    .order("name");
  if (error) throw new Error(`listCategories: ${error.message}`);

  return data.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    parentId: c.parent_id,
    sortOrder: c.sort_order,
  }));
}

/** Kategori beserta seluruh turunannya (mis. "sepeda" → mtb, road, lipat). */
export function categoryWithDescendants(categories: Category[], slug: string): Category[] {
  const root = categories.find((c) => c.slug === slug);
  if (!root) return [];
  const result = [root];
  for (let i = 0; i < result.length; i++) {
    result.push(...categories.filter((c) => c.parentId === result[i]!.id));
  }
  return result;
}

export type ProductListResult = {
  items: ProductCardData[];
  total: number;
  page: number;
  pageCount: number;
};

type ListingFilters = { categoryIds?: string[]; q?: string; min?: number; max?: number };

/** Filter yang sama dipakai untuk query data dan query hitung. */
function applyListingFilters<
  Q extends {
    in(column: "category_id", values: string[]): Q;
    ilike(column: "name", pattern: string): Q;
    gte(column: "price_min", value: number): Q;
    lte(column: "price_min", value: number): Q;
  },
>(query: Q, f: ListingFilters): Q {
  let q = query;
  if (f.categoryIds) q = q.in("category_id", f.categoryIds);
  if (f.q) q = q.ilike("name", `%${escapeLike(f.q)}%`);
  if (f.min !== undefined) q = q.gte("price_min", f.min);
  if (f.max !== undefined) q = q.lte("price_min", f.max);
  return q;
}

export async function listProducts(params: ProductListParams): Promise<ProductListResult> {
  "use cache";
  cacheTag("products");
  cacheLife("hours");

  const categories = await listCategories();
  const supabase = createPublicClient();

  const filters: ListingFilters = { q: params.q, min: params.min, max: params.max };
  if (params.category) {
    filters.categoryIds = categoryWithDescendants(categories, params.category).map((c) => c.id);
    if (filters.categoryIds.length === 0) {
      return { items: [], total: 0, page: params.page, pageCount: 0 };
    }
  }

  let query = applyListingFilters(
    supabase
      .from("product_listings")
      .select(
        "id, slug, name, category_id, price_min, price_max, image_path, is_preorder, preorder_days, rating_avg, rating_count",
        { count: "exact" },
      ),
    filters,
  );
  query =
    params.sort === "price_asc"
      ? query.order("price_min", { ascending: true }).order("name")
      : params.sort === "price_desc"
        ? query.order("price_min", { ascending: false }).order("name")
        : query.order("created_at", { ascending: false }).order("name");

  const from = (params.page - 1) * PAGE_SIZE;
  const { data, error, count } = await query.range(from, from + PAGE_SIZE - 1);

  // Halaman melebihi jumlah data (mis. URL lama): PostgREST membalas 416.
  // Tampilkan hasil kosong dengan total yang benar agar paginasi tetap berguna.
  if (error?.code === "PGRST103") {
    const { count: total, error: countError } = await applyListingFilters(
      supabase.from("product_listings").select("id", { count: "exact", head: true }),
      filters,
    );
    if (countError) throw new Error(`listProducts(count): ${countError.message}`);
    return {
      items: [],
      total: total ?? 0,
      page: params.page,
      pageCount: Math.ceil((total ?? 0) / PAGE_SIZE),
    };
  }
  if (error) throw new Error(`listProducts: ${error.message}`);

  const byId = new Map(categories.map((c) => [c.id, c]));
  const total = count ?? 0;

  return {
    items: (data ?? []).map((row) => ({
      id: row.id!,
      slug: row.slug!,
      name: row.name!,
      categoryName: byId.get(row.category_id!)?.name ?? null,
      priceMin: row.price_min ?? 0,
      priceMax: row.price_max ?? 0,
      imagePath: row.image_path,
      preorderDays: row.is_preorder ? row.preorder_days : null,
      rating: { avg: Number(row.rating_avg ?? 0), count: row.rating_count ?? 0 },
    })),
    total,
    page: params.page,
    pageCount: Math.ceil(total / PAGE_SIZE),
  };
}

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  "use cache";
  cacheTag("products", `product:${slug}`);
  cacheLife("hours");

  const { data, error } = await createPublicClient()
    .from("products")
    .select(
      `id, slug, name, description, description_doc, category_id, is_preorder, preorder_days, rating_avg, rating_count,
       options:product_options (id, name, sort_order,
         values:product_option_values (id, value, sort_order)),
       variants:product_variants (id, sku, price, weight_gram, length_cm, width_cm, height_cm,
         option_values:product_variant_options (option_value_id)),
       images:product_images (id, storage_path, alt_text, sort_order, variant_id)`,
    )
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(`getProductBySlug: ${error.message}`);
  if (!data) return null;

  const categories = await listCategories();
  const breadcrumb: Category[] = [];
  for (let c = categories.find((x) => x.id === data.category_id); c;) {
    breadcrumb.unshift(c);
    const parentId: string | null = c.parentId;
    c = parentId ? categories.find((x) => x.id === parentId) : undefined;
  }

  const bySort = <T extends { sort_order: number }>(a: T, b: T) => a.sort_order - b.sort_order;
  const options = [...data.options].sort(bySort).map((o) => ({
    id: o.id,
    name: o.name,
    values: [...o.values].sort(bySort).map((v) => ({ id: v.id, value: v.value })),
  }));

  // Posisi tiap nilai opsi sesuai urutan admin (mis. S < M < L) untuk tie-break.
  const valueRank = new Map(options.flatMap((o) => o.values.map((v, i) => [v.id, i] as const)));
  const rankKey = (ids: string[]) =>
    options.map(
      (o) => valueRank.get(ids.find((id) => o.values.some((v) => v.id === id)) ?? "") ?? 0,
    );
  const compareRanks = (a: number[], b: number[]) =>
    a.reduce((acc, value, i) => acc || value - (b[i] ?? 0), 0);

  return {
    id: data.id,
    slug: data.slug,
    name: data.name,
    description: data.description,
    descriptionDoc: sanitizeDoc(data.description_doc, publicEnv.NEXT_PUBLIC_SUPABASE_URL),
    preorderDays: data.is_preorder ? data.preorder_days : null,
    rating: { avg: Number(data.rating_avg), count: data.rating_count },
    breadcrumb,
    options,
    // RLS hanya mengembalikan varian aktif untuk anon. Urut: harga, lalu urutan opsi.
    variants: data.variants
      .map((v) => ({
        id: v.id,
        sku: v.sku,
        price: v.price,
        weightGram: v.weight_gram,
        dimensionsCm: [v.length_cm, v.width_cm, v.height_cm] as const,
        optionValueIds: v.option_values.map((ov) => ov.option_value_id),
      }))
      .sort(
        (a, b) =>
          a.price - b.price || compareRanks(rankKey(a.optionValueIds), rankKey(b.optionValueIds)),
      ),
    images: [...data.images].sort(bySort).map((img) => ({
      id: img.id,
      path: img.storage_path,
      alt: img.alt_text,
      variantId: img.variant_id,
    })),
  };
}

/** Slug semua produk aktif (sitemap). */
export async function listProductSlugs(): Promise<{ slug: string; updatedAt: string }[]> {
  "use cache";
  cacheTag("products");
  cacheLife("hours");

  const { data, error } = await createPublicClient()
    .from("products")
    .select("slug, updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(`listProductSlugs: ${error.message}`);
  return data.map((p) => ({ slug: p.slug, updatedAt: p.updated_at }));
}

/**
 * Stok tersedia per varian — sengaja TIDAK di-cache (berubah setiap ada
 * checkout). Panggil dari komponen di dalam <Suspense>.
 */
export async function getVariantAvailability(
  variantIds: string[],
): Promise<Record<string, number>> {
  if (variantIds.length === 0) return {};
  const { data, error } = await createPublicClient().rpc("get_variant_availability", {
    variant_ids: variantIds,
  });
  if (error) throw new Error(`getVariantAvailability: ${error.message}`);
  return Object.fromEntries(data.map((row) => [row.variant_id, row.available]));
}
