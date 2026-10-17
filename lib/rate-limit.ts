import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/** Batas per pengguna per menit untuk Server Action sensitif. */
export const RATE_LIMITS = {
  searchAreas: { limit: 30, windowSeconds: 60 },
  shippingRates: { limit: 20, windowSeconds: 60 },
  checkout: { limit: 5, windowSeconds: 60 },
  payOrder: { limit: 10, windowSeconds: 60 },
  syncPayment: { limit: 12, windowSeconds: 60 },
  documents: { limit: 20, windowSeconds: 60 },
  cancelOrder: { limit: 5, windowSeconds: 60 },
  refundAccount: { limit: 10, windowSeconds: 60 },
  chatMessage: { limit: 30, windowSeconds: 60 },
  chatStart: { limit: 5, windowSeconds: 60 },
  review: { limit: 5, windowSeconds: 60 },
} as const;

export type RateLimitedAction = keyof typeof RATE_LIMITS;

export const RATE_LIMITED_MESSAGE = "Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.";

/**
 * true = boleh lanjut. Fail-open: bila pengecekan gagal (DB bermasalah),
 * permintaan tetap diizinkan dan error dicatat — rate limit adalah lapisan
 * tambahan, bukan satu-satunya pengaman (RLS & validasi tetap berlaku).
 */
export async function rateLimit(action: RateLimitedAction, subject: string): Promise<boolean> {
  const { limit, windowSeconds } = RATE_LIMITS[action];
  const { data, error } = await createAdminClient().rpc("check_rate_limit", {
    p_key: `${action}:${subject}`,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error("[rateLimit]", action, error.message);
    return true;
  }
  return data;
}
