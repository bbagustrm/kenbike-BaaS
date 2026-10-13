import { after } from "next/server";

import { applyMidtransTransaction } from "@/features/fulfillment/midtrans";
import { createShipmentForOrder } from "@/features/fulfillment/shipment";
import { midtransEnv } from "@/lib/env/server";
import { verifyMidtransSignature } from "@/lib/midtrans/signature";
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
    return Response.json({ error: "invalid signature" }, { status: 401 });
  }

  try {
    const result = await applyMidtransTransaction(tx);
    if (result.outcome === "paid" && result.needsShipment) {
      // Pengiriman dibuat setelah respons terkirim — webhook tetap cepat.
      after(() =>
        createShipmentForOrder(result.orderId).catch((error) =>
          console.error("[webhook:midtrans] shipment", error),
        ),
      );
    }
    return Response.json({ ok: true, outcome: result.outcome });
  } catch (error) {
    console.error("[webhook:midtrans]", tx.order_id, error);
    return Response.json({ error: "temporary failure" }, { status: 500 });
  }
}
