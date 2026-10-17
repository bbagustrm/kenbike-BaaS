import { createClient } from "@/lib/supabase/client";

import {
  COMMENT_PAGE_SIZE,
  type CommentCursor,
  type ProductComment,
  toProductComment,
} from "./types";

/** Dipanggil dari Client Component saat section Komentar dibuka / di-scroll (RPC publik). */
export async function fetchProductComments(
  productId: string,
  before: CommentCursor | null,
): Promise<{ comments: ProductComment[]; next: CommentCursor | null }> {
  const { data, error } = await createClient().rpc("list_product_comments", {
    p_product_id: productId,
    p_limit: COMMENT_PAGE_SIZE + 1,
    p_before_at: before?.at,
    p_before_id: before?.id,
  });
  if (error) throw new Error(error.message);
  const comments = data.slice(0, COMMENT_PAGE_SIZE).map(toProductComment);
  const last = comments.at(-1);
  return {
    comments,
    next: data.length > COMMENT_PAGE_SIZE && last ? { at: last.createdAt, id: last.id } : null,
  };
}

export async function fetchCommentCount(productId: string): Promise<number> {
  const { data, error } = await createClient().rpc("product_comment_count", {
    p_product_id: productId,
  });
  if (error) throw new Error(error.message);
  return data;
}
