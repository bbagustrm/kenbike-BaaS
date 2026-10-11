import { createBrowserClient } from "@supabase/ssr";

import { publicEnv } from "@/lib/env/public";
import type { Database } from "@/types/database.types";

/** Client untuk Client Components. Utamakan Server Actions untuk mutasi. */
export function createClient() {
  return createBrowserClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
