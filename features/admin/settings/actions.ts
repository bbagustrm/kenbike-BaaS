"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import type { ActionState } from "@/lib/action-state";
import { dbErrorMessage } from "@/lib/db-errors";
import { createClient } from "@/lib/supabase/server";

import { assertAdminAction } from "../guard";
import { storeSettingsSchema } from "./schemas";

/** Simpan alamat toko: ubah baris aktif bila ada, selain itu buat baru. */
export async function saveStoreSettings(input: unknown): Promise<ActionState> {
  const denied = await assertAdminAction();
  if (denied) return denied;

  const parsed = storeSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Periksa kembali isian.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors as ActionState["fieldErrors"],
    };
  }
  const v = parsed.data;
  const area = v.area!;
  const row = {
    store_name: v.storeName,
    contact_name: v.contactName,
    phone: v.phone,
    address_line: v.addressLine,
    city: area.city,
    province: area.province,
    postal_code: area.postalCode,
    biteship_area_id: area.id,
    note: v.note,
  };

  const supabase = await createClient();
  const { data: active, error: readError } = await supabase
    .from("store_settings")
    .select("id")
    .eq("is_active", true)
    .maybeSingle();
  if (readError) return { status: "error", message: dbErrorMessage(readError) };

  const { error } = active
    ? await supabase.from("store_settings").update(row).eq("id", active.id)
    : await supabase.from("store_settings").insert({ ...row, is_active: true });
  if (error) return { status: "error", message: dbErrorMessage(error) };

  refresh();
  return { status: "success", message: "Pengaturan toko disimpan." };
}
