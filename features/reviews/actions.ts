"use server";

import { refresh, updateTag } from "next/cache";
import { z } from "zod";

import type { ActionState } from "@/lib/action-state";
import { getCurrentUser } from "@/lib/auth/session";
import { dbErrorMessage } from "@/lib/db-errors";
import { RATE_LIMITED_MESSAGE, rateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

import { isOwnReviewPhotoPath, reviewSchema } from "./schemas";

const uuid = z.uuid();
const SESSION_EXPIRED = "Sesi kamu sudah habis. Silakan masuk lagi.";

/** Halaman & katalog di-cache: perbarui produk yang ulasannya berubah. */
async function invalidateOrderProducts(orderId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("order_items")
    .select("variant:product_variants (product:products (slug))")
    .eq("order_id", orderId);
  const slugs = new Set((data ?? []).map((i) => i.variant?.product?.slug).filter(Boolean));
  for (const slug of slugs) updateTag(`product:${slug}`);
  updateTag("products");
}

/** Pembeli: kirim ulasan untuk pesanan delivered miliknya (sekali per pesanan). */
export async function submitOrderReview(
  orderId: string,
  input: { rating: number; body: string; photoPaths: string[] },
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: SESSION_EXPIRED };
  if (!uuid.safeParse(orderId).success) {
    return { status: "error", message: "Pesanan tidak ditemukan." };
  }
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Ulasan tidak valid." };
  }
  if (parsed.data.photoPaths.some((p) => !isOwnReviewPhotoPath(user.id, p))) {
    return { status: "error", message: "Foto tidak valid. Unggah ulang." };
  }
  if (!(await rateLimit("review", user.id))) {
    return { status: "error", message: RATE_LIMITED_MESSAGE };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_order_review", {
    p_order_id: orderId,
    p_rating: parsed.data.rating,
    p_body: parsed.data.body,
    p_photo_paths: parsed.data.photoPaths,
  });
  if (error) return { status: "error", message: dbErrorMessage(error) };

  await invalidateOrderProducts(orderId);
  refresh();
  return { status: "success", message: "Terima kasih! Ulasanmu sudah tayang." };
}

/** Pembeli: "Nanti" — jangan munculkan modal untuk pesanan ini lagi. */
export async function dismissReviewPrompt(orderId: string): Promise<void> {
  if (!uuid.safeParse(orderId).success) return;
  const supabase = await createClient();
  await supabase.rpc("dismiss_review_prompt", { p_order_id: orderId });
}
