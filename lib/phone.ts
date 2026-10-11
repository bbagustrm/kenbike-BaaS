import { z } from "zod";

/** Format yang diterima CHECK di DB (profiles.phone, addresses.phone). */
const PHONE_PATTERN = /^\+?[0-9]{8,15}$/;
const INVALID = "Nomor HP tidak valid (contoh: 081234567890)";

/** Buang spasi & tanda baca: "0812-3456 7890" → "081234567890". */
const normalized = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s().-]/g, ""));

/** Nomor HP opsional: kosong = null. */
export const phoneSchema = normalized
  .refine((v) => v === "" || PHONE_PATTERN.test(v), { error: INVALID })
  .transform((v) => (v === "" ? null : v));

/** Nomor HP wajib (mis. penerima paket). */
export const requiredPhoneSchema = normalized
  .refine((v) => v !== "", { error: "Nomor HP wajib diisi" })
  .refine((v) => v === "" || PHONE_PATTERN.test(v), { error: INVALID });
