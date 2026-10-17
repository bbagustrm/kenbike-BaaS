import "server-only";

import type { ActionState } from "@/lib/action-state";
import { BiteshipError, cancelOrder as cancelBiteshipOrder } from "@/lib/biteship/client";
import { dbErrorMessage } from "@/lib/db-errors";
import { errorMessage, log } from "@/lib/log";
import { createClient } from "@/lib/supabase/server";

import { isCancellable } from "./schemas";

/**
 * Batalkan pesanan lunas sebagai pengguna yang login (pembeli pemilik atau
 * admin): order Biteship dibatalkan lebih dulu, lalu RPC cancel_paid_order
 * (stok kembali, refund dibuat). Order dibaca lewat session → RLS memastikan
 * pembeli tidak bisa membatalkan Biteship milik orang lain.
 */
export async function cancelPaidOrder(params: {
  orderId: string;
  reason: string;
  restock: boolean;
  actor: "customer" | "admin";
}): Promise<ActionState & { amount?: number }> {
  const supabase = await createClient();
  const { data: order, error } = await supabase
    .from("orders")
    .select(
      "id, order_number, payment_status, shipping_status, shipment:shipments (biteship_order_id)",
    )
    .eq("id", params.orderId)
    .maybeSingle();
  if (error) return { status: "error", message: dbErrorMessage(error) };
  if (!order) return { status: "error", message: "Pesanan tidak ditemukan." };
  if (!isCancellable(order.payment_status, order.shipping_status)) {
    return {
      status: "error",
      message:
        "Pesanan ini sudah tidak bisa dibatalkan (paket sudah diambil kurir atau sudah dibatalkan).",
    };
  }

  const biteshipOrderId = order.shipment?.biteship_order_id;
  if (biteshipOrderId) {
    try {
      await cancelBiteshipOrder(
        biteshipOrderId,
        params.actor === "admin" ? "Dibatalkan admin KenBike" : "Dibatalkan pembeli",
      );
    } catch (cause) {
      log("warn", "refund.biteship_cancel_failed", {
        orderNumber: order.order_number,
        message: errorMessage(cause),
      });
      return {
        status: "error",
        message:
          cause instanceof BiteshipError
            ? `Pengiriman tidak bisa dibatalkan: ${cause.message}`
            : "Gagal membatalkan pengiriman. Coba lagi.",
      };
    }
  }

  const { data: cancelled, error: rpcError } = await supabase.rpc("cancel_paid_order", {
    p_order_id: order.id,
    p_reason: params.reason,
    p_restock: params.restock,
  });
  if (rpcError) {
    log("error", "refund.cancel_failed", {
      orderNumber: order.order_number,
      biteshipCancelled: Boolean(biteshipOrderId),
      message: rpcError.message,
    });
    return { status: "error", message: dbErrorMessage(rpcError) };
  }

  log("info", "refund.order_cancelled", { orderNumber: order.order_number, actor: params.actor });
  return {
    status: "success",
    message: "Pesanan dibatalkan. Refund menunggu diproses.",
    amount: cancelled.total_amount,
  };
}
