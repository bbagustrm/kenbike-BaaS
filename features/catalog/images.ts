import { publicEnv } from "@/lib/env/public";

const BUCKET = "product-images";

/** URL publik gambar produk di Supabase Storage (bucket publik). */
export function productImageUrl(storagePath: string): string {
  const encoded = storagePath.split("/").map(encodeURIComponent).join("/");
  return `${publicEnv.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${encoded}`;
}
