"use server";

import { refresh } from "next/cache";

import type { ActionState } from "@/lib/action-state";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formDataToObject, validationError } from "@/lib/validation";

import { profileSchema } from "./schemas";

export async function updateProfile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "Sesi kamu sudah habis. Silakan masuk lagi." };

  const values = formDataToObject(formData);
  const parsed = profileSchema.safeParse(values);
  if (!parsed.success) return validationError(parsed.error, values);

  const supabase = await createClient();
  // RLS membatasi ke baris milik sendiri; column grant hanya mengizinkan kolom ini.
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.fullName, phone: parsed.data.phone })
    .eq("id", user.id);

  if (error) return { status: "error", message: "Gagal menyimpan profil. Coba lagi.", values };

  refresh();
  return { status: "success", message: "Profil tersimpan." };
}
