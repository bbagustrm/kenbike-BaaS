import { z } from "zod";

/**
 * Nomor HP disimpan tanpa spasi/tanda baca agar lolos CHECK di DB
 * (`^\+?[0-9]{8,15}$`). Kosong = tidak diisi.
 */
export const phoneSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s().-]/g, ""))
  .refine((v) => v === "" || /^\+?[0-9]{8,15}$/.test(v), {
    error: "Nomor HP tidak valid (contoh: 081234567890)",
  })
  .transform((v) => (v === "" ? null : v));

export const profileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, { error: "Nama minimal 2 karakter" })
    .max(120, { error: "Nama maksimal 120 karakter" }),
  phone: phoneSchema,
});
