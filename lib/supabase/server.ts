import "server-only";

import { createServerClient } from "@supabase/ssr";
import { io } from "next/cache";
import { cookies } from "next/headers";

import { publicEnv } from "@/lib/env/public";
import type { Database } from "@/types/database.types";

/**
 * Client per request dengan session user (cookie) — menghormati RLS.
 * Membaca cookies(), jadi komponen pemanggilnya harus berada di dalam
 * <Suspense> dan tidak boleh dipakai di dalam "use cache".
 */
export async function createClient() {
  // Supabase membaca waktu sekarang (cek kedaluwarsa token) di setiap query.
  // Dengan Cache Components + partial prefetching, cookies() sudah tersedia saat
  // runtime prefetch, jadi tandai bahwa pekerjaan berikutnya hanya saat request.
  // Di Server Action / Route Handler io() langsung resolve.
  await io();
  const cookieStore = await cookies();

  return createServerClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Dipanggil dari Server Component (cookie read-only). Aman diabaikan:
            // proxy.ts yang me-refresh session pada setiap request.
          }
        },
      },
    },
  );
}
