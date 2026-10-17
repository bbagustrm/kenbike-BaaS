import { createClient } from "@/lib/supabase/client";

import {
  type ProductReview,
  type RatingDistribution,
  type ReviewCursor,
  toDistribution,
  toProductReview,
} from "./types";

/**
 * Dipanggil dari Client Component saat section/modal ulasan dibuka (lazy).
 * RPC publik (anon) → tidak butuh login dan tidak membuka kolom pribadi.
 */
export async function fetchProductReviews(params: {
  productId: string;
  limit: number;
  rating?: number | null;
  before?: ReviewCursor | null;
}): Promise<{ reviews: ProductReview[]; next: ReviewCursor | null }> {
  const { data, error } = await createClient().rpc("list_product_reviews", {
    p_product_id: params.productId,
    p_rating: params.rating ?? undefined,
    // Ambil satu lebih untuk mengetahui masih ada halaman berikutnya.
    p_limit: params.limit + 1,
    p_before_at: params.before?.at,
    p_before_id: params.before?.id,
  });
  if (error) throw new Error(error.message);
  const rows = data.slice(0, params.limit).map(toProductReview);
  const last = rows.at(-1);
  return {
    reviews: rows,
    next: data.length > params.limit && last ? { at: last.createdAt, id: last.id } : null,
  };
}

export async function fetchRatingDistribution(productId: string): Promise<RatingDistribution> {
  const { data, error } = await createClient()
    .rpc("product_rating_summary", { p_product_id: productId })
    .maybeSingle();
  if (error) throw new Error(error.message);
  return toDistribution(data?.distribution);
}
