"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import { postComment } from "@/features/comments/actions";
import type { ActionState } from "@/lib/action-state";
import { dbErrorMessage } from "@/lib/db-errors";
import { createClient } from "@/lib/supabase/server";

import { assertAdminAction } from "../guard";

const uuid = z.uuid();
const NOT_FOUND: ActionState = { status: "error", message: "Komentar tidak ditemukan." };

/** Admin membalas komentar utama (tampil dengan badge Admin di halaman produk). */
export async function adminReplyComment(
  productId: string,
  commentId: string,
  body: string,
): Promise<ActionState> {
  const denied = await assertAdminAction();
  if (denied) return denied;
  const result = await postComment(productId, body, commentId);
  if (result.status === "error") return { status: "error", message: result.message };
  refresh();
  return { status: "success", message: "Balasan terkirim." };
}

export async function setCommentHidden(commentId: string, hidden: boolean): Promise<ActionState> {
  const denied = await assertAdminAction();
  if (denied) return denied;
  if (!uuid.safeParse(commentId).success) return NOT_FOUND;
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_comment_hidden", {
    p_comment_id: commentId,
    p_hidden: hidden,
  });
  if (error) return { status: "error", message: dbErrorMessage(error) };
  refresh();
  return {
    status: "success",
    message: hidden ? "Komentar disembunyikan." : "Komentar ditampilkan.",
  };
}

/** Hapus permanen (balasan ikut terhapus). */
export async function deleteComment(commentId: string): Promise<ActionState> {
  const denied = await assertAdminAction();
  if (denied) return denied;
  if (!uuid.safeParse(commentId).success) return NOT_FOUND;
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_delete_comment", { p_comment_id: commentId });
  if (error) return { status: "error", message: dbErrorMessage(error) };
  refresh();
  return { status: "success", message: "Komentar dihapus." };
}
