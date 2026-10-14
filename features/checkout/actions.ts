"use server";

import { refresh } from "next/cache";
import { after } from "next/server";
import { z } from "zod";

import { applyMidtransTransaction } from "@/features/fulfillment/midtrans";
import { createShipmentForOrder } from "@/features/fulfillment/shipment";
import { getCurrentUser } from "@/lib/auth/session";
import { dbErrorMessage } from "@/lib/db-errors";
import { getTransactionStatus } from "@/lib/midtrans/client";
import { RATE_LIMITED_MESSAGE, rateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import { cancelPendingPaymentFor, type PaymentResult, preparePayment } from "./payment";
import { quoteShipping, type ShippingQuote } from "./shipping";

const SESSION_EXPIRED = "Sesi berakhir. Silakan masuk lagi.";

function paymentCustomer(user: { fullName: string | null; email: string | null }) {
  return {
    name: user.fullName ?? user.email ?? "Pelanggan KenBike",
    email: user.email ?? undefined,
  };
}

/** Cek ongkir isi keranjang ke alamat terpilih (dipanggil dari halaman checkout). */
export async function getShippingRates(addressId: string): Promise<ShippingQuote> {
  if (!z.uuid().safeParse(addressId).success) {
    return { ok: false, message: "Alamat tidak ditemukan." };
  }
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: SESSION_EXPIRED };
  if (!(await rateLimit("shippingRates", user.id))) {
    return { ok: false, message: RATE_LIMITED_MESSAGE };
  }

  try {
    return await quoteShipping(await createClient(), addressId);
  } catch (error) {
    console.error("[getShippingRates]", error);
    return { ok: false, message: "Gagal menghitung ongkir. Coba lagi." };
  }
}

const checkoutSchema = z.object({
  addressId: z.uuid(),
  courierCode: z.string().trim().min(1).max(50),
  serviceCode: z.string().trim().min(1).max(50),
  note: z.string().trim().max(500).optional(),
  /** Total yang dilihat pembeli; ditolak bila berbeda dari hitungan server. */
  expectedTotal: z.number().int().nonnegative(),
});

export type CheckoutResult =
  PaymentResult | { ok: false; reason: "total_changed" | "rate_unavailable"; message: string };

/** Pesanan pending milik user yang baru saja dibuat (dianggap submit ganda). */
const DUPLICATE_WINDOW_MS = 2 * 60_000;

/**
 * Inti checkout (docs/PRD.md §3.6 langkah 2–3): hitung ulang ongkir & total di
 * server → create_order (service role, profile_id dari session) → siapkan Snap.
 */
export async function createOrderAndPay(input: unknown): Promise<CheckoutResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: SESSION_EXPIRED };
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Data checkout tidak valid." };
  if (!(await rateLimit("checkout", user.id))) return { ok: false, message: RATE_LIMITED_MESSAGE };
  const { addressId, courierCode, serviceCode, note, expectedTotal } = parsed.data;

  const supabase = await createClient();
  const customer = paymentCustomer(user);

  // Ongkir dihitung ulang ke Biteship — angka dari client tidak dipakai.
  const quote = await quoteShipping(supabase, addressId);
  if (!quote.ok) {
    // Keranjang kosong bisa berarti order sudah dibuat oleh klik sebelumnya.
    const recent = await recentPendingOrder(user.id);
    if (recent) return preparePayment(recent, customer, { reuse: true });
    return { ok: false, message: quote.message };
  }
  const rate = quote.rates.find(
    (r) => r.courierCode === courierCode && r.serviceCode === serviceCode,
  );
  if (!rate) {
    return {
      ok: false,
      reason: "rate_unavailable",
      message: "Layanan kurir yang dipilih tidak tersedia lagi. Pilih kurir lain.",
    };
  }

  const subtotal = await cartSubtotal(supabase);
  if (subtotal + rate.price !== expectedTotal) {
    return {
      ok: false,
      reason: "total_changed",
      message: "Harga atau ongkir berubah. Periksa ringkasan lalu bayar lagi.",
    };
  }

  const { data: order, error } = await createAdminClient().rpc("create_order", {
    p_profile_id: user.id,
    p_address_id: addressId,
    p_courier_code: courierCode,
    p_courier_service: serviceCode,
    p_shipping_cost: rate.price,
    p_customer_note: note || undefined,
  });
  if (error) {
    if (error.message === "cart_empty") {
      const recent = await recentPendingOrder(user.id);
      if (recent) return preparePayment(recent, customer, { reuse: true });
    }
    if (error.message === "insufficient_stock") {
      return {
        ok: false,
        message: `Stok ${error.details ? `SKU ${error.details}` : "salah satu barang"} tidak cukup. Ubah jumlah di keranjang.`,
      };
    }
    return { ok: false, message: dbErrorMessage(error) };
  }

  refresh();
  return preparePayment(order.id, customer, { reuse: true });
}

async function cartSubtotal(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data, error } = await supabase
    .from("cart_items")
    .select("quantity, variant:product_variants (price)");
  if (error) throw new Error(`cartSubtotal: ${error.message}`);
  return data.reduce((sum, row) => sum + (row.variant?.price ?? 0) * row.quantity, 0);
}

async function recentPendingOrder(profileId: string): Promise<string | null> {
  const { data } = await createAdminClient()
    .from("orders")
    .select("id")
    .eq("profile_id", profileId)
    .eq("payment_status", "pending_payment")
    .gte("created_at", new Date(Date.now() - DUPLICATE_WINDOW_MS).toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

/** Order milik user yang login (RLS) berdasarkan nomor order. */
async function myOrderId(orderNumber: string): Promise<string | null> {
  if (!/^[A-Z0-9-]{1,30}$/.test(orderNumber)) return null;
  const { data } = await (
    await createClient()
  )
    .from("orders")
    .select("id")
    .eq("order_number", orderNumber)
    .maybeSingle();
  return data?.id ?? null;
}

/**
 * Bayar order pending: `changeMethod` false = buka ulang Snap yang masih
 * berlaku; true = batalkan attempt lama lalu buat attempt baru (§3.6 langkah 8).
 */
export async function payOrder(orderNumber: string, changeMethod = false): Promise<PaymentResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: SESSION_EXPIRED };
  if (!(await rateLimit("payOrder", user.id))) return { ok: false, message: RATE_LIMITED_MESSAGE };
  const orderId = await myOrderId(orderNumber);
  if (!orderId) return { ok: false, message: "Pesanan tidak ditemukan." };

  const result = await preparePayment(orderId, paymentCustomer(user), { reuse: !changeMethod });
  refresh();
  return result;
}

/** Batalkan order yang belum dibayar: batalkan attempt Midtrans → RPC cancel_order. */
export async function cancelMyOrder(
  orderNumber: string,
): Promise<{ status: "success" | "error"; message: string }> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: SESSION_EXPIRED };
  const orderId = await myOrderId(orderNumber);
  if (!orderId) return { status: "error", message: "Pesanan tidak ditemukan." };

  try {
    if (!(await cancelPendingPaymentFor(orderId))) {
      return {
        status: "error",
        message: "Pembayaran sudah diterima, pesanan tidak bisa dibatalkan.",
      };
    }
  } catch (error) {
    console.error("[cancelMyOrder]", error);
    return { status: "error", message: "Gagal menghubungi layanan pembayaran. Coba lagi." };
  }

  // RPC memeriksa kepemilikan (auth.uid()) & status pending_payment.
  const { error } = await (await createClient()).rpc("cancel_order", { p_order_id: orderId });
  if (error) return { status: "error", message: dbErrorMessage(error) };

  refresh();
  return { status: "success", message: "Pesanan dibatalkan. Stok dikembalikan." };
}

/**
 * Tanyakan status attempt terakhir ke Midtrans (Status API) lalu terapkan
 * dengan logika yang sama seperti webhook. Cadangan bila webhook terlambat
 * dan agar development lokal tanpa tunnel tetap bisa melihat status "Lunas".
 */
export async function syncPaymentStatus(orderNumber: string): Promise<{ changed: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { changed: false };
  if (!(await rateLimit("syncPayment", user.id))) return { changed: false };
  const orderId = await myOrderId(orderNumber);
  if (!orderId) return { changed: false };

  const { data: attempt } = await createAdminClient()
    .from("payments")
    .select("gateway_order_id")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!attempt) return { changed: false };

  try {
    const tx = await getTransactionStatus(attempt.gateway_order_id);
    if (!tx) return { changed: false };
    const result = await applyMidtransTransaction(tx);
    if (result.outcome === "paid" && result.needsShipment) {
      after(() =>
        createShipmentForOrder(result.orderId).catch((error) =>
          console.error("[syncPaymentStatus] shipment", error),
        ),
      );
    }
    const changed = result.outcome === "paid" || result.outcome === "updated";
    if (changed) refresh();
    return { changed };
  } catch (error) {
    console.error("[syncPaymentStatus]", orderNumber, error);
    return { changed: false };
  }
}
