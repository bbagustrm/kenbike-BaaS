import "server-only";

import { escapeLike } from "@/lib/search";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

import { ADMIN_REVIEWS_PAGE_SIZE, type AdminReviewParams } from "./params";

type ReviewSource = Database["public"]["Enums"]["review_source"];

export type AdminReview = {
  id: string;
  source: ReviewSource;
  reviewerName: string;
  rating: number;
  body: string;
  adminReply: string | null;
  adminReplyAt: string | null;
  createdAt: string;
  orderNumber: string | null;
  products: { id: string; name: string; slug: string; variantLabel: string | null }[];
  photos: string[];
};

/** Ulasan untuk admin (RLS: admin membaca semua). Yang dihapus tidak ditampilkan. */
export async function listAdminReviews(params: AdminReviewParams) {
  const supabase = await createClient();
  // !inner pada review_products agar filter produk menyaring ulasannya (bukan hanya relasinya).
  let query = supabase
    .from("reviews")
    .select(
      `id, source, reviewer_name, rating, body, admin_reply, admin_reply_at, created_at,
       order:orders (order_number),
       products:review_products!inner (variant_label, product_id,
         product:products (id, name, slug)),
       photos:review_photos (storage_path, sort_order)`,
      { count: "exact" },
    )
    .is("deleted_at", null);

  if (params.rating) query = query.eq("rating", params.rating);
  if (params.source) query = query.eq("source", params.source);
  if (params.status === "unreplied") query = query.is("admin_reply", null);
  if (params.status === "replied") query = query.not("admin_reply", "is", null);
  if (params.productId) query = query.eq("review_products.product_id", params.productId);
  if (params.q) {
    const q = escapeLike(params.q);
    query = query.or(`reviewer_name.ilike.%${q}%,body.ilike.%${q}%`);
  }

  const from = (params.page - 1) * ADMIN_REVIEWS_PAGE_SIZE;
  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, from + ADMIN_REVIEWS_PAGE_SIZE - 1);
  if (error?.code === "PGRST103") return { reviews: [], total: count ?? 0, pageCount: 0 };
  if (error) throw new Error(`listAdminReviews: ${error.message}`);

  const reviews: AdminReview[] = data.map((r) => ({
    id: r.id,
    source: r.source,
    reviewerName: r.reviewer_name,
    rating: r.rating,
    body: r.body,
    adminReply: r.admin_reply,
    adminReplyAt: r.admin_reply_at,
    createdAt: r.created_at,
    orderNumber: r.order?.order_number ?? null,
    products: r.products.flatMap((p) =>
      p.product
        ? [
            {
              id: p.product.id,
              name: p.product.name,
              slug: p.product.slug,
              variantLabel: p.variant_label,
            },
          ]
        : [],
    ),
    photos: [...r.photos].sort((a, b) => a.sort_order - b.sort_order).map((p) => p.storage_path),
  }));
  const total = count ?? 0;
  return { reviews, total, pageCount: Math.ceil(total / ADMIN_REVIEWS_PAGE_SIZE) };
}

/** Semua produk (termasuk nonaktif) untuk filter & form impor ulasan. */
export async function listProductChoices(): Promise<{ id: string; name: string }[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, name")
    .order("name")
    .limit(1000);
  if (error) throw new Error(`listProductChoices: ${error.message}`);
  return data;
}
