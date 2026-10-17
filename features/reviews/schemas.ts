import { z } from "zod";

export const MAX_REVIEW_PHOTOS = 5;
export const MAX_REVIEW_LENGTH = 1000;
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const REVIEW_PHOTO_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

/** Pilihan cepat (bisa lebih dari satu) yang mengisi teks ulasan. */
export const QUICK_TEXTS = [
  "Mantul! 🔥",
  "Barang ori, sesuai deskripsi",
  "Pengiriman ngebut 🚀",
  "Packing rapi & aman",
  "Seller fast respon",
  "Kualitas oke banget 👌",
  "Worth it sama harganya",
  "Recommended! 👍",
] as const;

export const RATING_LABELS: Record<number, string> = {
  1: "Sangat buruk",
  2: "Kurang",
  3: "Biasa saja",
  4: "Bagus",
  5: "Mantap banget!",
};

export const reviewSchema = z.object({
  rating: z.number().int().min(1, { error: "Pilih bintang" }).max(5),
  body: z
    .string()
    .trim()
    .max(MAX_REVIEW_LENGTH, { error: `Ulasan maksimal ${MAX_REVIEW_LENGTH} karakter` }),
  photoPaths: z.array(z.string().max(300)).max(MAX_REVIEW_PHOTOS),
});

/** Path foto ulasan: `{userId}/{uuid}.{ext}` (policy Storage & RPC memeriksa folder). */
export function reviewPhotoPath(userId: string, id: string, ext: string): string {
  return `${userId}/${id}.${ext}`;
}

export function isOwnReviewPhotoPath(userId: string, path: string): boolean {
  return new RegExp(`^${userId}/[0-9a-f-]{36}\\.(jpg|png|webp)$`).test(path);
}

/** Quick text dianggap terpilih bila frasanya ada di isi ulasan. */
export function hasQuickText(body: string, text: string): boolean {
  return body.includes(text);
}

/** Tambah (di akhir, dipisah spasi) atau hapus quick text dari isi ulasan. */
export function toggleQuickText(body: string, text: string): string {
  const next = hasQuickText(body, text) ? body.replace(text, " ") : `${body} ${text}`;
  return next.replace(/ {2,}/g, " ").trim();
}
