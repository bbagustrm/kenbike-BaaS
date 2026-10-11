import "server-only";

import { createClient } from "@supabase/supabase-js";

import { publicEnv } from "@/lib/env/public";
import { supabaseServerEnv } from "@/lib/env/server";
import type { Database } from "@/types/database.types";

/**
 * Client service role — BYPASS RLS. Hanya untuk webhook, job, dan RPC yang
 * dibatasi ke service_role (mis. create_order), dan hanya setelah pemanggil
 * memverifikasi user serta input.
 */
export function createAdminClient() {
  return createClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    supabaseServerEnv().SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
  );
}
