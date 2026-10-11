import "server-only";

import type { ActionState } from "@/lib/action-state";
import { getCurrentUser } from "@/lib/auth/session";

/**
 * Guard untuk Server Action admin: kembalikan ActionState error alih-alih
 * melempar, agar form bisa menampilkan pesan. RLS & RPC tetap memvalidasi ulang.
 */
export async function assertAdminAction(): Promise<ActionState | null> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "Sesi kamu sudah habis. Silakan masuk lagi." };
  if (user.role !== "admin") return { status: "error", message: "Kamu tidak punya akses." };
  return null;
}
