import "server-only";

import { BiteshipError, createOrder } from "@/lib/biteship/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { log } from "@/lib/log";
import type { Json } from "@/types/database.types";

import { flagAttention } from "./midtrans";

type Snapshot = {
  recipient_name: string;
  phone: string;
  address_line: string;
  district?: string | null;
  city: string;
  province: string;
  postal_code: string;
  biteship_area_id: string | null;
  note?: string | null;
};

export type ShipmentResult =
  { ok: true; biteshipOrderId: string; created: boolean } | { ok: false; message: string };

/**
 * Buat order pengiriman Biteship untuk order yang sudah lunas (docs/PRD.md §3.6
 * langkah 6). Idempoten: baris `shipments` (unik per order) dibuat dulu sebagai
 * klaim; bila sudah punya biteship_order_id, tidak membuat order ganda.
 * Gagal → `attention_reason = shipment_create_failed` (admin retry, M9).
 * Dipanggil dari webhook via after() dan dari aksi admin.
 */
export async function createShipmentForOrder(orderId: string): Promise<ShipmentResult> {
  const admin = createAdminClient();
  const [{ data: order, error }, { data: store, error: storeError }] = await Promise.all([
    admin
      .from("orders")
      .select(
        `id, order_number, payment_status, attention_reason, courier_code, courier_service,
         shipping_address_snapshot,
         items:order_items (quantity, price_at_purchase, weight_gram_snapshot, product_name_snapshot,
           variant:product_variants (length_cm, width_cm, height_cm))`,
      )
      .eq("id", orderId)
      .maybeSingle(),
    admin
      .from("store_settings")
      .select(
        "store_name, contact_name, phone, address_line, city, province, postal_code, biteship_area_id, note",
      )
      .eq("is_active", true)
      .maybeSingle(),
  ]);
  if (error) throw new Error(`createShipmentForOrder(order): ${error.message}`);
  if (storeError) throw new Error(`createShipmentForOrder(store): ${storeError.message}`);
  if (!order) return { ok: false, message: "Pesanan tidak ditemukan." };
  if (order.payment_status !== "paid") return { ok: false, message: "Pesanan belum lunas." };
  if (order.attention_reason === "late_payment_out_of_stock") {
    return { ok: false, message: "Stok tidak cukup untuk pesanan bayar-telat. Putuskan refund." };
  }

  const fail = async (message: string): Promise<ShipmentResult> => {
    await flagAttention(order.id, "shipment_create_failed");
    return { ok: false, message };
  };
  if (!store) return fail("Alamat toko belum diatur.");

  const destination = order.shipping_address_snapshot as unknown as Snapshot;
  if (!destination?.biteship_area_id) return fail("Alamat tujuan tidak punya area Biteship.");

  const origin = {
    store_name: store.store_name,
    contact_name: store.contact_name,
    phone: store.phone,
    address_line: store.address_line,
    city: store.city,
    province: store.province,
    postal_code: store.postal_code,
    biteship_area_id: store.biteship_area_id,
  };

  // Klaim: insert baris shipments (unik per order). Bila sudah ada → cek status.
  const { error: claimError } = await admin.from("shipments").insert({
    order_id: order.id,
    courier_code: order.courier_code,
    courier_service: order.courier_service,
    origin_address_snapshot: origin as unknown as Json,
    destination_address_snapshot: destination as unknown as Json,
  });
  if (claimError && claimError.code !== "23505") {
    throw new Error(`shipments(claim): ${claimError.message}`);
  }
  if (claimError) {
    const { data: existing } = await admin
      .from("shipments")
      .select("biteship_order_id")
      .eq("order_id", order.id)
      .single();
    if (existing?.biteship_order_id) {
      return { ok: true, biteshipOrderId: existing.biteship_order_id, created: false };
    }
  }

  let shipment;
  try {
    shipment = await createOrder({
      referenceId: order.order_number,
      shipper: { name: store.store_name, phone: store.phone },
      origin: {
        contactName: store.contact_name,
        phone: store.phone,
        address: `${store.address_line}, ${store.city}, ${store.province} ${store.postal_code}`,
        areaId: store.biteship_area_id,
        note: store.note ?? undefined,
      },
      destination: {
        contactName: destination.recipient_name,
        phone: destination.phone,
        address: [
          destination.address_line,
          destination.district,
          destination.city,
          destination.province,
          destination.postal_code,
        ]
          .filter(Boolean)
          .join(", "),
        areaId: destination.biteship_area_id,
        note: destination.note ?? undefined,
      },
      courierCompany: order.courier_code,
      courierType: order.courier_service,
      items: order.items.map((i) => ({
        name: i.product_name_snapshot.slice(0, 100),
        value: i.price_at_purchase,
        quantity: i.quantity,
        weight: Math.max(1, i.weight_gram_snapshot),
        length: Math.max(1, i.variant?.length_cm ?? 1),
        width: Math.max(1, i.variant?.width_cm ?? 1),
        height: Math.max(1, i.variant?.height_cm ?? 1),
      })),
    });
  } catch (createError) {
    log("error", "shipment.create_failed", {
      orderNumber: order.order_number,
      message: createError instanceof Error ? createError.message : String(createError),
    });
    return fail(
      createError instanceof BiteshipError ? createError.message : "Gagal membuat pengiriman.",
    );
  }

  const { error: updateError } = await admin
    .from("shipments")
    .update({
      biteship_order_id: shipment.id,
      waybill_id: shipment.waybillId,
      tracking_id: shipment.trackingId,
      tracking_url: shipment.trackingUrl?.startsWith("https://") ? shipment.trackingUrl : null,
    })
    .eq("order_id", order.id);
  if (updateError) throw new Error(`shipments(update): ${updateError.message}`);

  await admin
    .from("orders")
    .update({ shipping_status: "processing" })
    .eq("id", order.id)
    .in("shipping_status", ["pending"]);
  // Retry berhasil → hapus tanda "perlu tindakan" pengiriman.
  await admin
    .from("orders")
    .update({ attention_reason: null })
    .eq("id", order.id)
    .eq("attention_reason", "shipment_create_failed");
  await admin.from("order_status_history").upsert(
    {
      order_id: order.id,
      status_type: "shipping",
      status_value: "processing",
      source: "system",
      event_key: `shipment_created:${order.id}`,
    },
    { onConflict: "source,event_key", ignoreDuplicates: true },
  );

  return { ok: true, biteshipOrderId: shipment.id, created: true };
}
