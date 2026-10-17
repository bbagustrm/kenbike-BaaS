import { ReviewPrompt } from "@/features/reviews/components/review-prompt";
import { listPendingReviewOrders } from "@/features/reviews/queries";
import { getCurrentUser } from "@/lib/auth/session";
import { log } from "@/lib/log";

/**
 * Modal "Pesanan sudah sampai" bagi pembeli yang login. Membaca session →
 * dirender di dalam <Suspense>; gagal memuat tidak boleh merusak navbar.
 */
export async function ReviewPromptSession() {
  const user = await getCurrentUser();
  if (!user || user.role === "admin") return null;
  const orders = await listPendingReviewOrders(true).catch((error: unknown) => {
    log("warn", "reviews.prompt_failed", { message: String(error) });
    return [];
  });
  if (orders.length === 0) return null;
  return <ReviewPrompt orders={orders} userId={user.id} />;
}
