import "server-only";

import { pickPrimaryImage } from "@/lib/product-images";
import { escapeLike } from "@/lib/search";
import { createClient } from "@/lib/supabase/server";
import { compareOptionRank, variantLabelFromRows } from "@/lib/variant-options";

import { LOW_STOCK_THRESHOLD } from "./constants";
import { labelOf, sortOptions, toFormVariants } from "./form-mapping";
import type { ProductFormValues } from "./schemas";

export const ADMIN_PAGE_SIZE = 20;

export type AdminProductListParams = {
  q?: string;
  category?: string;
  status?: "active" | "inactive";
  page: number;
};

export type AdminProductRowVariant = {
  variantId: string;
  sku: string;
  label: string;
  price: number;
  isActive: boolean;
  quantity: number;
  reserved: number;
  available: number;
};

export type AdminProductRow = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  categoryName: string | null;
  imagePath: string | null;
  variantCount: number;
  priceMin: number | null;
  priceMax: number | null;
  stockAvailable: number;
  lowStock: boolean;
  /** Semua varian (aktif dulu) untuk panel stok di daftar produk. */
  variants: AdminProductRowVariant[];
};

/** Daftar produk admin (termasuk nonaktif) beserta ringkasan stok. Tanpa cache. */
export async function listAdminProducts(params: AdminProductListParams) {
  const supabase = await createClient();

  let query = supabase.from("products").select(
    `id, name, slug, is_active, category_id,
       category:categories (name),
       variants:product_variants (id, sku, price, is_active, created_at,
         option_values:product_variant_options (
           value:product_option_values (value, sort_order, option:product_options (sort_order)))),
       images:product_images (storage_path, sort_order, variant_id)`,
    { count: "exact" },
  );

  if (params.q) query = query.ilike("name", `%${escapeLike(params.q)}%`);
  if (params.category) query = query.eq("category_id", params.category);
  if (params.status) query = query.eq("is_active", params.status === "active");

  const from = (params.page - 1) * ADMIN_PAGE_SIZE;
  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .order("name")
    .range(from, from + ADMIN_PAGE_SIZE - 1);

  if (error?.code === "PGRST103") return { rows: [], total: count ?? 0, pageCount: 0 };
  if (error) throw new Error(`listAdminProducts: ${error.message}`);

  const variantIds = data.flatMap((p) => p.variants.map((v) => v.id));
  const stock = new Map<string, { quantity: number; reserved: number; available: number }>();
  if (variantIds.length > 0) {
    const { data: stockRows, error: stockError } = await supabase.rpc("admin_get_stock", {
      variant_ids: variantIds,
    });
    if (stockError) throw new Error(`admin_get_stock: ${stockError.message}`);
    for (const s of stockRows) stock.set(s.variant_id, s);
  }

  const rows: AdminProductRow[] = data.map((p) => {
    const active = p.variants.filter((v) => v.is_active);
    const prices = active.map((v) => v.price);
    const perVariant = active.map((v) => stock.get(v.id)?.available ?? 0);
    // Urut: aktif dulu, lalu sesuai urutan nilai opsi (Warna lalu Ukuran, dst.).
    const variants = [...p.variants]
      .sort(
        (a, b) =>
          Number(b.is_active) - Number(a.is_active) ||
          compareOptionRank(a.option_values, b.option_values) ||
          a.created_at.localeCompare(b.created_at),
      )
      .map((v) => {
        const s = stock.get(v.id);
        return {
          variantId: v.id,
          sku: v.sku,
          label: variantLabelFromRows(v.option_values, "Default"),
          price: v.price,
          isActive: v.is_active,
          quantity: s?.quantity ?? 0,
          reserved: s?.reserved ?? 0,
          available: s?.available ?? 0,
        };
      });
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      isActive: p.is_active,
      categoryName: p.category?.name ?? null,
      imagePath: pickPrimaryImage(p.images)?.storage_path ?? null,
      variantCount: active.length,
      priceMin: prices.length ? Math.min(...prices) : null,
      priceMax: prices.length ? Math.max(...prices) : null,
      stockAvailable: perVariant.reduce((a, b) => a + b, 0),
      lowStock: perVariant.some((n) => n <= LOW_STOCK_THRESHOLD),
      variants,
    };
  });

  const total = count ?? 0;
  return { rows, total, pageCount: Math.ceil(total / ADMIN_PAGE_SIZE) };
}

export type AdminProductImage = {
  id: string;
  path: string;
  alt: string | null;
  sortOrder: number;
  variantId: string | null;
};

export type AdminVariantStock = {
  variantId: string;
  sku: string;
  label: string;
  isActive: boolean;
  quantity: number;
  reserved: number;
  available: number;
};

export type AdminProductDetail = {
  id: string;
  slug: string;
  form: ProductFormValues;
  images: AdminProductImage[];
  stock: AdminVariantStock[];
};

/**
 * Produk lengkap untuk form admin. Varian nonaktif ikut dimuat; varian yang
 * mapping opsinya tidak lengkap (opsi sudah dihapus) tidak dimasukkan ke form.
 */
export async function getAdminProduct(id: string): Promise<AdminProductDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      `id, name, slug, description, category_id, is_active, is_preorder, preorder_days,
       options:product_options (id, name, sort_order,
         values:product_option_values (id, value, sort_order)),
       variants:product_variants (id, sku, price, weight_gram, length_cm, width_cm, height_cm, is_active, created_at,
         option_values:product_variant_options (option_value_id)),
       images:product_images (id, storage_path, alt_text, sort_order, variant_id)`,
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`getAdminProduct: ${error.message}`);
  if (!data) return null;

  const { data: stockRows, error: stockError } = await supabase.rpc("admin_get_stock", {
    variant_ids: data.variants.map((v) => v.id),
  });
  if (stockError) throw new Error(`admin_get_stock: ${stockError.message}`);
  const stockById = new Map(stockRows.map((s) => [s.variant_id, s]));

  const options = sortOptions(data.options);
  const valueIdsOf = (v: (typeof data.variants)[number]) =>
    v.option_values.map((ov) => ov.option_value_id);

  // Ukuran paket disimpan per varian di DB tetapi dikelola satu untuk produk:
  // ambil dari varian aktif pertama.
  const pkg =
    [...data.variants].sort((a, b) => Number(b.is_active) - Number(a.is_active))[0] ?? null;

  return {
    id: data.id,
    slug: data.slug,
    form: {
      name: data.name,
      slug: data.slug,
      categoryId: data.category_id,
      description: data.description ?? "",
      isActive: data.is_active,
      isPreorder: data.is_preorder,
      preorderDays: data.preorder_days,
      weightGram: pkg?.weight_gram ?? 1000,
      lengthCm: pkg?.length_cm ?? 30,
      widthCm: pkg?.width_cm ?? 20,
      heightCm: pkg?.height_cm ?? 10,
      options: options.map((o) => ({ name: o.name, values: o.values.map((v) => v.value) })),
      variants: toFormVariants(options, data.variants, (id) => stockById.get(id)?.quantity ?? 0),
    },
    images: [...data.images]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((img) => ({
        id: img.id,
        path: img.storage_path,
        alt: img.alt_text,
        sortOrder: img.sort_order,
        variantId: img.variant_id,
      })),
    stock: [...data.variants]
      .sort((a, b) => Number(b.is_active) - Number(a.is_active) || a.sku.localeCompare(b.sku))
      .map((v) => {
        const s = stockById.get(v.id);
        return {
          variantId: v.id,
          sku: v.sku,
          label: labelOf(options, valueIdsOf(v)),
          isActive: v.is_active,
          quantity: s?.quantity ?? 0,
          reserved: s?.reserved ?? 0,
          available: s?.available ?? 0,
        };
      }),
  };
}

/** Kategori untuk dropdown form (sub-kategori ditandai induknya). */
export async function listCategoryOptions() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, parent_id")
    .order("sort_order")
    .order("name");
  if (error) throw new Error(`listCategoryOptions: ${error.message}`);
  const roots = data.filter((c) => !c.parent_id);
  return roots.flatMap((root) => [
    { id: root.id, label: root.name },
    ...data
      .filter((c) => c.parent_id === root.id)
      .map((child) => ({ id: child.id, label: `${root.name} › ${child.name}` })),
  ]);
}
