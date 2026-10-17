import { firstParam } from "@/lib/search";

export const ADMIN_COMMENTS_PAGE_SIZE = 20;

export const COMMENT_FILTERS = {
  unanswered: "Belum dijawab",
  hidden: "Disembunyikan",
  all: "Semua",
} as const;
export type CommentFilter = keyof typeof COMMENT_FILTERS;

export type AdminCommentParams = {
  filter: CommentFilter;
  productId?: string;
  q?: string;
  page: number;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Default: pertanyaan yang belum dijawab admin. */
export function parseAdminCommentParams(
  raw: Record<string, string | string[] | undefined>,
): AdminCommentParams {
  const filter = firstParam(raw.status);
  const product = firstParam(raw.product);
  return {
    filter: filter && filter in COMMENT_FILTERS ? (filter as CommentFilter) : "unanswered",
    productId: product && UUID.test(product) ? product : undefined,
    q:
      firstParam(raw.q)?.replace(/[%_]/g, " ").replace(/\s+/g, " ").trim().slice(0, 100) ||
      undefined,
    page: Math.max(1, Math.min(500, Number.parseInt(firstParam(raw.page) ?? "1", 10) || 1)),
  };
}

export function adminCommentsHref(params: AdminCommentParams): string {
  const sp = new URLSearchParams();
  if (params.filter !== "unanswered") sp.set("status", params.filter);
  if (params.productId) sp.set("product", params.productId);
  if (params.q) sp.set("q", params.q);
  if (params.page > 1) sp.set("page", String(params.page));
  const qs = sp.toString();
  return qs ? `/admin/comments?${qs}` : "/admin/comments";
}
