import { z } from "zod";

import type { Database } from "@/types/database.types";

export type RefundStatus = Database["public"]["Enums"]["refund_status"];

export const REFUND_PROOF_BUCKET = "refund-proofs";
export const MAX_PROOF_BYTES = 5 * 1024 * 1024;
export const PROOF_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
} as const;

/** Pesanan lunas yang kurirnya belum mengambil paket (sama dengan syarat RPC cancel_paid_order). */
export function isCancellable(paymentStatus: string, shippingStatus: string | null): boolean {
  return (
    paymentStatus === "paid" &&
    (shippingStatus === null || shippingStatus === "pending" || shippingStatus === "processing")
  );
}

/** Alasan pembatalan yang sering dipakai (pembeli & admin); "Lainnya" = teks bebas. */
export const CANCEL_REASONS = [
  "Ingin mengganti produk/varian",
  "Ingin mengganti alamat pengiriman",
  "Berubah pikiran",
  "Stok tidak tersedia",
  "Barang rusak/cacat sebelum dikirim",
] as const;

export const cancelSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(3, { error: "Tulis alasan pembatalan" })
    .max(500, { error: "Alasan maksimal 500 karakter" }),
  restock: z.boolean().default(true),
});

export const accountSchema = z.object({
  bankName: z
    .string()
    .trim()
    .min(2, { error: "Nama bank wajib diisi" })
    .max(50, { error: "Nama bank terlalu panjang" }),
  accountNumber: z
    .string()
    .transform((v) => v.replace(/[\s-]/g, ""))
    .pipe(z.string().regex(/^\d{5,30}$/, { error: "Nomor rekening 5–30 digit angka" })),
  accountHolder: z
    .string()
    .trim()
    .min(2, { error: "Nama pemilik rekening wajib diisi" })
    .max(100, { error: "Nama pemilik terlalu panjang" }),
});

export type RefundAccount = z.infer<typeof accountSchema>;

export const completeSchema = z
  .object({
    proofPath: z.string().nullable(),
    note: z
      .string()
      .trim()
      .max(1000, { error: "Catatan maksimal 1000 karakter" })
      .transform((v) => v || null),
  })
  .refine((v) => v.proofPath || v.note, { error: "Unggah bukti transfer atau tulis catatan" });

/** Path bukti di bucket: `{orderId}/{id}.{ext}` (policy & RPC memeriksa folder order). */
export function refundProofPath(orderId: string, id: string, ext: string): string {
  return `${orderId}/${id}.${ext}`;
}

export function isRefundProofPath(orderId: string, path: string): boolean {
  return new RegExp(`^${orderId}/[0-9a-f-]{36}\\.(jpg|png|webp|pdf)$`).test(path);
}

/** Pesan error validasi file bukti, atau null bila valid. */
export function validateProofFile(file: { type: string; size: number }): string | null {
  if (!(file.type in PROOF_TYPES)) return "Bukti harus berupa gambar (JPG/PNG/WEBP) atau PDF.";
  if (file.size > MAX_PROOF_BYTES) return "Ukuran bukti maksimal 5 MB.";
  return null;
}

const ACCOUNT_REMINDER_MS = 2 * 24 * 60 * 60 * 1000;

/** Rekening belum diisi lebih dari 2 hari sejak pembatalan → admin perlu mengingatkan. */
export function isAccountOverdue(status: RefundStatus, createdAt: string, now: number): boolean {
  return status === "awaiting_account" && now - Date.parse(createdAt) > ACCOUNT_REMINDER_MS;
}

export const REFUND_STATUS_LABEL: Record<RefundStatus, string> = {
  awaiting_account: "Menunggu data rekening",
  pending_transfer: "Siap ditransfer",
  completed: "Refund selesai",
};
