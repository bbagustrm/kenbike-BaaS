export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

/** Path file: products/<productId>/<uuid>.<ext> */
export function productImagePath(productId: string, id: string, ext: string) {
  return `products/${productId}/${id}.${ext}`;
}

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

export function isProductImagePath(path: string, productId: string): boolean {
  return new RegExp(`^products/${productId}/${UUID}\\.(jpg|png|webp)$`).test(path);
}

/** Validasi file di browser sebelum diunggah (bucket juga membatasi tipe & ukuran). */
export function validateImageFile(file: File): string | null {
  if (!(file.type in ALLOWED_IMAGE_TYPES)) return `${file.name}: format harus JPG, PNG, atau WebP.`;
  if (file.size > MAX_IMAGE_BYTES) return `${file.name}: ukuran maksimal 5 MB.`;
  return null;
}
