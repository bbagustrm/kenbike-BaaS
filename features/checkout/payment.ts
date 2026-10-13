import "server-only";

import { publicEnv } from "@/lib/env/public";
import {
  cancelTransaction,
  createSnapTransaction,
  getTransactionStatus,
  MidtransError,
} from "@/lib/midtrans/client";
import { buildSnapItems, paymentAttemptExpiry } from "@/lib/midtrans/mapping";
import { createAdminClient } from "@/lib/supabase/admin";

export type PaymentResult =
  | { ok: true; orderNumber: string; token: string }
  | { ok: false; orderNumber?: string; message: string };

export type PaymentCustomer = { name: string; email?: string; phone?: string };

/** Jangan pakai ulang token Snap yang sisa waktunya kurang dari ini. */
const REUSE_MIN_MS = 2 * 60_000;

/** Status Midtrans yang berarti uang sudah (atau sedang) masuk — jangan buat attempt baru. */
const SETTLED = new Set(["settlement", "capture"]);

/**
 * Batalkan attempt pending lama di Midtrans sebelum attempt baru dibuat
 * (cegah bayar dobel). `false` = transaksi ternyata sudah dibayar.
 */
async function cancelPendingAttempt(gatewayOrderId: string): Promise<boolean> {
  const result = await cancelTransaction(gatewayOrderId);
  if (result !== "not_cancellable") return true;
  const status = await getTransactionStatus(gatewayOrderId);
  return !status || !SETTLED.has(status.transaction_status);
}

/**
 * Siapkan pembayaran Snap untuk order `pending_payment` (docs/PRD.md §3.4, §3.6):
 * - `reuse`: buka ulang token attempt pending yang masih berlaku;
 * - selain itu attempt pending lama dibatalkan dulu, lalu attempt baru dibuat
 *   dengan expiry MIN(now + 23j45m, order.expires_at − 15m).
 * Semua penulisan `payments` memakai service role (customer hanya membaca).
 * Pemanggil WAJIB sudah memastikan order milik user yang login.
 */
export async function preparePayment(
  orderId: string,
  customer: PaymentCustomer,
  { reuse }: { reuse: boolean },
): Promise<PaymentResult> {
  const admin = createAdminClient();
  const { data: order, error } = await admin
    .from("orders")
    .select(
      `id, order_number, total_amount, shipping_cost, courier_code, courier_service, expires_at,
       payment_status, shipping_address_snapshot,
       items:order_items (variant_id, product_name_snapshot, variant_label_snapshot, price_at_purchase, quantity),
       payments (id, gateway_order_id, snap_token, status, expires_at)`,
    )
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw new Error(`preparePayment(order): ${error.message}`);
  if (!order) return { ok: false, message: "Pesanan tidak ditemukan." };

  const orderNumber = order.order_number;
  if (order.payment_status !== "pending_payment") {
    return { ok: false, orderNumber, message: "Pesanan ini tidak menunggu pembayaran." };
  }

  const now = new Date();
  const pending = order.payments.find((p) => p.status === "pending");
  if (pending) {
    const stillValid = new Date(pending.expires_at).getTime() - now.getTime() > REUSE_MIN_MS;
    if (reuse && pending.snap_token && stillValid) {
      return { ok: true, orderNumber, token: pending.snap_token };
    }
    if (!(await cancelPendingAttempt(pending.gateway_order_id))) {
      return {
        ok: false,
        orderNumber,
        message: "Pembayaran sebelumnya sudah diterima dan sedang diproses.",
      };
    }
    const { error: cancelError } = await admin
      .from("payments")
      .update({ status: "cancel" })
      .eq("id", pending.id)
      .eq("status", "pending");
    if (cancelError) throw new Error(`preparePayment(cancel): ${cancelError.message}`);
  }

  const expiry = paymentAttemptExpiry(now, new Date(order.expires_at));
  if (!expiry) {
    return {
      ok: false,
      orderNumber,
      message: "Waktu pembayaran pesanan ini hampir habis. Silakan buat pesanan baru.",
    };
  }

  const gatewayOrderId = `${orderNumber}-${order.payments.length + 1}`;
  const { data: attempt, error: insertError } = await admin
    .from("payments")
    .insert({
      order_id: order.id,
      gateway_order_id: gatewayOrderId,
      amount: order.total_amount,
      expires_at: expiry.expiresAt.toISOString(),
    })
    .select("id")
    .single();
  if (insertError) {
    // 23505: attempt pending lain dibuat bersamaan (double submit) → minta ulang.
    if (insertError.code === "23505") {
      return { ok: false, orderNumber, message: "Pembayaran sedang disiapkan. Coba lagi." };
    }
    throw new Error(`preparePayment(insert): ${insertError.message}`);
  }

  const address = order.shipping_address_snapshot as { phone?: string } | null;
  try {
    const { token } = await createSnapTransaction({
      gatewayOrderId,
      grossAmount: order.total_amount,
      items: buildSnapItems(
        order.items.map((i) => ({
          variantId: i.variant_id,
          name: i.product_name_snapshot,
          variantLabel: i.variant_label_snapshot,
          price: i.price_at_purchase,
          quantity: i.quantity,
        })),
        { courier: order.courier_code, service: order.courier_service, cost: order.shipping_cost },
        order.total_amount,
      ),
      customer: {
        firstName: customer.name,
        email: customer.email,
        phone: customer.phone ?? address?.phone,
      },
      expiry: { start: now, durationMinutes: expiry.durationMinutes },
      finishUrl: `${publicEnv.NEXT_PUBLIC_SITE_URL}/checkout/finish?order=${encodeURIComponent(orderNumber)}`,
    });
    await admin.from("payments").update({ snap_token: token }).eq("id", attempt.id);
    return { ok: true, orderNumber, token };
  } catch (snapError) {
    // Order & reservasi tetap; attempt ditandai gagal agar bisa dicoba lagi.
    await admin.from("payments").update({ status: "failure" }).eq("id", attempt.id);
    if (!(snapError instanceof MidtransError)) console.error("[preparePayment]", snapError);
    return {
      ok: false,
      orderNumber,
      message:
        snapError instanceof MidtransError
          ? snapError.message
          : "Gagal menyiapkan pembayaran. Coba lagi.",
    };
  }
}

/** Batalkan attempt Midtrans yang masih pending sebelum order dibatalkan. */
export async function cancelPendingPaymentFor(orderId: string): Promise<boolean> {
  const { data, error } = await createAdminClient()
    .from("payments")
    .select("gateway_order_id")
    .eq("order_id", orderId)
    .eq("status", "pending")
    .maybeSingle();
  if (error) throw new Error(`cancelPendingPaymentFor: ${error.message}`);
  return data ? cancelPendingAttempt(data.gateway_order_id) : true;
}
