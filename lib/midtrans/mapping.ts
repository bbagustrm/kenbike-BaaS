import type { Database } from "@/types/database.types";

import type { SnapItem } from "./types";

type AttemptStatus = Database["public"]["Enums"]["payment_attempt_status"];
type PaymentStatus = Database["public"]["Enums"]["payment_status"];

/**
 * Status transaksi Midtrans → status attempt (`payments.status`) dan, bila
 * relevan, status order. `order: null` = status order tidak berubah:
 * attempt yang gagal/ditolak/dibatalkan tidak menggagalkan order karena
 * pembeli masih bisa membayar ulang; kadaluarsa order diurus cron.
 */
export function mapMidtransStatus(
  transactionStatus: string,
  fraudStatus?: string,
): { attempt: AttemptStatus; order: PaymentStatus | null } | null {
  switch (transactionStatus) {
    case "capture":
      if (fraudStatus === "challenge") return { attempt: "pending", order: null };
      if (fraudStatus === "deny") return { attempt: "deny", order: null };
      return { attempt: "capture", order: "paid" };
    case "settlement":
      return { attempt: "settlement", order: "paid" };
    case "pending":
      return { attempt: "pending", order: null };
    case "deny":
      return { attempt: "deny", order: null };
    case "cancel":
      return { attempt: "cancel", order: null };
    case "expire":
      return { attempt: "expire", order: null };
    case "failure":
      return { attempt: "failure", order: null };
    case "refund":
    case "partial_refund":
      return { attempt: "refund", order: "refunded" };
    default:
      return null;
  }
}

const NAME_MAX = 50;
const ID_MAX = 50;

/**
 * `item_details` Snap dari baris order + ongkir sebagai item terpisah.
 * Melempar error bila jumlahnya tidak sama dengan total (Midtrans menolaknya).
 */
export function buildSnapItems(
  lines: readonly {
    variantId: string;
    name: string;
    variantLabel: string | null;
    price: number;
    quantity: number;
  }[],
  shipping: { courier: string; service: string; cost: number },
  grossAmount: number,
): SnapItem[] {
  const truncate = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);
  const items: SnapItem[] = lines.map((l) => ({
    id: truncate(l.variantId, ID_MAX),
    name: truncate(l.variantLabel ? `${l.name} (${l.variantLabel})` : l.name, NAME_MAX),
    price: l.price,
    quantity: l.quantity,
  }));
  if (shipping.cost > 0) {
    items.push({
      id: "SHIPPING",
      name: truncate(
        `Ongkir ${shipping.courier.toUpperCase()} ${shipping.service.toUpperCase()}`,
        NAME_MAX,
      ),
      price: shipping.cost,
      quantity: 1,
    });
  }
  const sum = items.reduce((acc, i) => acc + i.price * i.quantity, 0);
  if (sum !== grossAmount) {
    throw new Error(`buildSnapItems: jumlah item ${sum} ≠ total ${grossAmount}`);
  }
  return items;
}

const MINUTE = 60_000;
/** Snap selalu berakhir ≥ 15 menit sebelum order kadaluarsa (docs/PRD.md §3.4). */
export const PAYMENT_BUFFER_MS = 15 * MINUTE;
const MAX_ATTEMPT_MS = 23 * 60 * MINUTE + 45 * MINUTE;
/** Attempt baru minimal punya waktu bayar sepanjang ini. */
export const MIN_ATTEMPT_MS = 5 * MINUTE;

/**
 * Batas waktu attempt pembayaran baru: MIN(now + 23j45m, order.expires_at − 15m),
 * dibulatkan ke bawah per menit. Null bila sisa waktunya terlalu pendek.
 */
export function paymentAttemptExpiry(
  now: Date,
  orderExpiresAt: Date,
): { expiresAt: Date; durationMinutes: number } | null {
  const end = Math.min(
    now.getTime() + MAX_ATTEMPT_MS,
    orderExpiresAt.getTime() - PAYMENT_BUFFER_MS,
  );
  const durationMinutes = Math.floor((end - now.getTime()) / MINUTE);
  if (durationMinutes * MINUTE < MIN_ATTEMPT_MS) return null;
  return { expiresAt: new Date(now.getTime() + durationMinutes * MINUTE), durationMinutes };
}

/** Format waktu Midtrans: "YYYY-MM-DD HH:mm:ss +0000" (UTC). */
export function midtransTime(date: Date): string {
  return `${date.toISOString().slice(0, 19).replace("T", " ")} +0000`;
}

/** Kanal pembayaran untuk ditampilkan/dilaporkan, mis. "bca", "permata", "indomaret", "gopay". */
export function paymentChannel(tx: {
  payment_type?: string;
  va_numbers?: { bank?: string }[];
  permata_va_number?: string;
  store?: string;
  issuer?: string;
  acquirer?: string;
  bank?: string;
}): string | null {
  const channel =
    tx.va_numbers?.[0]?.bank ??
    (tx.permata_va_number ? "permata" : undefined) ??
    tx.store ??
    tx.issuer ??
    tx.acquirer ??
    tx.bank ??
    tx.payment_type;
  return channel ? channel.toLowerCase().slice(0, 30) : null;
}
