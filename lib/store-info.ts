import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { createPublicClient } from "@/lib/supabase/public";

export type StoreInfo = {
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
};

const FALLBACK: StoreInfo = { name: "KenBike", phone: null, email: null, address: null };

/**
 * Info kontak toko untuk halaman publik (Kontak, kebijakan, footer).
 * store_settings admin-only → RPC public_store_info membuka kolom kontak saja,
 * sehingga cukup kunci anon (juga saat build/prerender di CI).
 * Di-cache; diperbarui lewat updateTag("store-info") saat admin menyimpan.
 */
export async function getStoreInfo(): Promise<StoreInfo> {
  "use cache";
  cacheTag("store-info");
  cacheLife("days");

  const { data, error } = await createPublicClient().rpc("public_store_info").maybeSingle();
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
