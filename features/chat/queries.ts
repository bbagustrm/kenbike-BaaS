import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

import {
  type ChatMessage,
  type ConversationStatus,
  type InboxFilter,
  type InboxKind,
  type MessageSender,
  MESSAGES_PAGE_SIZE,
  toChatMessage,
} from "./schemas";

type PaymentStatus = Database["public"]["Enums"]["payment_status"];
type ShippingStatus = Database["public"]["Enums"]["shipping_status"];

export type ConversationDetail = {
  id: string;
  subject: string;
  status: ConversationStatus;
  customerId: string;
  customerName: string | null;
  customerPhone: string | null;
  order: {
    id: string;
    orderNumber: string;
    paymentStatus: PaymentStatus;
    shippingStatus: ShippingStatus | null;
    total: number;
  } | null;
  createdAt: string;
};

/** Percakapan yang boleh dibaca pemanggil (RLS: pemilik / admin). */
export async function getConversation(id: string): Promise<ConversationDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("conversations")
    .select(
      `id, subject, status, customer_id, created_at,
       customer:profiles (full_name, phone),
       order:orders (id, order_number, payment_status, shipping_status, total_amount)`,
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`getConversation: ${error.message}`);
  if (!data) return null;
  return {
    id: data.id,
    subject: data.subject,
    status: data.status,
    customerId: data.customer_id,
    customerName: data.customer?.full_name ?? null,
    customerPhone: data.customer?.phone ?? null,
    order: data.order
      ? {
          id: data.order.id,
          orderNumber: data.order.order_number,
          paymentStatus: data.order.payment_status,
          shippingStatus: data.order.shipping_status,
          total: data.order.total_amount,
        }
      : null,
    createdAt: data.created_at,
  };
}

/** Pesan terbaru (urut lama → baru); `before` = muat pesan sebelum waktu itu. */
export async function listMessages(
  conversationId: string,
  before?: string,
): Promise<{ messages: ChatMessage[]; hasMore: boolean }> {
  const supabase = await createClient();
  let query = supabase
    .from("messages")
    .select("id, sender_role, sender_id, body, attachments, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(MESSAGES_PAGE_SIZE + 1);
  if (before) query = query.lt("created_at", before);
  const { data, error } = await query;
  if (error) throw new Error(`listMessages: ${error.message}`);
  const hasMore = data.length > MESSAGES_PAGE_SIZE;
  return { messages: data.slice(0, MESSAGES_PAGE_SIZE).reverse().map(toChatMessage), hasMore };
}

/** Email pembeli (auth.users) untuk panel konteks admin. Pemanggil WAJIB admin. */
export async function getCustomerEmail(customerId: string): Promise<string | null> {
  const { data } = await createAdminClient().auth.admin.getUserById(customerId);
  return data.user?.email ?? null;
}

export type InboxItem = {
  id: string;
  subject: string;
  status: ConversationStatus;
  orderNumber: string | null;
  customerName: string | null;
  customerEmail: string | null;
  lastMessageAt: string;
  preview: string;
  lastSender: MessageSender | null;
  needsReply: boolean;
  unread: boolean;
};

export type InboxParams = {
  filter: InboxFilter;
  kind?: InboxKind;
  q?: string;
  before?: { at: string; id: string };
};

export const INBOX_PAGE_SIZE = 30;

/** Inbox admin lewat RPC (cek admin di dalam). */
export async function listInbox(
  params: InboxParams,
): Promise<{ items: InboxItem[]; next: { at: string; id: string } | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_list_conversations", {
    p_filter: params.filter,
    p_kind: params.kind,
    p_q: params.q,
    p_limit: INBOX_PAGE_SIZE + 1,
    p_before_at: params.before?.at,
    p_before_id: params.before?.id,
  });
  if (error) throw new Error(`admin_list_conversations: ${error.message}`);
  const rows = data.slice(0, INBOX_PAGE_SIZE);
  const last = rows.at(-1);
  return {
    items: rows.map((r) => ({
      id: r.id,
      subject: r.subject,
      status: r.status,
      orderNumber: r.order_number,
      customerName: r.customer_name,
      customerEmail: r.customer_email,
      lastMessageAt: r.last_message_at,
      preview: r.last_message_preview,
      lastSender: r.last_sender,
      needsReply: r.needs_reply,
      unread: r.unread,
    })),
    next: data.length > INBOX_PAGE_SIZE && last ? { at: last.last_message_at, id: last.id } : null,
  };
}
