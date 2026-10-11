"use server";

import { z } from "zod";

import { dbErrorMessage } from "@/lib/db-errors";
import { createClient } from "@/lib/supabase/server";

import { MAX_CART_LINES, MAX_PER_ITEM } from "./items";
import type { CartItem, CartLine, CartResult } from "./types";

type Supabase = Awaited<ReturnType<typeof createClient>>;

const itemsSchema = z
  .array(z.object({ variantId: z.uuid(), quantity: z.number().int().min(1).max(MAX_PER_ITEM) }))
  .max(MAX_CART_LINES);

const NOT_LOGGED_IN: CartResult = {
  status: "error",
  message: "Sesi berakhir. Silakan masuk lagi.",
};

/**
 * Lengkapi item dengan data produk & stok terbaru. Varian yang tidak lagi
 * terlihat (nonaktif / dihapus) tidak dikembalikan. Urutan mengikuti `items`.
 */
async function resolveLines(supabase: Supabase, items: CartItem[]): Promise<CartLine[]> {
  if (items.length === 0) return [];
  const ids = items.map((i) => i.variantId);

  const [variants, availability] = await Promise.all([
    supabase
      .from("product_variants")
      .select(
        `id, sku, price,
         product:products (name, slug, is_preorder, preorder_days,
           images:product_images (storage_path, sort_order, variant_id)),
         option_values:product_variant_options (
           value:product_option_values (value, option:product_options (sort_order)))`,
      )
      .in("id", ids),
    supabase.rpc("get_variant_availability", { variant_ids: ids }),
  ]);
  if (variants.error) throw new Error(`cart variants: ${variants.error.message}`);
  if (availability.error) throw new Error(`cart availability: ${availability.error.message}`);

  const stock = new Map(availability.data.map((a) => [a.variant_id, a.available]));
  const byId = new Map(variants.data.map((v) => [v.id, v]));

  return items.flatMap((item) => {
    const v = byId.get(item.variantId);
    if (!v?.product) return [];
    const images = [...v.product.images].sort((a, b) => a.sort_order - b.sort_order);
    const image =
      images.find((img) => img.variant_id === v.id) ??
      images.find((img) => !img.variant_id) ??
      images[0];
    return [
      {
        ...item,
        productName: v.product.name,
        slug: v.product.slug,
        variantLabel: v.option_values
          .flatMap((ov) => (ov.value ? [ov.value] : []))
          .sort((a, b) => (a.option?.sort_order ?? 0) - (b.option?.sort_order ?? 0))
          .map((val) => val.value)
          .join(" / "),
        sku: v.sku,
        price: v.price,
        imagePath: image?.storage_path ?? null,
        available: stock.get(v.id) ?? 0,
        preorderDays: v.product.is_preorder ? v.product.preorder_days : null,
      },
    ];
  });
}

async function readUserItems(supabase: Supabase): Promise<CartItem[]> {
  const { data, error } = await supabase
    .from("cart_items")
    .select("variant_id, quantity")
    .order("created_at");
  if (error) throw new Error(`cart_items: ${error.message}`);
  return data.map((r) => ({ variantId: r.variant_id, quantity: r.quantity }));
}

async function session() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return { supabase, userId: data?.claims.sub ?? null };
}

async function userLines(supabase: Supabase): Promise<CartResult> {
  return { status: "success", lines: await resolveLines(supabase, await readUserItems(supabase)) };
}

// ------------------------------------------------------------------
// Tamu: keranjang ada di localStorage; server hanya melengkapi datanya.
// ------------------------------------------------------------------

export async function getGuestCartLines(input: unknown): Promise<CartResult> {
  const parsed = itemsSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "Isi keranjang tidak valid.", lines: [] };
  const supabase = await createClient();
  return { status: "success", lines: await resolveLines(supabase, parsed.data) };
}

// ------------------------------------------------------------------
// User login: keranjang di tabel cart_items (RLS: hanya milik sendiri).
// ------------------------------------------------------------------

export async function getUserCart(): Promise<CartResult> {
  const { supabase, userId } = await session();
  if (!userId) return NOT_LOGGED_IN;
  return userLines(supabase);
}

/**
 * Dipanggil sekali setelah login bila keranjang tamu berisi. Cart DB yang
 * sudah berisi dipertahankan; bila kosong, isi keranjang tamu dipindahkan.
 */
export async function syncGuestCart(
  input: unknown,
): Promise<CartResult & { outcome?: "adopted" | "kept" }> {
  const { supabase, userId } = await session();
  if (!userId) return NOT_LOGGED_IN;
  const parsed = itemsSchema.safeParse(input);
  const items = parsed.success ? parsed.data : [];

  const { data: outcome, error } = await supabase.rpc("merge_guest_cart", {
    items: items.map((i) => ({ variant_id: i.variantId, quantity: i.quantity })),
  });
  if (error) return { status: "error", message: dbErrorMessage(error) };
  return { ...(await userLines(supabase)), outcome: outcome === "adopted" ? "adopted" : "kept" };
}

const changeSchema = z.object({
  variantId: z.uuid(),
  quantity: z.number().int().min(0).max(MAX_PER_ITEM),
});

/**
 * Tambah (`mode: "add"`) atau set (`mode: "set"`) jumlah varian di cart DB.
 * Jumlah dibatasi stok tersedia & MAX_PER_ITEM; jumlah 0 pada mode set = hapus.
 */
export async function changeUserCart(input: unknown, mode: "add" | "set"): Promise<CartResult> {
  const { supabase, userId } = await session();
  if (!userId) return NOT_LOGGED_IN;
  const parsed = changeSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "Jumlah tidak valid." };
  const { variantId, quantity } = parsed.data;

  const { data: existing, error: readError } = await supabase
    .from("cart_items")
    .select("id, quantity")
    .eq("variant_id", variantId)
    .maybeSingle();
  if (readError) return { status: "error", message: dbErrorMessage(readError) };

  const wanted = mode === "add" ? (existing?.quantity ?? 0) + quantity : quantity;
  if (wanted <= 0) {
    if (existing) {
      const { error } = await supabase.from("cart_items").delete().eq("id", existing.id);
      if (error) return { status: "error", message: dbErrorMessage(error) };
    }
    return userLines(supabase);
  }

  const { data: availability, error: stockError } = await supabase.rpc("get_variant_availability", {
    variant_ids: [variantId],
  });
  if (stockError) return { status: "error", message: dbErrorMessage(stockError) };
  const available = availability[0]?.available ?? 0;
  if (available <= 0) return { status: "error", message: "Stok varian ini sedang habis." };

  const next = Math.min(wanted, available, MAX_PER_ITEM);
  let message: string | undefined;
  if (next < wanted) {
    message =
      next === MAX_PER_ITEM
        ? `Maksimal ${MAX_PER_ITEM} unit per varian.`
        : `Stok tersisa ${available} unit.`;
  }

  if (existing) {
    const { error } = await supabase
      .from("cart_items")
      .update({ quantity: next })
      .eq("id", existing.id);
    if (error) return { status: "error", message: dbErrorMessage(error) };
  } else {
    const { count } = await supabase
      .from("cart_items")
      .select("id", { count: "exact", head: true });
    if ((count ?? 0) >= MAX_CART_LINES) {
      return { status: "error", message: `Keranjang maksimal ${MAX_CART_LINES} jenis barang.` };
    }
    const { data: cartId, error: cartError } = await supabase.rpc("get_or_create_cart");
    if (cartError) return { status: "error", message: dbErrorMessage(cartError) };
    const { error } = await supabase
      .from("cart_items")
      .insert({ cart_id: cartId, variant_id: variantId, quantity: next });
    if (error) return { status: "error", message: dbErrorMessage(error) };
  }

  return { ...(await userLines(supabase)), message };
}
