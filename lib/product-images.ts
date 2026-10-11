import { publicEnv } from "@/lib/env/public";

/** Bucket publik Supabase Storage untuk foto produk. */
export const PRODUCT_IMAGE_BUCKET = "product-images";

/** URL publik gambar produk di Supabase Storage. */
export function productImageUrl(storagePath: string): string {
  const encoded = storagePath.split("/").map(encodeURIComponent).join("/");
  return `${publicEnv.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${PRODUCT_IMAGE_BUCKET}/${encoded}`;
}

type ImageRow = { storage_path: string; sort_order: number; variant_id: string | null };

/**
 * Foto yang mewakili produk/varian: foto khusus varian (bila `variantId`
 * diberikan), lalu foto umum pertama, lalu foto apa pun.
 */
export function pickPrimaryImage<T extends ImageRow>(
  images: readonly T[],
  variantId?: string,
): T | undefined {
  const sorted = [...images].sort((a, b) => a.sort_order - b.sort_order);
  return (
    (variantId ? sorted.find((img) => img.variant_id === variantId) : undefined) ??
    sorted.find((img) => img.variant_id === null) ??
    sorted[0]
  );
}
