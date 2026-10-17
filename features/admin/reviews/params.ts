import { firstParam } from "@/lib/search";

export const ADMIN_REVIEWS_PAGE_SIZE = 20;

export const REVIEW_STATUS_FILTERS = {
  unreplied: "Belum dibalas",
  replied: "Sudah dibalas",
} as const;
export type ReviewStatusFilter = keyof typeof REVIEW_STATUS_FILTERS;

export const REVIEW_SOURCE_FILTERS = { customer: "Pembeli", imported: "Impor" } as const;
export type ReviewSourceFilter = keyof typeof REVIEW_SOURCE_FILTERS;

export type AdminReviewParams = {
  q?: string;
  rating?: number;
  status?: ReviewStatusFilter;
  source?: ReviewSourceFilter;
  productId?: string;
  page: number;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseAdminReviewParams(
  raw: Record<string, string | string[] | undefined>,
): AdminReviewParams {
  const rating = Number(firstParam(raw.rating));
  const status = firstParam(raw.status);
  const source = firstParam(raw.source);
  const product = firstParam(raw.product);
  return {
    // Karakter sintaks filter PostgREST dibuang (dipakai di or()).
    q:
      firstParam(raw.q)
        ?.replace(/[%_,()]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 100) || undefined,
    rating: Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : undefined,
    status: status && status in REVIEW_STATUS_FILTERS ? (status as ReviewStatusFilter) : undefined,
    source: source && source in REVIEW_SOURCE_FILTERS ? (source as ReviewSourceFilter) : undefined,
    productId: product && UUID.test(product) ? product : undefined,
    page: Math.max(1, Math.min(500, Number.parseInt(firstParam(raw.page) ?? "1", 10) || 1)),
  };
}

export function adminReviewsHref(params: AdminReviewParams): string {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.rating) sp.set("rating", String(params.rating));
  if (params.status) sp.set("status", params.status);
  if (params.source) sp.set("source", params.source);
  if (params.productId) sp.set("product", params.productId);
  if (params.page > 1) sp.set("page", String(params.page));
  const qs = sp.toString();
  return qs ? `/admin/reviews?${qs}` : "/admin/reviews";
}
