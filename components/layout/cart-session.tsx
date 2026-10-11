import { CartSync } from "@/features/cart";
import { getCurrentUser } from "@/lib/auth/session";

/**
 * Memberi tahu store keranjang siapa user saat ini. Membaca session, jadi
 * dirender di dalam <Suspense>; dirender ulang setelah login/logout.
 */
export async function CartSession() {
  const user = await getCurrentUser();
  return <CartSync userId={user?.id ?? null} />;
}
