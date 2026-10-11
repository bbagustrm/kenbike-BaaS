import "server-only";

import { z } from "zod";

// Setiap integrasi divalidasi saat pertama kali dipakai, supaya fitur yang
// belum dikerjakan (mis. Midtrans sebelum M6) tidak memaksa env-nya diisi.
function lazyEnv<T extends z.ZodType>(name: string, schema: T): () => z.infer<T> {
  let cached: z.infer<T> | undefined;
  return () => {
    if (cached) return cached;
    const parsed = schema.safeParse(process.env);
    if (!parsed.success) {
      throw new Error(
        `Environment ${name} tidak valid:\n${z.prettifyError(parsed.error)}\nLihat .env.example.`,
      );
    }
    cached = parsed.data;
    return cached;
  };
}

export const supabaseServerEnv = lazyEnv(
  "Supabase (server)",
  z.object({ SUPABASE_SERVICE_ROLE_KEY: z.string().min(1) }),
);

export const midtransEnv = lazyEnv(
  "Midtrans",
  z.object({
    MIDTRANS_SERVER_KEY: z.string().min(1),
    MIDTRANS_IS_PRODUCTION: z.stringbool().default(false),
  }),
);

export const biteshipEnv = lazyEnv(
  "Biteship",
  z.object({
    BITESHIP_API_KEY: z.string().min(1),
    BITESHIP_WEBHOOK_SECRET: z.string().min(1),
  }),
);
