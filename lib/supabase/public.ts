import { createClient } from "@supabase/supabase-js";

import { publicEnv } from "@/lib/env/public";

/**
 * Client anon TANPA cookie untuk data publik (katalog). Aman dipakai di dalam
 * fungsi "use cache" karena tidak membaca cookies() — hasilnya sama untuk
 * semua pengunjung dan hanya melihat baris yang diizinkan RLS untuk `anon`.
 *
 * Jangan pakai untuk data per-user; gunakan lib/supabase/server.ts.
 */
export function createPublicClient() {
  return createClient(publicEnv.NEXT_PUBLIC_SUPABASE_URL, publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
