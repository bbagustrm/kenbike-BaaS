import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

import {
  buildTimeline,
  ORDER_FILTER_QUERY,
  type OrderFilter,
  type TimelineEntry,
} from "@/lib/order-status";

type PaymentStatus = Database["public"]["Enums"]["payment_status"];
type ShippingStatus = Database["public"]["Enums"]["shipping_status"];

export const ORDERS_PAGE_SIZE = 10;

export type OrderListItem = {
  orderNumber: string;
  createdAt: string;
  total: number;
  paymentStatus: PaymentStatus;
  shippingStatus: ShippingStatus | null;
  itemCount: number;
  firstItem: { name: string; imagePath: string | null } | null;
};

/** Riwayat order milik user yang login (RLS), terbaru dulu. Tanpa cache. */
export async function listMyOrders(params: { filter?: OrderFilter; page: number }) {
  const supabase = await createClient();
  let query = supabase.from("orders").select(
    `order_number, created_at, total_amount, payment_status, shipping_status,
     items:order_items (quantity, product_name_snapshot, image_url_snapshot, created_at)`,
    { count: "exact" },
  );
  if (params.filter) query = query.or(ORDER_FILTER_QUERY[params.filter]);

  const from = (params.page - 1) * ORDERS_PAGE_SIZE;
  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, from + ORDERS_PAGE_SIZE - 1);
  if (error?.code === "PGRST103") return { orders: [], total: count ?? 0, pageCount: 0 };
  if (error) throw new Error(`listMyOrders: ${error.message}`);

  const orders: OrderListItem[] = data.map((o) => {
    const first = [...o.items].sort((a, b) => a.created_at.localeCompare(b.created_at))[0];
    return {
      orderNumber: o.order_number,
      createdAt: o.created_at,
      total: o.total_amount,
      paymentStatus: o.payment_status,
      shippingStatus: o.shipping_status,
      itemCount: o.items.reduce((sum, i) => sum + i.quantity, 0),
      firstItem: first
        ? { name: first.product_name_snapshot, imagePath: first.image_url_snapshot }
        : null,
    };
  });
  const total = count ?? 0;
  return { orders, total, pageCount: Math.ceil(total / ORDERS_PAGE_SIZE) };
}

export type AddressSnapshot = {
  recipient_name: string;
  phone: string;
  address_line: string;
  district?: string | null;
  city: string;
  province: string;
  postal_code: string;
  note?: string | null;
};

export type OrderDetail = {
  id: string;
  orderNumber: string;
  createdAt: string;
  paidAt: string | null;
  expiresAt: string;
  paymentStatus: PaymentStatus;
  shippingStatus: ShippingStatus | null;
  subtotal: number;
  shippingCost: number;
  total: number;
  note: string | null;
  courier: { code: string; service: string };
  address: AddressSnapshot;
  items: {
    id: string;
    /** null bila produknya sudah dihapus permanen (data diambil dari snapshot). */
    variantId: string | null;
    name: string;
    variantLabel: string | null;
    imagePath: string | null;
    quantity: number;
    price: number;
    preorderDays: number | null;
  }[];
  /** Attempt pembayaran terakhir. */
  payment: {
    status: string;
    type: string | null;
    channel: string | null;
    expiresAt: string;
  } | null;
  shipment: {
    waybillId: string | null;
    trackingUrl: string | null;
    deliveredAt: string | null;
  } | null;
  timeline: TimelineEntry[];
};

/** Detail order milik user yang login (RLS). Null bila bukan miliknya / tidak ada. */
export async function getMyOrder(orderNumber: string): Promise<OrderDetail | null> {
  if (!/^[A-Z0-9-]{1,30}$/.test(orderNumber)) return null;
  const supabase = await createClient();
  const { data: o, error } = await supabase
    .from("orders")
    .select(
      `id, order_number, created_at, paid_at, expires_at, payment_status, shipping_status,
       subtotal, shipping_cost, total_amount, customer_note, courier_code, courier_service,
       shipping_address_snapshot,
       items:order_items (id, variant_id, product_name_snapshot, variant_label_snapshot,
         image_url_snapshot, quantity, price_at_purchase, preorder_days_snapshot, created_at),
       payments (status, payment_type, payment_channel, expires_at, created_at),
       shipment:shipments (waybill_id, tracking_url, actual_delivery_date),
       history:order_status_history (status_type, status_value, source, created_at)`,
    )
    .eq("order_number", orderNumber)
    .maybeSingle();
  if (error) throw new Error(`getMyOrder: ${error.message}`);
  if (!o) return null;

  const payment = [...o.payments].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  return {
    id: o.id,
    orderNumber: o.order_number,
    createdAt: o.created_at,
    paidAt: o.paid_at,
    expiresAt: o.expires_at,
    paymentStatus: o.payment_status,
    shippingStatus: o.shipping_status,
    subtotal: o.subtotal,
    shippingCost: o.shipping_cost,
    total: o.total_amount,
    note: o.customer_note,
    courier: { code: o.courier_code, service: o.courier_service },
    address: o.shipping_address_snapshot as unknown as AddressSnapshot,
    items: [...o.items]
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((i) => ({
        id: i.id,
        variantId: i.variant_id,
        name: i.product_name_snapshot,
        variantLabel: i.variant_label_snapshot,
        imagePath: i.image_url_snapshot,
        quantity: i.quantity,
        price: i.price_at_purchase,
        preorderDays: i.preorder_days_snapshot,
      })),
    payment: payment
      ? {
          status: payment.status,
          type: payment.payment_type,
          channel: payment.payment_channel,
          expiresAt: payment.expires_at,
        }
      : null,
    shipment: o.shipment
      ? {
          waybillId: o.shipment.waybill_id,
          trackingUrl: o.shipment.tracking_url,
          deliveredAt: o.shipment.actual_delivery_date,
        }
      : null,
    timeline: buildTimeline(o.history),
  };
}
