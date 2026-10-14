import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";

export type StoreInfo = {
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
};

const FALLBACK: StoreInfo = { name: "KenBike", phone: null, email: null, address: null };

/**
 * Info kontak toko untuk halaman publik (Kontak, kebijakan, footer).
 * store_settings hanya bisa dibaca admin → service role, hanya kolom publik.
 * Di-cache; diperbarui lewat updateTag("store-info") saat admin menyimpan.
 */
export async function getStoreInfo(): Promise<StoreInfo> {
  "use cache";
  cacheTag("store-info");
  cacheLife("days");

  const { data, error } = await createAdminClient()
    .from("store_settings")
    .select("store_name, phone, email, address_line, city, province, postal_code")
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw new Error(`getStoreInfo: ${error.message}`);
  if (!data) return FALLBACK;

  return {
    name: data.store_name,
    phone: data.phone,
    email: data.email,
    address: `${data.address_line}, ${data.city}, ${data.province} ${data.postal_code}`,
  };
}

/** Nomor lokal "0812…" → tautan WhatsApp "62812…". */
export function whatsappUrl(phone: string): string {
  const digits = phone.replace(/\D/g, "").replace(/^0/, "62");
  return `https://wa.me/${digits}`;
}
