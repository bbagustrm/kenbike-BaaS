import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

export type PaymentStatus = Database["public"]["Enums"]["payment_status"];

export type OrderPaymentView = {
  orderNumber: string;
  paymentStatus: PaymentStatus;
  subtotal: number;
  shippingCost: number;
  total: number;
  courier: string;
  expiresAt: string;
  createdAt: string;
  paidAt: string | null;
  items: { name: string; variantLabel: string | null; quantity: number; price: number }[];
  /** Attempt pembayaran terakhir (untuk info metode & batas waktu Snap). */
  attempt: { status: string; paymentType: string | null; expiresAt: string } | null;
};

/** Order milik user yang login (RLS) untuk halaman status pembayaran. Tanpa cache. */
export async function getMyOrderPayment(orderNumber: string): Promise<OrderPaymentView | null> {
  if (!/^[A-Z0-9-]{1,30}$/.test(orderNumber)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      `order_number, payment_status, subtotal, shipping_cost, total_amount, courier_code,
       courier_service, expires_at, created_at, paid_at,
       items:order_items (product_name_snapshot, variant_label_snapshot, quantity, price_at_purchase),
       payments (status, payment_type, expires_at, created_at)`,
    )
    .eq("order_number", orderNumber)
    .maybeSingle();
  if (error) throw new Error(`getMyOrderPayment: ${error.message}`);
  if (!data) return null;

  const attempt = [...data.payments].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  return {
    orderNumber: data.order_number,
    paymentStatus: data.payment_status,
    subtotal: data.subtotal,
    shippingCost: data.shipping_cost,
    total: data.total_amount,
    courier: `${data.courier_code.toUpperCase()} ${data.courier_service.toUpperCase()}`,
    expiresAt: data.expires_at,
    createdAt: data.created_at,
    paidAt: data.paid_at,
    items: data.items.map((i) => ({
      name: i.product_name_snapshot,
      variantLabel: i.variant_label_snapshot,
      quantity: i.quantity,
      price: i.price_at_purchase,
    })),
    attempt: attempt
      ? { status: attempt.status, paymentType: attempt.payment_type, expiresAt: attempt.expires_at }
      : null,
  };
}
