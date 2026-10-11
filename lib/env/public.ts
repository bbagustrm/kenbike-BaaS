import { z } from "zod";

// NEXT_PUBLIC_* di-inline saat build, jadi setiap variabel harus dirujuk
// secara statis (process.env.NAMA), bukan lewat process.env[key].
const schema = z.object({
  NEXT_PUBLIC_SITE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_MIDTRANS_CLIENT_KEY: z.string().optional(),
});

const parsed = schema.safeParse({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_MIDTRANS_CLIENT_KEY: process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || undefined,
});

if (!parsed.success) {
  throw new Error(
    `Environment publik tidak valid:\n${z.prettifyError(parsed.error)}\nLihat .env.example.`,
  );
}

export const publicEnv = parsed.data;
