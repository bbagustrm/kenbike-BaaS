import { publicEnv } from "@/lib/env/public";

export const REVIEW_PHOTO_BUCKET = "review-photos";
/** Ulasan yang tampil langsung di halaman produk; sisanya lewat "Tampilkan semua". */
export const REVIEW_PREVIEW_COUNT = 2;
/** Jumlah per muat di modal (infinite scroll). */
export const REVIEW_PAGE_SIZE = 5;

export type ProductReview = {
  id: string;
  reviewerName: string;
  rating: number;
  body: string;
  variantLabel: string | null;
  photos: string[];
  adminReply: string | null;
  adminReplyAt: string | null;
  createdAt: string;
};

export type ReviewCursor = { at: string; id: string };

export type RatingDistribution = Record<1 | 2 | 3 | 4 | 5, number>;

/** URL publik foto ulasan (bucket publik → bisa lewat next/image). */
export function reviewPhotoUrl(path: string): string {
  return `${publicEnv.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${REVIEW_PHOTO_BUCKET}/${path
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

export function toProductReview(row: {
  id: string;
  reviewer_name: string;
  rating: number;
  body: string;
  variant_label: string | null;
  photos: string[] | null;
  admin_reply: string | null;
  admin_reply_at: string | null;
  created_at: string;
}): ProductReview {
  return {
    id: row.id,
    reviewerName: row.reviewer_name,
    rating: row.rating,
    body: row.body,
    variantLabel: row.variant_label,
    photos: row.photos ?? [],
    adminReply: row.admin_reply,
    adminReplyAt: row.admin_reply_at,
    createdAt: row.created_at,
  };
}

/** Distribusi dari jsonb {"1": n, ...}; nilai tak dikenal → 0. */
export function toDistribution(value: unknown): RatingDistribution {
  const source = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const pick = (star: number) => {
    const n = Number(source[String(star)]);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  };
  return { 1: pick(1), 2: pick(2), 3: pick(3), 4: pick(4), 5: pick(5) };
}
