"use server";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

import { quoteShipping, type ShippingQuote } from "./shipping";

/** Cek ongkir isi keranjang ke alamat terpilih (dipanggil dari halaman checkout). */
export async function getShippingRates(addressId: string): Promise<ShippingQuote> {
  if (!z.uuid().safeParse(addressId).success) {
    return { ok: false, message: "Alamat tidak ditemukan." };
  }
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims.sub) return { ok: false, message: "Sesi berakhir. Silakan masuk lagi." };

  try {
    return await quoteShipping(supabase, addressId);
  } catch (error) {
    console.error("[getShippingRates]", error);
    return { ok: false, message: "Gagal menghitung ongkir. Coba lagi." };
  }
}
