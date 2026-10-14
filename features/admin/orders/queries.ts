import "server-only";

import { escapeLike } from "@/lib/search";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/types/database.types";

import { ADMIN_ORDER_FILTER_QUERY, type AdminOrderListParams, wibDayStart } from "./filters";

type PaymentStatus = Database["public"]["Enums"]["payment_status"];
type ShippingStatus = Database["public"]["Enums"]["shipping_status"];
type AttentionReason = Database["public"]["Enums"]["attention_reason"];

export const ADMIN_ORDERS_PAGE_SIZE = 20;

export type AdminOrderRow = {
  id: string;
  orderNumber: string;
  createdAt: string;
  customerName: string;
  total: number;
  paymentStatus: PaymentStatus;
  shippingStatus: ShippingStatus | null;
  courier: string;
  attentionReason: AttentionReason | null;
};

const DAY_MS = 86_400_000;

/** Daftar order untuk admin (RLS admin membaca semua). Tanpa cache. */
export async function listAdminOrders(params: AdminOrderListParams) {
  const supabase = await createClient();
  let query = supabase.from("orders").select(
    `id, order_number, created_at, total_amount, payment_status, shipping_status,
     courier_code, courier_service, attention_reason, shipping_address_snapshot,
     customer:profiles (full_name)`,
    { count: "exact" },
  );

  if (params.filter === "attention") query = query.not("attention_reason", "is", null);
  else if (params.filter) query = query.or(ADMIN_ORDER_FILTER_QUERY[params.filter]);

  if (params.q) {
    const q = escapeLike(params.q);
    // Nomor order atau nama penerima (snapshot alamat). Pencarian email lewat menu Pengguna.
    query = query.or(
      `order_number.ilike.%${q}%,shipping_address_snapshot->>recipient_name.ilike.%${q}%`,
    );
  }
  if (params.from) query = query.gte("created_at", wibDayStart(params.from));
  if (params.to) {
    const end = new Date(new Date(wibDayStart(params.to)).getTime() + DAY_MS).toISOString();
    query = query.lt("created_at", end);
  }

  const from = (params.page - 1) * ADMIN_ORDERS_PAGE_SIZE;
  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, from + ADMIN_ORDERS_PAGE_SIZE - 1);
  if (error?.code === "PGRST103") return { rows: [], total: count ?? 0, pageCount: 0 };
  if (error) throw new Error(`listAdminOrders: ${error.message}`);

  const rows: AdminOrderRow[] = data.map((o) => {
    const snapshot = o.shipping_address_snapshot as { recipient_name?: string } | null;
    return {
      id: o.id,
      orderNumber: o.order_number,
      createdAt: o.created_at,
      customerName: o.customer?.full_name ?? snapshot?.recipient_name ?? "—",
      total: o.total_amount,
      paymentStatus: o.payment_status,
      shippingStatus: o.shipping_status,
      courier: `${o.courier_code.toUpperCase()} ${o.courier_service.toUpperCase()}`,
      attentionReason: o.attention_reason,
    };
  });
  const total = count ?? 0;
  return { rows, total, pageCount: Math.ceil(total / ADMIN_ORDERS_PAGE_SIZE) };
}

type AddressSnapshot = {
  recipient_name: string;
  phone: string;
  address_line: string;
  district?: string | null;
  city: string;
  province: string;
  postal_code: string;
  note?: string | null;
};

export type AdminOrderDetail = {
  id: string;
  orderNumber: string;
  createdAt: string;
  paidAt: string | null;
  expiresAt: string;
  paymentStatus: PaymentStatus;
  shippingStatus: ShippingStatus | null;
  attentionReason: AttentionReason | null;
  subtotal: number;
  shippingCost: number;
  total: number;
  courier: { code: string; service: string };
  customerNote: string | null;
  customer: { id: string; name: string | null; email: string | null; phone: string | null };
  address: AddressSnapshot;
  items: {
    sku: string | null;
    name: string;
    variantLabel: string | null;
    imagePath: string | null;
    quantity: number;
    price: number;
    weightGram: number;
  }[];
  payments: {
    gatewayOrderId: string;
    status: string;
    type: string | null;
    channel: string | null;
    amount: number;
    createdAt: string;
    expiresAt: string;
    raw: Json | null;
  }[];
  shipment: {
    biteshipOrderId: string | null;
    waybillId: string | null;
    trackingUrl: string | null;
    deliveredAt: string | null;
  } | null;
  history: {
    type: string;
    value: string;
    source: string;
    createdAt: string;
    raw: Json | null;
  }[];
  notes: { id: string; note: string; adminName: string | null; createdAt: string }[];
};

/**
 * Detail order untuk admin. Kolom mentah (payments.raw_response,
 * order_status_history.raw_payload) tidak dibuka lewat RLS → service role.
 * Pemanggil WAJIB sudah memastikan admin (layout admin / assertAdminAction).
 */
export async function getAdminOrder(orderNumber: string): Promise<AdminOrderDetail | null> {
  if (!/^[A-Z0-9-]{1,30}$/.test(orderNumber)) return null;
  const admin = createAdminClient();
  const { data: o, error } = await admin
    .from("orders")
    .select(
      `id, order_number, created_at, paid_at, expires_at, payment_status, shipping_status,
       attention_reason, subtotal, shipping_cost, total_amount, courier_code, courier_service,
       customer_note, shipping_address_snapshot, profile_id,
       customer:profiles (full_name, phone),
       items:order_items (quantity, price_at_purchase, product_name_snapshot,
         variant_label_snapshot, image_url_snapshot, weight_gram_snapshot, created_at,
         variant:product_variants (sku)),
       payments (gateway_order_id, status, payment_type, payment_channel, amount, created_at,
         expires_at, raw_response),
       shipment:shipments (biteship_order_id, waybill_id, tracking_url, actual_delivery_date),
       history:order_status_history (status_type, status_value, source, created_at, raw_payload),
       notes:order_internal_notes (id, note, created_at, admin:profiles (full_name))`,
    )
    .eq("order_number", orderNumber)
    .maybeSingle();
  if (error) throw new Error(`getAdminOrder: ${error.message}`);
  if (!o) return null;

  const { data: user } = await admin.auth.admin.getUserById(o.profile_id);
  const byTime = <T extends { created_at: string }>(a: T, b: T) =>
    a.created_at.localeCompare(b.created_at);

  return {
    id: o.id,
    orderNumber: o.order_number,
    createdAt: o.created_at,
    paidAt: o.paid_at,
    expiresAt: o.expires_at,
    paymentStatus: o.payment_status,
    shippingStatus: o.shipping_status,
    attentionReason: o.attention_reason,
    subtotal: o.subtotal,
    shippingCost: o.shipping_cost,
    total: o.total_amount,
    courier: { code: o.courier_code, service: o.courier_service },
    customerNote: o.customer_note,
    customer: {
      id: o.profile_id,
      name: o.customer?.full_name ?? null,
      email: user.user?.email ?? null,
      phone: o.customer?.phone ?? null,
    },
    address: o.shipping_address_snapshot as unknown as AddressSnapshot,
    items: [...o.items].sort(byTime).map((i) => ({
      sku: i.variant?.sku ?? null,
      name: i.product_name_snapshot,
      variantLabel: i.variant_label_snapshot,
      imagePath: i.image_url_snapshot,
      quantity: i.quantity,
      price: i.price_at_purchase,
      weightGram: i.weight_gram_snapshot,
    })),
    payments: [...o.payments].sort(byTime).map((p) => ({
      gatewayOrderId: p.gateway_order_id,
      status: p.status,
      type: p.payment_type,
      channel: p.payment_channel,
      amount: p.amount,
      createdAt: p.created_at,
      expiresAt: p.expires_at,
      raw: p.raw_response,
    })),
    shipment: o.shipment
      ? {
          biteshipOrderId: o.shipment.biteship_order_id,
          waybillId: o.shipment.waybill_id,
          trackingUrl: o.shipment.tracking_url,
          deliveredAt: o.shipment.actual_delivery_date,
        }
      : null,
    history: [...o.history].sort(byTime).map((h) => ({
      type: h.status_type,
      value: h.status_value,
      source: h.source,
      createdAt: h.created_at,
      raw: h.raw_payload,
    })),
    notes: [...o.notes].sort(byTime).map((n) => ({
      id: n.id,
      note: n.note,
      adminName: n.admin?.full_name ?? null,
      createdAt: n.created_at,
    })),
  };
}
