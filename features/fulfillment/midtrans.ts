import "server-only";

import { mapMidtransStatus, paymentChannel } from "@/lib/midtrans/mapping";
import { log } from "@/lib/log";
import type { MidtransTransaction } from "@/lib/midtrans/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { opsAlert } from "@/lib/ops-alert";
import type { Database, Json } from "@/types/database.types";

type AttemptStatus = Database["public"]["Enums"]["payment_attempt_status"];

export type MidtransOutcome =
  | { outcome: "ignored"; reason: string }
  | { outcome: "duplicate" }
  | { outcome: "amount_mismatch"; orderId: string }
  | { outcome: "updated"; orderId: string }
  /** Order baru saja lunas → buat pengiriman (lihat createShipmentForOrder). */
  | { outcome: "paid"; orderId: string; needsShipment: boolean };

/** Status final attempt: notifikasi yang datang terlambat tidak boleh menurunkannya. */
const FINAL: ReadonlySet<AttemptStatus> = new Set(["settlement", "capture", "refund"]);

/**
 * Terapkan satu transaksi Midtrans (dari webhook ATAU Status API) ke DB.
 * Pemanggil webhook wajib sudah memverifikasi signature. Idempoten:
 * event yang sama dicatat sekali di order_status_history (source, event_key).
 * Alur: docs/PRD.md §3.6 langkah 6 & §3.4 (bayar telat).
 */
export async function applyMidtransTransaction(tx: MidtransTransaction): Promise<MidtransOutcome> {
  const admin = createAdminClient();

  const { data: payment, error } = await admin
    .from("payments")
    .select("id, order_id, amount, status")
    .eq("gateway_order_id", tx.order_id)
    .maybeSingle();
  if (error) throw new Error(`payments: ${error.message}`);
  if (!payment) return { outcome: "ignored", reason: "unknown order_id" };

  const mapping = mapMidtransStatus(tx.transaction_status, tx.fraud_status);
  if (!mapping) return { outcome: "ignored", reason: `status ${tx.transaction_status}` };

  // Idempotensi: kunci unik (source, event_key). Duplikat → tidak ada efek.
  const eventKey = [
    tx.transaction_id ?? tx.order_id,
    tx.transaction_status,
    tx.status_code,
    tx.settlement_time ?? "",
  ]
    .join(":")
    .slice(0, 150);
  const { data: inserted, error: historyError } = await admin
    .from("order_status_history")
    .upsert(
      {
        order_id: payment.order_id,
        status_type: "payment",
        status_value: tx.transaction_status.slice(0, 30),
        source: "midtrans",
        event_key: eventKey,
        raw_payload: tx as unknown as Json,
      },
      { onConflict: "source,event_key", ignoreDuplicates: true },
    )
    .select("id");
  if (historyError) throw new Error(`order_status_history: ${historyError.message}`);
  if (!inserted || inserted.length === 0) return { outcome: "duplicate" };

  // Nominal harus sama persis dengan attempt yang kita buat.
  if (Math.round(Number(tx.gross_amount)) !== payment.amount) {
    await flagAttention(payment.order_id, "amount_mismatch");
    log("error", "payment.amount_mismatch", {
      gatewayOrderId: tx.order_id,
      received: tx.gross_amount,
      expected: payment.amount,
    });
    return { outcome: "amount_mismatch", orderId: payment.order_id };
  }

  if (!(FINAL.has(payment.status) && !FINAL.has(mapping.attempt))) {
    const { error: updateError } = await admin
      .from("payments")
      .update({
        status: mapping.attempt,
        gateway_transaction_id: tx.transaction_id ?? null,
        payment_type: tx.payment_type?.slice(0, 30) ?? null,
        payment_channel: paymentChannel(tx),
        raw_response: tx as unknown as Json,
      })
      .eq("id", payment.id);
    if (updateError) throw new Error(`payments(update): ${updateError.message}`);
  }

  if (mapping.order === "paid") {
    // Attempt lain sudah lunas → pembayaran dobel, perlu refund manual.
    const { count } = await admin
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("order_id", payment.order_id)
      .in("status", ["settlement", "capture"])
      .neq("id", payment.id);
    if ((count ?? 0) > 0) {
      await flagAttention(payment.order_id, "duplicate_payment");
      return { outcome: "updated", orderId: payment.order_id };
    }

    const { data: order, error: confirmError } = await admin.rpc("confirm_payment", {
      p_order_id: payment.order_id,
    });
    if (confirmError) throw new Error(`confirm_payment: ${confirmError.message}`);
    await admin.from("order_status_history").upsert(
      {
        order_id: payment.order_id,
        status_type: "payment",
        status_value: "paid",
        source: "system",
        event_key: `paid:${payment.order_id}`,
      },
      { onConflict: "source,event_key", ignoreDuplicates: true },
    );
    return {
      outcome: "paid",
      orderId: payment.order_id,
      // Bayar telat tanpa stok → admin memutuskan (refund), jangan kirim.
      needsShipment: order.attention_reason !== "late_payment_out_of_stock",
    };
  }

  if (mapping.order === "refunded") {
    // Refund dari dashboard Midtrans (kartu/e-wallet): order lunas atau yang
    // sudah dibatalkan (menunggu refund) → selesai, termasuk catatan refund-nya.
    await admin
      .from("orders")
      .update({ payment_status: "refunded" })
      .eq("id", payment.order_id)
      .in("payment_status", ["paid", "refund_pending"]);
    await admin
      .from("refunds")
      .update({
        status: "completed",
        processed_at: new Date().toISOString(),
        note: "Refund diproses lewat Midtrans",
      })
      .eq("order_id", payment.order_id)
      .neq("status", "completed");
  }

  return { outcome: "updated", orderId: payment.order_id };
}

/** Tandai order "perlu tindakan" tanpa menimpa alasan yang sudah ada. */
export async function flagAttention(
  orderId: string,
  reason: Database["public"]["Enums"]["attention_reason"],
) {
  const { data } = await createAdminClient()
    .from("orders")
    .update({ attention_reason: reason })
    .eq("id", orderId)
    .is("attention_reason", null)
    .select("order_number")
    .maybeSingle();
  // Hanya saat tanda baru dipasang (bukan bila sudah ada alasan lain).
  if (data) await opsAlert("Pesanan perlu tindakan", { order: data.order_number, reason });
}
