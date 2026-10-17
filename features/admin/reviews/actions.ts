"use server";

import { refresh, updateTag } from "next/cache";
import { after } from "next/server";
import { z } from "zod";

import {
  isOwnReviewPhotoPath,
  MAX_REVIEW_LENGTH,
  MAX_REVIEW_PHOTOS,
} from "@/features/reviews/schemas";
import { notifyReviewReply } from "@/features/notifications/notify";
import type { ActionState } from "@/lib/action-state";
import { getCurrentUser } from "@/lib/auth/session";
import { dbErrorMessage } from "@/lib/db-errors";
import { createClient } from "@/lib/supabase/server";

import { assertAdminAction } from "../guard";

const uuid = z.uuid();
const NOT_FOUND: ActionState = { status: "error", message: "Ulasan tidak ditemukan." };

/** Halaman produk & katalog di-cache: perbarui produk yang terkait ulasan ini. */
async function invalidateReviewProducts(reviewId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("review_products")
    .select("product:products (slug)")
    .eq("review_id", reviewId);
  for (const row of data ?? []) if (row.product?.slug) updateTag(`product:${row.product.slug}`);
  updateTag("products");
}

const replySchema = z
  .string()
  .trim()
  .max(MAX_REVIEW_LENGTH, { error: `Balasan maksimal ${MAX_REVIEW_LENGTH} karakter` });

/** Balas ulasan (kosong = hapus balasan). Tampil dengan badge Admin. */
export async function replyReview(reviewId: string, reply: string): Promise<ActionState> {
  const denied = await assertAdminAction();
  if (denied) return denied;
  if (!uuid.safeParse(reviewId).success) return NOT_FOUND;
  const parsed = replySchema.safeParse(reply);
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]!.message };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_reply_review", {
    p_review_id: reviewId,
    p_reply: parsed.data,
  });
  if (error) return { status: "error", message: dbErrorMessage(error) };
  await invalidateReviewProducts(reviewId);
  if (parsed.data) after(() => notifyReviewReply(reviewId, parsed.data));
  refresh();
  return {
    status: "success",
    message: parsed.data ? "Balasan disimpan." : "Balasan dihapus.",
  };
}

/** Hapus ulasan (soft delete; rating produk dihitung ulang otomatis). */
export async function deleteReview(reviewId: string): Promise<ActionState> {
  const denied = await assertAdminAction();
  if (denied) return denied;
  if (!uuid.safeParse(reviewId).success) return NOT_FOUND;

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_delete_review", { p_review_id: reviewId });
  if (error) return { status: "error", message: dbErrorMessage(error) };
  await invalidateReviewProducts(reviewId);
  refresh();
  return { status: "success", message: "Ulasan dihapus." };
}

const importSchema = z.object({
  productId: z.uuid({ error: "Pilih produk" }),
  reviewerName: z
    .string()
    .trim()
    .min(1, { error: "Nama pengulas wajib diisi" })
    .max(100, { error: "Nama maksimal 100 karakter" }),
  rating: z.number().int().min(1, { error: "Pilih bintang" }).max(5),
  body: z.string().trim().max(MAX_REVIEW_LENGTH),
  date: z.iso.date({ error: "Tanggal tidak valid" }).optional(),
  variantLabel: z.string().trim().max(300).optional(),
  photoPaths: z.array(z.string()).max(MAX_REVIEW_PHOTOS),
});

/** Tambah ulasan manual (mis. migrasi dari Shopee) dengan tanggal aslinya. */
export async function importReview(input: z.input<typeof importSchema>): Promise<ActionState> {
  const denied = await assertAdminAction();
  if (denied) return denied;
  const parsed = importSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]!.message };
  const user = await getCurrentUser();
  if (!user || parsed.data.photoPaths.some((p) => !isOwnReviewPhotoPath(user.id, p))) {
    return { status: "error", message: "Foto tidak valid. Unggah ulang." };
  }

  const supabase = await createClient();
  const { data: reviewId, error } = await supabase.rpc("admin_import_review", {
    p_product_id: parsed.data.productId,
    p_reviewer_name: parsed.data.reviewerName,
    p_rating: parsed.data.rating,
    p_body: parsed.data.body,
    // Awal hari WIB: tanggal tidak bergeser zona waktu & hari ini tidak dianggap masa depan.
    p_created_at: parsed.data.date ? `${parsed.data.date}T00:00:00+07:00` : undefined,
    p_photo_paths: parsed.data.photoPaths,
    p_variant_label: parsed.data.variantLabel || undefined,
  });
  if (error) return { status: "error", message: dbErrorMessage(error) };
  await invalidateReviewProducts(reviewId);
  refresh();
  return { status: "success", message: "Ulasan ditambahkan." };
}
