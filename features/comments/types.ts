import { z } from "zod";

export const COMMENT_PAGE_SIZE = 5;
export const MAX_COMMENT_LENGTH = 1000;

export type CommentReply = {
  id: string;
  authorName: string;
  authorIsAdmin: boolean;
  body: string;
  createdAt: string;
};

export type ProductComment = CommentReply & { replies: CommentReply[] };

export type CommentCursor = { at: string; id: string };

export const commentSchema = z
  .string()
  .trim()
  .min(1, { error: "Tulis komentar dulu" })
  .max(MAX_COMMENT_LENGTH, { error: `Komentar maksimal ${MAX_COMMENT_LENGTH} karakter` });

/** Balasan dari kolom jsonb RPC; item tidak valid dibuang. */
export function parseReplies(value: unknown): CommentReply[] {
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
        createdAt: typeof r.created_at === "string" ? r.created_at : "",
      },
    ];
  });
}

export function toProductComment(row: {
  id: string;
  author_name: string;
  author_is_admin: boolean;
  body: string;
  created_at: string;
  replies: unknown;
}): ProductComment {
  return {
    id: row.id,
    authorName: row.author_name,
    authorIsAdmin: row.author_is_admin,
    body: row.body,
    createdAt: row.created_at,
    replies: parseReplies(row.replies),
  };
}
