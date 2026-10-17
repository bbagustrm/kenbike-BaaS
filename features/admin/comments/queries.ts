import "server-only";

import { createClient } from "@/lib/supabase/server";

import { ADMIN_COMMENTS_PAGE_SIZE, type AdminCommentParams } from "./params";

export type AdminCommentReply = {
  id: string;
  authorName: string;
  authorIsAdmin: boolean;
  body: string;
  isHidden: boolean;
  createdAt: string;
};

export type AdminComment = {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  authorName: string;
  authorEmail: string | null;
  body: string;
  isHidden: boolean;
  answered: boolean;
  createdAt: string;
  replies: AdminCommentReply[];
};

function toReplies(value: unknown): AdminCommentReply[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const r = (item ?? {}) as Record<string, unknown>;
    if (typeof r.id !== "string" || typeof r.body !== "string") return [];
    return [
      {
        id: r.id,
        authorName: typeof r.author_name === "string" ? r.author_name : "Pengguna KenBike",
        authorIsAdmin: r.author_is_admin === true,
        body: r.body,
        isHidden: r.is_hidden === true,
        createdAt: typeof r.created_at === "string" ? r.created_at : "",
      },
    ];
  });
}

/** Komentar utama + utas balasannya (RPC admin). */
export async function listAdminComments(params: AdminCommentParams) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_list_comments", {
    p_filter: params.filter,
    p_product_id: params.productId,
    p_q: params.q,
    p_limit: ADMIN_COMMENTS_PAGE_SIZE,
    p_offset: (params.page - 1) * ADMIN_COMMENTS_PAGE_SIZE,
  });
  if (error) throw new Error(`admin_list_comments: ${error.message}`);
  const total = data[0]?.total_count ?? 0;
  const comments: AdminComment[] = data.map((c) => ({
    id: c.id,
    productId: c.product_id,
    productName: c.product_name,
    productSlug: c.product_slug,
    authorName: c.author_name,
    authorEmail: c.author_email,
    body: c.body,
    isHidden: c.is_hidden,
    answered: c.answered,
    createdAt: c.created_at,
    replies: toReplies(c.replies),
  }));
  return { comments, total, pageCount: Math.ceil(total / ADMIN_COMMENTS_PAGE_SIZE) };
}
