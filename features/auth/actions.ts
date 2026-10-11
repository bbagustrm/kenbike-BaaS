"use server";

import type { AuthError } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import type { ActionState } from "@/lib/action-state";
import { safeNextPath } from "@/lib/auth/redirect";
import { publicEnv } from "@/lib/env/public";
import { createClient } from "@/lib/supabase/server";
import { formDataToObject, validationError, withoutSecrets } from "@/lib/validation";

import { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema } from "./schemas";

const siteUrl = (path: string) => new URL(path, publicEnv.NEXT_PUBLIC_SITE_URL).toString();

function callbackUrl(nextPath: string) {
  return siteUrl(`/auth/callback?next=${encodeURIComponent(nextPath)}`);
}

/** Pesan ramah tanpa membocorkan apakah email terdaftar. */
function authErrorMessage(error: AuthError): string {
  switch (error.code) {
    case "invalid_credentials":
      return "Email atau password salah.";
    case "email_not_confirmed":
      return "Email belum diverifikasi. Cek kotak masuk kamu untuk tautan verifikasi.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Terlalu banyak percobaan. Coba lagi beberapa menit lagi.";
    case "weak_password":
      return "Password terlalu lemah. Gunakan kombinasi huruf dan angka.";
    case "same_password":
      return "Password baru tidak boleh sama dengan password lama.";
    default:
      return "Terjadi kesalahan. Silakan coba lagi.";
  }
}

export async function signIn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = formDataToObject(formData);
  const parsed = loginSchema.safeParse(values);
  if (!parsed.success) return validationError(parsed.error, values);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { status: "error", message: authErrorMessage(error), values: withoutSecrets(values) };
  }

  redirect(safeNextPath(formData.get("next")));
}

export async function signUp(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = formDataToObject(formData);
  const parsed = registerSchema.safeParse(values);
  if (!parsed.success) return validationError(parsed.error, values);

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: callbackUrl(safeNextPath(formData.get("next"))),
    },
  });
  // Email yang sudah terdaftar tidak menghasilkan error (Supabase menyamarkannya),
  // sehingga pesan sukses yang sama tidak membocorkan keberadaan akun.
  if (error) {
    return { status: "error", message: authErrorMessage(error), values: withoutSecrets(values) };
  }

  return {
    status: "success",
    message: `Kami sudah mengirim tautan verifikasi ke ${parsed.data.email}. Buka tautan itu untuk mengaktifkan akun.`,
  };
}

export async function signInWithGoogle(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callbackUrl(safeNextPath(formData.get("next"))) },
  });
  if (error || !data.url) redirect("/login?error=oauth");
  redirect(data.url);
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function requestPasswordReset(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const values = formDataToObject(formData);
  const parsed = forgotPasswordSchema.safeParse(values);
  if (!parsed.success) return validationError(parsed.error, values);

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: callbackUrl("/reset-password"),
  });
  if (error?.code === "over_email_send_rate_limit") {
    return { status: "error", message: authErrorMessage(error) };
  }

  // Selalu sukses agar tidak membocorkan apakah email terdaftar.
  return {
    status: "success",
    message: `Jika ${parsed.data.email} terdaftar, tautan untuk mengatur ulang password sudah dikirim.`,
  };
}

export async function updatePassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = resetPasswordSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return validationError(parsed.error);

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) {
    return { status: "error", message: "Sesi reset password sudah habis. Minta tautan baru." };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { status: "error", message: authErrorMessage(error) };

  redirect("/account?password=updated");
}
