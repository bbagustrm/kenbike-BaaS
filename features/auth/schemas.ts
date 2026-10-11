import { z } from "zod";

const email = z.email({ error: "Format email tidak valid" }).trim().toLowerCase();

// Supabase membatasi password maks 72 byte (bcrypt).
const newPassword = z
  .string()
  .min(8, { error: "Password minimal 8 karakter" })
  .max(72, { error: "Password maksimal 72 karakter" });

export const loginSchema = z.object({
  email,
  password: z.string().min(1, { error: "Password wajib diisi" }),
});

export const registerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, { error: "Nama minimal 2 karakter" })
      .max(120, { error: "Nama maksimal 120 karakter" }),
    email,
    password: newPassword,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    error: "Konfirmasi password tidak sama",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({ password: newPassword, confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, {
    error: "Konfirmasi password tidak sama",
    path: ["confirmPassword"],
  });
