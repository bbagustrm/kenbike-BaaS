import type { Database } from "@/types/database.types";

type PaymentStatus = Database["public"]["Enums"]["payment_status"];
type ShippingStatus = Database["public"]["Enums"]["shipping_status"];

export type Tone = "neutral" | "warning" | "info" | "success" | "danger";

/** Status gabungan (bayar + kirim) yang ditampilkan ke pembeli. */
export function orderDisplayStatus(
  payment: PaymentStatus,
  shipping: ShippingStatus | null,
): { label: string; tone: Tone } {
  switch (payment) {
    case "pending_payment":
      return { label: "Menunggu pembayaran", tone: "warning" };
    case "expired":
      return { label: "Kedaluwarsa", tone: "neutral" };
    case "cancelled":
      return { label: "Dibatalkan", tone: "neutral" };
    case "failed":
      return { label: "Pembayaran gagal", tone: "danger" };
    case "refund_pending":
      return { label: "Menunggu refund", tone: "warning" };
    case "refunded":
      return { label: "Dana dikembalikan", tone: "neutral" };
    case "paid":
      switch (shipping) {
        case "shipped":
          return { label: "Dikirim", tone: "info" };
        case "delivered":
          return { label: "Selesai", tone: "success" };
        case "returned":
          return { label: "Dikembalikan", tone: "danger" };
        case "cancelled":
          return { label: "Pengiriman dibatalkan", tone: "danger" };
        default:
          return { label: "Diproses", tone: "info" };
      }
  }
}

/** Filter riwayat order (nilai = query string `?status=`). */
export const ORDER_FILTERS = {
  unpaid: "Menunggu bayar",
  processing: "Diproses",
  shipped: "Dikirim",
  done: "Selesai",
  cancelled: "Dibatalkan",
} as const;

export type OrderFilter = keyof typeof ORDER_FILTERS;

export function parseOrderFilter(value: string | undefined): OrderFilter | undefined {
  return value && value in ORDER_FILTERS ? (value as OrderFilter) : undefined;
}

/** Kondisi PostgREST (`or(...)`) untuk tiap filter. */
export const ORDER_FILTER_QUERY: Record<OrderFilter, string> = {
  unpaid: "payment_status.eq.pending_payment",
  processing: "and(payment_status.eq.paid,shipping_status.in.(pending,processing))",
  shipped: "and(payment_status.eq.paid,shipping_status.eq.shipped)",
  done: "and(payment_status.eq.paid,shipping_status.eq.delivered)",
  cancelled:
    "payment_status.in.(cancelled,expired,failed,refund_pending,refunded),shipping_status.in.(cancelled,returned)",
};

export type HistoryRow = {
  status_type: string;
  status_value: string;
  source: string;
  created_at: string;
};

export type TimelineEntry = { label: string; at: string; tone: Tone };

/** Label ramah untuk event riwayat; null = event teknis yang tidak ditampilkan. */
function labelFor(row: HistoryRow): { label: string; tone: Tone } | null {
  if (row.status_type === "payment") {
    if (row.source !== "system") return null; // attempt Midtrans: detail teknis
    switch (row.status_value) {
      case "pending_payment":
        return { label: "Pesanan dibuat", tone: "neutral" };
      case "paid":
        return { label: "Pembayaran diterima", tone: "success" };
      case "expired":
        return { label: "Batas waktu pembayaran habis", tone: "neutral" };
      case "cancelled":
        return { label: "Pesanan dibatalkan", tone: "neutral" };
      case "refund_pending":
        return { label: "Pesanan dibatalkan, menunggu refund", tone: "warning" };
      case "refunded":
        return { label: "Dana dikembalikan", tone: "neutral" };
      default:
        return null;
    }
  }
  const SHIPPING: Record<string, { label: string; tone: Tone }> = {
    processing: { label: "Pesanan dikemas, kurir dijadwalkan", tone: "info" },
    confirmed: { label: "Pengiriman dikonfirmasi kurir", tone: "info" },
    allocated: { label: "Kurir ditugaskan", tone: "info" },
    picking_up: { label: "Kurir menuju lokasi penjemputan", tone: "info" },
    picked: { label: "Paket diambil kurir", tone: "info" },
    dropping_off: { label: "Paket dalam perjalanan ke alamatmu", tone: "info" },
    on_hold: { label: "Pengiriman tertunda", tone: "warning" },
    delivered: { label: "Paket diterima", tone: "success" },
    return_in_transit: { label: "Paket dalam perjalanan kembali ke toko", tone: "danger" },
    returned: { label: "Paket kembali ke toko", tone: "danger" },
    cancelled: { label: "Pengiriman dibatalkan", tone: "danger" },
    rejected: { label: "Pengiriman ditolak", tone: "danger" },
  };
  return SHIPPING[row.status_value] ?? null;
}

/** Timeline order: urut waktu, event teknis disaring, label berurutan yang sama digabung. */
export function buildTimeline(rows: readonly HistoryRow[]): TimelineEntry[] {
  const sorted = [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const out: TimelineEntry[] = [];
  for (const row of sorted) {
    const entry = labelFor(row);
    if (!entry || out.at(-1)?.label === entry.label) continue;
    out.push({ ...entry, at: row.created_at });
  }
  return out;
}
