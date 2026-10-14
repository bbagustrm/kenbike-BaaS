"use server";

import { refresh } from "next/cache";
import { after } from "next/server";
import { z } from "zod";

import { applyMidtransTransaction } from "@/features/fulfillment/midtrans";
import { createShipmentForOrder } from "@/features/fulfillment/shipment";
import type { ActionState } from "@/lib/action-state";
import { BiteshipError, cancelOrder as cancelBiteshipOrder } from "@/lib/biteship/client";
import { dbErrorMessage } from "@/lib/db-errors";
import { getTransactionStatus } from "@/lib/midtrans/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import { assertAdminAction } from "../guard";

const uuid = z.uuid();
const INVALID: ActionState = { status: "error", message: "Pesanan tidak ditemukan." };

/** Catat aksi admin di timeline order (source = system, kunci unik per kejadian). */
async function recordEvent(orderId: string, type: "payment" | "shipping", value: string) {
  await createAdminClient()
    .from("order_status_history")
    .insert({
      order_id: orderId,
      status_type: type,
      status_value: value.slice(0, 30),
      source: "system",
      event_key: `admin:${value}:${orderId}:${Date.now()}`.slice(0, 150),
    });
}

async function guard(orderId: string): Promise<ActionState | null> {
  const denied = await assertAdminAction();
  if (denied) return denied;
  return uuid.safeParse(orderId).success ? null : INVALID;
}

const noteSchema = z
  .string()
  .trim()
  .min(1, { error: "Catatan tidak boleh kosong" })
  .max(2000, { error: "Catatan maksimal 2000 karakter" });

/** Catatan internal (hanya terlihat admin; tidak bisa diubah/dihapus — audit trail). */
export async function addInternalNote(orderId: string, note: string): Promise<ActionState> {
  const denied = await guard(orderId);
  if (denied) return denied;
  const parsed = noteSchema.safeParse(note);
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Catatan tidak valid." };
  }

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  // RLS: admin saja & admin_id wajib = pemanggil.
  const { error } = await supabase
    .from("order_internal_notes")
    .insert({ order_id: orderId, admin_id: claims!.claims.sub, note: parsed.data });
  if (error) return { status: "error", message: dbErrorMessage(error) };

  refresh();
  return { status: "success", message: "Catatan ditambahkan." };
}

/** Buat ulang order Biteship (idempoten) — jalur untuk shipment_create_failed. */
export async function retryShipment(orderId: string): Promise<ActionState> {
  const denied = await guard(orderId);
  if (denied) return denied;
  const result = await createShipmentForOrder(orderId);
  refresh();
  if (!result.ok) return { status: "error", message: result.message };
  return {
    status: "success",
    message: result.created ? "Pengiriman berhasil dibuat." : "Pengiriman sudah ada sebelumnya.",
  };
}

/** Batalkan order Biteship (sebelum paket diambil kurir). */
export async function cancelShipment(orderId: string): Promise<ActionState> {
  const denied = await guard(orderId);
  if (denied) return denied;

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("shipping_status, shipment:shipments (biteship_order_id)")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return INVALID;
  if (order.shipping_status !== "pending" && order.shipping_status !== "processing") {
    return { status: "error", message: "Paket sudah dikirim atau pengiriman sudah selesai." };
  }

  const biteshipOrderId = order.shipment?.biteship_order_id;
  if (biteshipOrderId) {
    try {
      await cancelBiteshipOrder(biteshipOrderId, "Dibatalkan admin KenBike");
    } catch (error) {
      return {
        status: "error",
        message: error instanceof BiteshipError ? error.message : "Gagal membatalkan pengiriman.",
      };
    }
  }

  const { error } = await admin
    .from("orders")
    .update({ shipping_status: "cancelled" })
    .eq("id", orderId)
    .in("shipping_status", ["pending", "processing"]);
  if (error) return { status: "error", message: dbErrorMessage(error) };
  await recordEvent(orderId, "shipping", "cancelled");

  refresh();
  return { status: "success", message: "Pengiriman dibatalkan." };
}

/**
 * Tandai dana sudah dikembalikan (setelah refund manual di dashboard Midtrans) —
 * jalur untuk bayar telat tanpa stok, nominal tidak cocok, atau bayar dobel
 * (khusus bayar dobel, order tetap paid: gunakan "Selesaikan" setelah refund).
 */
export async function markRefunded(orderId: string): Promise<ActionState> {
  const denied = await guard(orderId);
  if (denied) return denied;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("orders")
    .update({ payment_status: "refunded", attention_reason: null })
    .eq("id", orderId)
    .eq("payment_status", "paid")
    // Bayar telat tanpa stok: shipping_status masih null (NOT IN tidak cocok dengan null).
    .or("shipping_status.is.null,shipping_status.not.in.(shipped,delivered)")
    .select("id")
    .maybeSingle();
  if (error) return { status: "error", message: dbErrorMessage(error) };
  if (!data) {
    return {
      status: "error",
      message: "Hanya order lunas yang belum dikirim yang bisa ditandai refund.",
    };
  }
  await recordEvent(orderId, "payment", "refunded");

  refresh();
  return { status: "success", message: "Order ditandai sudah di-refund." };
}

/** Hapus tanda "perlu tindakan" setelah ditangani (dicatat di timeline). */
export async function resolveAttention(orderId: string): Promise<ActionState> {
  const denied = await guard(orderId);
  if (denied) return denied;

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("attention_reason")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return INVALID;
  if (!order.attention_reason)
    return { status: "success", message: "Tidak ada yang perlu ditangani." };

  const { error } = await admin.from("orders").update({ attention_reason: null }).eq("id", orderId);
  if (error) return { status: "error", message: dbErrorMessage(error) };
  await recordEvent(
    orderId,
    order.attention_reason === "shipment_create_failed" ? "shipping" : "payment",
    `resolved:${order.attention_reason}`,
  );

  refresh();
  return { status: "success", message: "Tanda perlu tindakan dihapus." };
}

/** Tarik status attempt terakhir dari Midtrans (cadangan bila webhook terlewat). */
export async function syncOrderPayment(orderId: string): Promise<ActionState> {
  const denied = await guard(orderId);
  if (denied) return denied;

  const { data: attempt } = await createAdminClient()
    .from("payments")
    .select("gateway_order_id")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!attempt) return { status: "error", message: "Order ini belum punya pembayaran." };

  try {
    const tx = await getTransactionStatus(attempt.gateway_order_id);
    if (!tx) return { status: "success", message: "Pembeli belum memilih metode pembayaran." };
    const result = await applyMidtransTransaction(tx);
    if (result.outcome === "paid" && result.needsShipment) {
      after(() => createShipmentForOrder(result.orderId).catch(console.error));
    }
    refresh();
    return {
      status: "success",
      message:
        result.outcome === "duplicate"
          ? `Status Midtrans: ${tx.transaction_status} (sudah tercatat).`
          : `Status Midtrans: ${tx.transaction_status}.`,
    };
  } catch (error) {
    console.error("[syncOrderPayment]", error);
    return { status: "error", message: "Gagal menghubungi Midtrans." };
  }
}
