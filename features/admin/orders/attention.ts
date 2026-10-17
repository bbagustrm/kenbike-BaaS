import type { Database } from "@/types/database.types";

type AttentionReason = Database["public"]["Enums"]["attention_reason"];

/** Penjelasan & jalur penyelesaian tiap alasan "perlu tindakan" (#71). */
export const ATTENTION: Record<AttentionReason, { label: string; guide: string }> = {
  late_payment_out_of_stock: {
    label: "Bayar telat, stok habis",
    guide:
      "Pembayaran masuk setelah pesanan kedaluwarsa dan stok sudah tidak cukup. Tambah stok lalu klik “Selesaikan” dan “Buat pengiriman”, atau klik “Batalkan & refund” lalu proses refund ke pembeli.",
  },
  shipment_create_failed: {
    label: "Gagal membuat pengiriman",
    guide:
      "Order Biteship gagal dibuat (mis. alamat toko belum diatur atau layanan kurir menolak). Perbaiki penyebabnya lalu klik “Buat pengiriman”.",
  },
  amount_mismatch: {
    label: "Nominal tidak cocok",
    guide:
      "Nominal dari Midtrans berbeda dengan tagihan. Cek transaksinya di dashboard Midtrans: bila salah, klik “Batalkan & refund”; bila sudah benar, klik “Selesaikan”.",
  },
  duplicate_payment: {
    label: "Pembayaran dobel",
    guide:
      "Ada dua pembayaran lunas untuk pesanan ini. Refund salah satunya di dashboard Midtrans, lalu klik “Selesaikan”. Pesanan tetap diproses.",
  },
};
