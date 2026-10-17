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
    /** Kode kurir yang ditawarkan, dipisah koma (lihat dokumentasi Biteship). */
    BITESHIP_COURIERS: z.preprocess(
      (v) => (v === "" ? undefined : v),
      z
        .string()
        .regex(/^[a-z_]+(,[a-z_]+)*$/)
        .default("jne,jnt,sicepat,anteraja"),
    ),
  }),
);

/** Dipisah dari biteshipEnv: hanya dibutuhkan webhook (M7). */
export const biteshipWebhookEnv = lazyEnv(
  "Biteship webhook",
  z.object({ BITESHIP_WEBHOOK_SECRET: z.string().min(1) }),
);

/**
 * Email transaksional (Resend). Opsional: tanpa RESEND_API_KEY email dilewati
 * (hanya dicatat di log). MAIL_DEV_TO = alihkan SEMUA email ke satu inbox
 * (dipakai di localhost/preview — Resend tanpa domain terverifikasi hanya bisa
 * mengirim ke email pemilik akun).
 */
export const emailEnv = lazyEnv(
  "Email (Resend)",
  z.object({
    RESEND_API_KEY: z.preprocess((v) => (v === "" ? undefined : v), z.string().min(1).optional()),
    MAIL_FROM: z.preprocess(
      (v) => (v === "" ? undefined : v),
      z.string().min(3).default("KenBike <onboarding@resend.dev>"),
    ),
    MAIL_DEV_TO: z.preprocess((v) => (v === "" ? undefined : v), z.email().optional()),
    /** Email admin untuk notifikasi pesan/pertanyaan baru (opsional). */
    ADMIN_NOTIFY_EMAIL: z.preprocess((v) => (v === "" ? undefined : v), z.email().optional()),
  }),
);
