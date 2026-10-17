import "server-only";

import { sendEmail } from "@/lib/email/send";
import {
  adminNewMessageEmail,
  chatReplyEmail,
  commentReplyEmail,
  orderCancelledEmail,
  refundCompletedEmail,
  reviewReplyEmail,
} from "@/lib/email/templates";
import { emailEnv } from "@/lib/env/server";
import { publicEnv } from "@/lib/env/public";
import { errorMessage, log } from "@/lib/log";
import { opsAlert } from "@/lib/ops-alert";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Notifikasi email & alert admin (#102). Dipanggil lewat `after()` setelah aksi
 * utama selesai; setiap fungsi menelan error sendiri — notifikasi tidak boleh
 * menggagalkan atau memperlambat aksi pengguna.
 */

const url = (path: string) => new URL(path, publicEnv.NEXT_PUBLIC_SITE_URL).toString();

async function emailOf(profileId: string): Promise<string | null> {
  const { data } = await createAdminClient().auth.admin.getUserById(profileId);
  return data.user?.email ?? null;
}

async function safely(event: string, run: () => Promise<void>) {
  try {
    await run();
  } catch (error) {
    log("error", `notify.${event}_failed`, { message: errorMessage(error) });
  }
}

/** Admin membalas chat → email pembeli (maks. 1/15 menit, tidak bila sedang dibuka). */
export function notifyChatReply(conversationId: string, preview: string) {
  return safely("chat_reply", async () => {
    const admin = createAdminClient();
    const { data: allowed } = await admin.rpc("claim_chat_email", {
      p_conversation_id: conversationId,
      p_recipient: "customer",
    });
    if (!allowed) return;
    const { data: c } = await admin
      .from("conversations")
      .select("customer_id, subject")
      .eq("id", conversationId)
      .single();
    const to = c ? await emailOf(c.customer_id) : null;
    if (!c || !to) return;
    await sendEmail({
      to,
      tag: "chat_reply",
      ...chatReplyEmail({
        subject: c.subject,
        preview,
        url: url(`/account/messages/${conversationId}`),
      }),
    });
  });
}

/** Pembeli mengirim pesan → Discord + email admin (opsional), maks. 1/15 menit per percakapan. */
export function notifyAdminNewMessage(conversationId: string, preview: string) {
  return safely("admin_message", async () => {
    const admin = createAdminClient();
    const { data: allowed } = await admin.rpc("claim_chat_email", {
      p_conversation_id: conversationId,
      p_recipient: "admin",
    });
    if (!allowed) return;
    const { data: c } = await admin
      .from("conversations")
      .select("subject, customer:profiles (full_name)")
      .eq("id", conversationId)
      .single();
    if (!c) return;
    const customerName = c.customer?.full_name?.trim() || "Pembeli";
    const link = url(`/admin/messages/${conversationId}`);
    await opsAlert("Pesan baru dari pembeli", {
      dari: customerName,
      topik: c.subject,
      pesan: preview.slice(0, 200),
      link,
    });
    const to = emailEnv().ADMIN_NOTIFY_EMAIL;
    if (to) {
      await sendEmail({
        to,
        tag: "admin_message",
        ...adminNewMessageEmail({ customerName, subject: c.subject, preview, url: link }),
      });
    }
  });
}

/** Pesanan lunas dibatalkan → email pembeli (minta rekening bila belum diisi). */
export function notifyOrderCancelled(orderId: string, byAdmin: boolean) {
  return safely("order_cancelled", async () => {
    const admin = createAdminClient();
    const { data: o } = await admin
      .from("orders")
      .select("order_number, profile_id, refund:refunds (amount, status)")
      .eq("id", orderId)
      .single();
    const to = o ? await emailOf(o.profile_id) : null;
    if (!o || !o.refund || !to) return;
    await sendEmail({
      to,
      tag: "order_cancelled",
      ...orderCancelledEmail({
        orderNumber: o.order_number,
        amount: o.refund.amount,
        byAdmin,
        needsAccount: o.refund.status === "awaiting_account",
        url: url(`/account/orders/${encodeURIComponent(o.order_number)}`),
      }),
    });
  });
}

/** Refund selesai → email pembeli. */
export function notifyRefundCompleted(orderId: string) {
  return safely("refund_completed", async () => {
    const { data: o } = await createAdminClient()
      .from("orders")
      .select("order_number, profile_id, refund:refunds (amount)")
      .eq("id", orderId)
      .single();
    const to = o ? await emailOf(o.profile_id) : null;
    if (!o || !o.refund || !to) return;
    await sendEmail({
      to,
      tag: "refund_completed",
      ...refundCompletedEmail({
        orderNumber: o.order_number,
        amount: o.refund.amount,
        url: url(`/account/orders/${encodeURIComponent(o.order_number)}`),
      }),
    });
  });
}

/** Admin membalas ulasan pembeli → email pengulas (ulasan impor dilewati). */
export function notifyReviewReply(reviewId: string, reply: string) {
  return safely("review_reply", async () => {
    const { data: r } = await createAdminClient()
      .from("reviews")
      .select("profile_id, products:review_products (product:products (name, slug))")
      .eq("id", reviewId)
      .single();
    const product = r?.products[0]?.product;
    const to = r?.profile_id ? await emailOf(r.profile_id) : null;
    if (!r || !product || !to) return;
    await sendEmail({
      to,
      tag: "review_reply",
      ...reviewReplyEmail({
        productName: product.name,
        reply,
        url: url(`/products/${product.slug}#ulasan`),
      }),
    });
  });
}

/** Admin menjawab pertanyaan produk → email penanya (bukan bila admin bertanya sendiri). */
export function notifyCommentReply(parentCommentId: string, reply: string) {
  return safely("comment_reply", async () => {
    const { data: c } = await createAdminClient()
      .from("product_comments")
      .select(
        "profile_id, author:profiles!product_comments_profile_id_fkey (role), product:products (name, slug)",
      )
      .eq("id", parentCommentId)
      .single();
    if (!c?.profile_id || !c.product || c.author?.role === "admin") return;
    const to = await emailOf(c.profile_id);
    if (!to) return;
    await sendEmail({
      to,
      tag: "comment_reply",
      ...commentReplyEmail({
        productName: c.product.name,
        reply,
        url: url(`/products/${c.product.slug}#komentar`),
      }),
    });
  });
}
