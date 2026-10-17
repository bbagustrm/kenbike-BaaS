"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { assertAdminAction } from "@/features/admin/guard";
import type { ActionState } from "@/lib/action-state";
import { getCurrentUser } from "@/lib/auth/session";
import { dbErrorMessage } from "@/lib/db-errors";
import { RATE_LIMITED_MESSAGE, rateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database.types";

import { listMessages } from "./queries";
import {
  type Attachment,
  type ChatMessage,
  type ConversationStatus,
  sendSchema,
  startSchema,
  toChatMessage,
} from "./schemas";

const uuid = z.uuid();
const SESSION_EXPIRED = "Sesi kamu sudah habis. Silakan masuk lagi.";

type SendResult =
  { status: "success"; message: ChatMessage } | { status: "error"; message: string };

/**
 * Kirim pesan (pembeli pemilik percakapan atau admin — peran ditentukan RPC).
 * Lampiran sudah diunggah browser ke Storage; di sini hanya metadata-nya.
 */
export async function sendChatMessage(
  conversationId: string,
  input: { body: string; attachments: Attachment[] },
): Promise<SendResult> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: SESSION_EXPIRED };
  if (!uuid.safeParse(conversationId).success) {
    return { status: "error", message: "Percakapan tidak ditemukan." };
  }
  const parsed = sendSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Pesan tidak valid." };
  }
  if (!(await rateLimit("chatMessage", user.id))) {
    return { status: "error", message: RATE_LIMITED_MESSAGE };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("send_message", {
    p_conversation_id: conversationId,
    p_body: parsed.data.body,
    p_attachments: parsed.data.attachments as unknown as Json,
  });
  if (error) return { status: "error", message: dbErrorMessage(error) };
  return { status: "success", message: toChatMessage(data) };
}

/** Muat pesan lebih lama (infinite scroll ke atas). */
export async function loadOlderMessages(
  conversationId: string,
  before: string,
): Promise<{ messages: ChatMessage[]; hasMore: boolean }> {
  if (!uuid.safeParse(conversationId).success || Number.isNaN(Date.parse(before))) {
    return { messages: [], hasMore: false };
  }
  return listMessages(conversationId, before);
}

/** Tandai percakapan dibaca oleh pemanggil (badge belum dibaca). */
export async function markConversationRead(conversationId: string): Promise<void> {
  if (!uuid.safeParse(conversationId).success) return;
  const supabase = await createClient();
  await supabase.rpc("mark_conversation_read", { p_conversation_id: conversationId });
}

/** Admin: tutup / buka kembali percakapan. */
export async function setConversationStatus(
  conversationId: string,
  status: ConversationStatus,
): Promise<ActionState> {
  const denied = await assertAdminAction();
  if (denied) return denied;
  if (!uuid.safeParse(conversationId).success) {
    return { status: "error", message: "Percakapan tidak ditemukan." };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_conversation_status", {
    p_conversation_id: conversationId,
    p_status: status,
  });
  if (error) return { status: "error", message: dbErrorMessage(error) };
  refresh();
  return {
    status: "success",
    message: status === "closed" ? "Percakapan ditandai selesai." : "Percakapan dibuka kembali.",
  };
}

/** Pembeli: mulai chat umum (topik + pesan pertama), lalu buka percakapannya. */
export async function startConversation(input: {
  subject: string;
  body: string;
}): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: SESSION_EXPIRED };
  const parsed = startSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }
  if (!(await rateLimit("chatStart", user.id))) {
    return { status: "error", message: RATE_LIMITED_MESSAGE };
  }

  const supabase = await createClient();
  const { data: conversation, error } = await supabase.rpc("start_conversation", {
    p_subject: parsed.data.subject,
  });
  if (error) return { status: "error", message: dbErrorMessage(error) };
  const { error: sendError } = await supabase.rpc("send_message", {
    p_conversation_id: conversation.id,
    p_body: parsed.data.body,
  });
  if (sendError) return { status: "error", message: dbErrorMessage(sendError) };

  redirect(`/account/messages/${conversation.id}`);
}

/** Pembeli: buka (atau buat) chat untuk pesanan miliknya. */
export async function openOrderConversation(orderId: string): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: SESSION_EXPIRED };
  if (!uuid.safeParse(orderId).success) {
    return { status: "error", message: "Pesanan tidak ditemukan." };
  }
  if (!(await rateLimit("chatStart", user.id))) {
    return { status: "error", message: RATE_LIMITED_MESSAGE };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("start_conversation", {
    p_subject: "",
    p_order_id: orderId,
  });
  if (error) return { status: "error", message: dbErrorMessage(error) };
  redirect(`/account/messages/${data.id}`);
}
