import { after } from "next/server";

import { applyMidtransTransaction } from "@/features/fulfillment/midtrans";
import { createShipmentForOrder } from "@/features/fulfillment/shipment";
import { midtransEnv } from "@/lib/env/server";
import { errorMessage, log } from "@/lib/log";
import { verifyMidtransSignature } from "@/lib/midtrans/signature";
import { opsAlert } from "@/lib/ops-alert";
import type { MidtransTransaction } from "@/lib/midtrans/types";

/**
 * Notifikasi pembayaran Midtrans (HTTP notification URL di dashboard Midtrans).
 * Sumber kebenaran status pembayaran. Selalu 2xx untuk event yang sudah
 * diproses/diabaikan; 5xx hanya bila gagal sementara agar Midtrans mengulang.
 */
export async function POST(request: Request) {
  let tx: MidtransTransaction;
  try {
    tx = (await request.json()) as MidtransTransaction;
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }

  if (!tx?.order_id || !verifyMidtransSignature(tx, midtransEnv().MIDTRANS_SERVER_KEY)) {
    log("warn", "webhook.midtrans_bad_signature", { gatewayOrderId: tx?.order_id ?? null });
    return Response.json({ error: "invalid signature" }, { status: 401 });
  }

  try {
    const result = await applyMidtransTransaction(tx);
    if (result.outcome === "paid" && result.needsShipment) {
      // Pengiriman dibuat setelah respons terkirim — webhook tetap cepat.
      after(() =>
        createShipmentForOrder(result.orderId).catch((error) =>
          log("error", "shipment.create_threw", {
            orderId: result.orderId,
            message: errorMessage(error),
          }),
        ),
      );
    }
    log("info", "webhook.midtrans", {
      gatewayOrderId: tx.order_id,
      status: tx.transaction_status,
      outcome: result.outcome,
    });
    return Response.json({ ok: true, outcome: result.outcome });
  } catch (error) {
    log("error", "webhook.midtrans_failed", {
      gatewayOrderId: tx.order_id,
      message: errorMessage(error),
    });
    await opsAlert("Webhook Midtrans gagal diproses", { order: tx.order_id });
    return Response.json({ error: "temporary failure" }, { status: 500 });
  }
}
