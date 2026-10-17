"use server";

import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/session";
import { dbErrorMessage } from "@/lib/db-errors";
import { RATE_LIMITED_MESSAGE, rateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

import { commentSchema, type CommentReply } from "./types";

const uuid = z.uuid();

export type PostCommentResult =
  | { status: "success"; comment: CommentReply }
  | { status: "error"; message: string; needsLogin?: boolean };

/**
 * Kirim komentar (parentId kosong) atau balasan 1 tingkat. Mengembalikan
 * komentar baru agar langsung tampil tanpa memuat ulang daftar.
 */
export async function postComment(
  productId: string,
  body: string,
  parentId?: string | null,
): Promise<PostCommentResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { status: "error", message: "Masuk dulu untuk berkomentar.", needsLogin: true };
  }
  if (!uuid.safeParse(productId).success || (parentId && !uuid.safeParse(parentId).success)) {
    return { status: "error", message: "Komentar tidak ditemukan." };
  }
  const parsed = commentSchema.safeParse(body);
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]!.message };
  if (!(await rateLimit("comment", user.id))) {
    return { status: "error", message: RATE_LIMITED_MESSAGE };
  }

  const supabase = await createClient();
  const { data: id, error } = await supabase.rpc("post_product_comment", {
    p_product_id: productId,
    p_body: parsed.data,
    p_parent_id: parentId ?? undefined,
  });
  if (error) return { status: "error", message: dbErrorMessage(error) };

  return {
    status: "success",
    comment: {
      id,
      authorName: user.fullName?.trim() || "Pengguna KenBike",
      authorIsAdmin: user.role === "admin",
      body: parsed.data,
      createdAt: new Date().toISOString(),
    },
  };
}
