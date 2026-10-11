"use server";

import { refresh, updateTag } from "next/cache";
import { z } from "zod";

import type { ActionState } from "@/lib/action-state";
import { dbErrorMessage } from "@/lib/db-errors";
import { createClient } from "@/lib/supabase/server";

import { assertAdminAction } from "../guard";
import { productFormSchema, stockAdjustments, toRpcPayload } from "./schemas";

export type SaveProductResult = ActionState & {
  productId?: string;
  /** Produk baru: SKU → id varian, untuk menautkan foto ke varian setelah dibuat. */
  variantIds?: Record<string, string>;
};

function invalidateProduct(...slugs: (string | undefined)[]) {
  updateTag("products");
  for (const slug of new Set(slugs)) if (slug) updateTag(`product:${slug}`);
}

/**
 * Simpan produk + opsi + varian secara atomik lewat RPC. Dipanggil dari form
 * React Hook Form (bukan FormData) — input divalidasi ulang di sini.
 */
export async function saveProduct(
  productId: string | null,
  input: unknown,
): Promise<SaveProductResult> {
  const denied = await assertAdminAction();
  if (denied) return denied;

  const parsed = productFormSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: "Periksa kembali isian produk." };
  }

  const supabase = await createClient();
  const payload = toRpcPayload(parsed.data);

  if (productId) {
    const { data: before } = await supabase
      .from("products")
      .select("slug")
      .eq("id", productId)
      .maybeSingle();
    const { error } = await supabase.rpc("admin_update_product", {
      p_product_id: productId,
      payload,
    });
    if (error) return { status: "error", message: dbErrorMessage(error) };

    // Stok varian lama diubah sebagai selisih dari nilai saat form dimuat, jadi
    // penjualan yang terjadi selama admin mengedit tidak tertimpa.
    const failed: string[] = [];
    for (const { variantId, delta } of stockAdjustments(parsed.data)) {
      const { error: stockError } = await supabase.rpc("admin_adjust_stock", {
        p_variant_id: variantId,
        p_delta: delta,
        p_reason: "Diubah dari form produk",
      });
      if (stockError) failed.push(dbErrorMessage(stockError));
    }

    invalidateProduct(before?.slug, parsed.data.slug);
    refresh();
    if (failed.length > 0) {
      return {
        status: "error",
        message: `Produk disimpan, tetapi sebagian stok gagal diubah: ${failed[0]}`,
        productId,
      };
    }
    return { status: "success", message: "Produk disimpan.", productId };
  }

  const { data: newId, error } = await supabase.rpc("admin_create_product", { payload });
  if (error) return { status: "error", message: dbErrorMessage(error) };
  invalidateProduct(parsed.data.slug);
  const { data: created } = await supabase
    .from("product_variants")
    .select("id, sku")
    .eq("product_id", newId);
  return {
    status: "success",
    message: "Produk dibuat.",
    productId: newId,
    variantIds: Object.fromEntries((created ?? []).map((v) => [v.sku.toLowerCase(), v.id])),
  };
}

export async function setProductActive(productId: string, isActive: boolean): Promise<ActionState> {
  const denied = await assertAdminAction();
  if (denied) return denied;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .update({ is_active: isActive })
    .eq("id", productId)
    .select("slug")
    .maybeSingle();
  if (error) return { status: "error", message: dbErrorMessage(error) };
  if (!data) return { status: "error", message: "Produk tidak ditemukan." };

  invalidateProduct(data.slug);
  refresh();
  return { status: "success", message: isActive ? "Produk diaktifkan." : "Produk dinonaktifkan." };
}

const adjustStockSchema = z.object({
  variantId: z.uuid(),
  delta: z
    .number({ error: "Isi jumlah" })
    .int({ error: "Harus bilangan bulat" })
    .refine((n) => n !== 0, { error: "Tidak boleh nol" })
    .refine((n) => Math.abs(n) <= 100_000, { error: "Terlalu besar" }),
  reason: z
    .string()
    .trim()
    .min(3, { error: "Alasan minimal 3 karakter" })
    .max(200, { error: "Alasan maksimal 200 karakter" }),
});

/** Koreksi stok fisik lewat RPC (tercatat di stock_adjustments). */
export async function adjustStock(input: unknown): Promise<ActionState> {
  const denied = await assertAdminAction();
  if (denied) return denied;

  const parsed = adjustStockSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Periksa kembali isian.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors as ActionState["fieldErrors"],
    };
  }

  const supabase = await createClient();
  const { data: quantity, error } = await supabase.rpc("admin_adjust_stock", {
    p_variant_id: parsed.data.variantId,
    p_delta: parsed.data.delta,
    p_reason: parsed.data.reason,
  });
  if (error) return { status: "error", message: dbErrorMessage(error) };

  // Stok publik tidak di-cache, jadi cukup render ulang halaman admin.
  refresh();
  return { status: "success", message: `Stok diperbarui menjadi ${quantity}.` };
}
