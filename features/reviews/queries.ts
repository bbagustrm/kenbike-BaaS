import "server-only";

import { createClient } from "@/lib/supabase/server";

export type PendingReviewOrder = {
  orderId: string;
  orderNumber: string;
  deliveredAt: string | null;
  items: { name: string; variant: string | null; image: string | null; quantity: number }[];
};

function toItems(value: unknown): PendingReviewOrder["items"] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const i = (item ?? {}) as Record<string, unknown>;
    return {
      name: String(i.name ?? ""),
      variant: typeof i.variant === "string" ? i.variant : null,
      image: typeof i.image === "string" ? i.image : null,
      quantity: Number(i.quantity) || 1,
    };
  });
}

/**
 * Pesanan delivered milik pembeli yang belum diulas. `promptOnly` = abaikan
 * yang sudah ditutup lewat "Nanti" (untuk modal).
 */
export async function listPendingReviewOrders(promptOnly: boolean): Promise<PendingReviewOrder[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("pending_review_orders", {
    p_prompt_only: promptOnly,
  });
  if (error) throw new Error(`pending_review_orders: ${error.message}`);
  return data.map((row) => ({
    orderId: row.order_id,
    orderNumber: row.order_number,
    deliveredAt: row.delivered_at,
    items: toItems(row.items),
  }));
}

export type MyOrderReview = {
  rating: number;
  body: string;
  photos: string[];
  adminReply: string | null;
  createdAt: string;
};

export async function getMyOrderReview(orderId: string): Promise<MyOrderReview | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("my_order_review", { p_order_id: orderId })
    .maybeSingle();
  if (error) throw new Error(`my_order_review: ${error.message}`);
  if (!data) return null;
  return {
    rating: data.rating,
    body: data.body,
    photos: data.photos ?? [],
    adminReply: data.admin_reply,
    createdAt: data.created_at,
  };
}
