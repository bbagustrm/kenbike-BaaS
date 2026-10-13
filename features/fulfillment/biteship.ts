import "server-only";

import { canAdvanceShipping, mapBiteshipStatus } from "@/lib/biteship/mapping";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database.types";

/** Payload webhook Biteship (event order.status / order.waybill_id / order.price). */
export type BiteshipEvent = {
  event?: string;
  order_id?: string;
  status?: string;
  courier_waybill_id?: string | null;
  courier_tracking_id?: string | null;
  updated_at?: string;
};

export type BiteshipOutcome = "ignored" | "duplicate" | "updated";

/**
 * Terapkan event webhook Biteship: perbarui resi & status pengiriman.
 * Idempoten (order_status_history) dan hanya maju (event mundur diabaikan).
 */
export async function applyBiteshipEvent(event: BiteshipEvent): Promise<BiteshipOutcome> {
  if (!event.order_id) return "ignored";
  const admin = createAdminClient();

  const { data: shipment, error } = await admin
    .from("shipments")
    .select("id, order_id, waybill_id, order:orders (shipping_status)")
    .eq("biteship_order_id", event.order_id)
    .maybeSingle();
  if (error) throw new Error(`shipments: ${error.message}`);
  if (!shipment) return "ignored";

  const status = event.status ? mapBiteshipStatus(event.status) : null;
  const eventKey = [
    event.order_id,
    event.event ?? "event",
    event.status ?? "",
    event.courier_waybill_id ?? "",
    event.updated_at ?? "",
  ]
    .join(":")
    .slice(0, 150);
  const { data: inserted, error: historyError } = await admin
    .from("order_status_history")
    .upsert(
      {
        order_id: shipment.order_id,
        status_type: "shipping",
        status_value: (event.status ?? event.event ?? "event").slice(0, 30),
        source: "biteship",
        event_key: eventKey,
        raw_payload: event as unknown as Json,
      },
      { onConflict: "source,event_key", ignoreDuplicates: true },
    )
    .select("id");
  if (historyError) throw new Error(`order_status_history: ${historyError.message}`);
  if (!inserted || inserted.length === 0) return "duplicate";

  if (event.courier_waybill_id && event.courier_waybill_id !== shipment.waybill_id) {
    await admin
      .from("shipments")
      .update({ waybill_id: event.courier_waybill_id.slice(0, 100) })
      .eq("id", shipment.id);
  }

  const current = shipment.order?.shipping_status ?? null;
  if (status && canAdvanceShipping(current, status)) {
    await admin.from("orders").update({ shipping_status: status }).eq("id", shipment.order_id);
    if (status === "delivered") {
      await admin
        .from("shipments")
        .update({ actual_delivery_date: new Date().toISOString() })
        .eq("id", shipment.id);
    }
  }
  return "updated";
}
