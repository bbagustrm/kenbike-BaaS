import { AdminContentSkeleton } from "@/features/admin";

/**
 * Batas Suspense per halaman: Suspense di layout admin tidak berlaku saat
 * navigasi antar halaman admin (layout sudah terpasang), jadi tanpa ini
 * navigasi menunggu data selesai dimuat.
 */
export default function Loading() {
  return <AdminContentSkeleton />;
}
