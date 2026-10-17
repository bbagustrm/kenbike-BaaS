import "server-only";

import { log } from "@/lib/log";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Kirim pesan sistem ke chat pesanan (dibuat bila belum ada) lewat service role.
 * Gagal tidak menggagalkan aksi utama — cukup dicatat.
 */
export async function postRefundMessage(orderId: string, body: string): Promise<void> {
  const { error } = await createAdminClient().rpc("post_system_message", {
    p_order_id: orderId,
    p_body: body,
  });
  if (error) log("error", "refund.chat_message_failed", { orderId, message: error.message });
}
