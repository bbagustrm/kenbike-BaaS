"use server";

import { refresh, updateTag } from "next/cache";
import { z } from "zod";

import type { ActionState } from "@/lib/action-state";
import { dbErrorMessage } from "@/lib/db-errors";
import { createClient } from "@/lib/supabase/server";

import { assertAdminAction } from "../guard";
import { PRODUCT_IMAGE_BUCKET, isProductImagePath } from "./images";

/** variant_id di product_images tidak dibatasi FK ke produk yang sama — cek di sini. */
async function variantsBelongTo(productId: string, variantIds: (string | null | undefined)[]) {
  const ids = [...new Set(variantIds.filter((id): id is string => Boolean(id)))];
  if (ids.length === 0) return true;
  const supabase = await createClient();
  const { count } = await supabase
    .from("product_variants")
    .select("id", { count: "exact", head: true })
    .eq("product_id", productId)
    .in("id", ids);
  return count === ids.length;
}

async function invalidate(productId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("products").select("slug").eq("id", productId).maybeSingle();
  updateTag("products");
  if (data?.slug) updateTag(`product:${data.slug}`);
  refresh();
}

const addSchema = z.object({
  productId: z.uuid(),
  images: z
    .array(
      z.object({
        path: z.string(),
        alt: z.string().trim().max(200).optional(),
        variantId: z.uuid().nullable().optional(),
      }),
    )
    .min(1)
    .max(10),
});

/** Catat gambar yang sudah diunggah browser ke Storage. */
export async function addProductImages(input: unknown): Promise<ActionState> {
  const denied = await assertAdminAction();
  if (denied) return denied;

  const parsed = addSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "Data gambar tidak valid." };
  const { productId, images } = parsed.data;
  if (!images.every((img) => isProductImagePath(img.path, productId))) {
    return { status: "error", message: "Lokasi file tidak valid." };
  }
  if (
    !(await variantsBelongTo(
      productId,
      images.map((img) => img.variantId),
    ))
  ) {
    return { status: "error", message: "Varian tidak valid." };
  }

  const supabase = await createClient();
  const { data: last } = await supabase
    .from("product_images")
    .select("sort_order")
    .eq("product_id", productId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const start = (last?.sort_order ?? -1) + 1;

  const { error } = await supabase.from("product_images").insert(
    images.map((img, i) => ({
      product_id: productId,
      storage_path: img.path,
      alt_text: img.alt || null,
      variant_id: img.variantId ?? null,
      sort_order: start + i,
    })),
  );
  if (error) {
    // Jangan tinggalkan file yatim di Storage.
    await supabase.storage.from(PRODUCT_IMAGE_BUCKET).remove(images.map((img) => img.path));
    return { status: "error", message: dbErrorMessage(error) };
  }

  await invalidate(productId);
  return {
    status: "success",
    message: images.length > 1 ? `${images.length} foto ditambahkan.` : "Foto ditambahkan.",
  };
}

const updateSchema = z.object({
  id: z.uuid(),
  alt: z.string().trim().max(200).nullable().optional(),
  variantId: z.uuid().nullable().optional(),
});

export async function updateProductImage(input: unknown): Promise<ActionState> {
  const denied = await assertAdminAction();
  if (denied) return denied;

  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "Data tidak valid." };
  const { id, alt, variantId } = parsed.data;

  const supabase = await createClient();
  if (variantId) {
    const { data: image } = await supabase
      .from("product_images")
      .select("product_id")
      .eq("id", id)
      .maybeSingle();
    if (!image) return { status: "error", message: "Foto tidak ditemukan." };
    if (!(await variantsBelongTo(image.product_id, [variantId]))) {
      return { status: "error", message: "Varian tidak valid." };
    }
  }
  const patch: { alt_text?: string | null; variant_id?: string | null } = {};
  if (alt !== undefined) patch.alt_text = alt || null;
  if (variantId !== undefined) patch.variant_id = variantId;

  const { data, error } = await supabase
    .from("product_images")
    .update(patch)
    .eq("id", id)
    .select("product_id")
    .maybeSingle();
  if (error) return { status: "error", message: dbErrorMessage(error) };
  if (!data) return { status: "error", message: "Foto tidak ditemukan." };

  await invalidate(data.product_id);
  return { status: "success", message: "Foto diperbarui." };
}

const reorderSchema = z.object({ productId: z.uuid(), ids: z.array(z.uuid()).min(1).max(50) });

export async function reorderProductImages(input: unknown): Promise<ActionState> {
  const denied = await assertAdminAction();
  if (denied) return denied;

  const parsed = reorderSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "Data tidak valid." };
  const { productId, ids } = parsed.data;

  const supabase = await createClient();
  const results = await Promise.all(
    ids.map((id, index) =>
      supabase
        .from("product_images")
        .update({ sort_order: index })
        .eq("id", id)
        .eq("product_id", productId),
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) return { status: "error", message: dbErrorMessage(failed.error) };

  await invalidate(productId);
  return { status: "success", message: "Urutan foto disimpan." };
}

export async function deleteProductImage(id: string): Promise<ActionState> {
  const denied = await assertAdminAction();
  if (denied) return denied;
  if (!z.uuid().safeParse(id).success) return { status: "error", message: "Data tidak valid." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_images")
    .delete()
    .eq("id", id)
    .select("product_id, storage_path")
    .maybeSingle();
  if (error) return { status: "error", message: dbErrorMessage(error) };
  if (!data) return { status: "error", message: "Foto tidak ditemukan." };

  // Baris sudah terhapus; kegagalan hapus file hanya menyisakan file yatim.
  await supabase.storage.from(PRODUCT_IMAGE_BUCKET).remove([data.storage_path]);

  await invalidate(data.product_id);
  return { status: "success", message: "Foto dihapus." };
}
