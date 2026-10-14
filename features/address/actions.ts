"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import type { ActionState } from "@/lib/action-state";
import { BiteshipError, searchAreas as biteshipSearchAreas } from "@/lib/biteship/client";
import { dbErrorMessage } from "@/lib/db-errors";
import { RATE_LIMITED_MESSAGE, rateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

import { addressFormSchema } from "./schemas";
import type { Area } from "./types";

async function session() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return { supabase, userId: data?.claims.sub ?? null };
}

const NOT_LOGGED_IN: ActionState = {
  status: "error",
  message: "Sesi berakhir. Silakan masuk lagi.",
};

const searchSchema = z.string().trim().min(3).max(60);

/** Autocomplete kecamatan/kota (Biteship Maps). Hanya untuk user login agar API key tidak disalahgunakan. */
export async function searchAreas(query: string): Promise<{ areas: Area[]; error?: string }> {
  const { userId } = await session();
  if (!userId) return { areas: [], error: NOT_LOGGED_IN.message };
  const parsed = searchSchema.safeParse(query);
  if (!parsed.success) return { areas: [] };
  if (!(await rateLimit("searchAreas", userId))) return { areas: [], error: RATE_LIMITED_MESSAGE };
  try {
    return { areas: (await biteshipSearchAreas(parsed.data)).slice(0, 20) };
  } catch (error) {
    return {
      areas: [],
      error: error instanceof BiteshipError ? error.message : "Gagal mencari area.",
    };
  }
}

function toRow(values: z.output<typeof addressFormSchema>) {
  const area = values.area!;
  return {
    label: values.label,
    recipient_name: values.recipientName,
    phone: values.phone,
    address_line: values.addressLine,
    district: area.district || null,
    city: area.city,
    province: area.province,
    postal_code: area.postalCode,
    biteship_area_id: area.id,
    note: values.note,
    is_default: values.isDefault,
  };
}

function invalid(error: z.ZodError): ActionState {
  return {
    status: "error",
    message: "Periksa kembali isian alamat.",
    fieldErrors: z.flattenError(error).fieldErrors as ActionState["fieldErrors"],
  };
}

/** Tambah (`id` null) atau ubah alamat milik sendiri. */
export async function saveAddress(id: string | null, input: unknown): Promise<ActionState> {
  const { supabase, userId } = await session();
  if (!userId) return NOT_LOGGED_IN;
  if (id !== null && !z.uuid().safeParse(id).success) {
    return { status: "error", message: "Alamat tidak ditemukan." };
  }
  const parsed = addressFormSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const row = toRow(parsed.data);
  if (id === null) {
    const { error } = await supabase.from("addresses").insert({ ...row, profile_id: userId });
    if (error) return { status: "error", message: dbErrorMessage(error) };
  } else {
    // Alamat utama tidak bisa dilepas langsung (lihat trigger); abaikan is_default=false.
    const { is_default, ...rest } = row;
    const { data, error } = await supabase
      .from("addresses")
      .update(is_default ? row : rest)
      .eq("id", id)
      .select("id")
      .maybeSingle();
    if (error) return { status: "error", message: dbErrorMessage(error) };
    if (!data) return { status: "error", message: "Alamat tidak ditemukan." };
  }

  refresh();
  return { status: "success", message: id ? "Alamat diperbarui." : "Alamat ditambahkan." };
}

export async function setDefaultAddress(id: string): Promise<ActionState> {
  const { supabase, userId } = await session();
  if (!userId) return NOT_LOGGED_IN;
  if (!z.uuid().safeParse(id).success)
    return { status: "error", message: "Alamat tidak ditemukan." };

  const { data, error } = await supabase
    .from("addresses")
    .update({ is_default: true })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) return { status: "error", message: dbErrorMessage(error) };
  if (!data) return { status: "error", message: "Alamat tidak ditemukan." };

  refresh();
  return { status: "success", message: "Alamat utama diganti." };
}

export async function deleteAddress(id: string): Promise<ActionState> {
  const { supabase, userId } = await session();
  if (!userId) return NOT_LOGGED_IN;
  if (!z.uuid().safeParse(id).success)
    return { status: "error", message: "Alamat tidak ditemukan." };

  const { data, error } = await supabase
    .from("addresses")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) return { status: "error", message: dbErrorMessage(error) };
  if (!data) return { status: "error", message: "Alamat tidak ditemukan." };

  refresh();
  return { status: "success", message: "Alamat dihapus." };
}
