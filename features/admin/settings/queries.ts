import "server-only";

import { createClient } from "@/lib/supabase/server";

import type { StoreSettingsInput } from "./schemas";

/** Pengaturan toko aktif untuk form admin (RLS: admin saja). Null bila belum diisi. */
export async function getStoreSettingsForm(): Promise<StoreSettingsInput | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("store_settings")
    .select(
      "store_name, contact_name, phone, address_line, city, province, postal_code, biteship_area_id, note",
    )
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw new Error(`getStoreSettingsForm: ${error.message}`);
  if (!data) return null;
  return {
    storeName: data.store_name,
    contactName: data.contact_name,
    phone: data.phone,
    addressLine: data.address_line,
    area: {
      id: data.biteship_area_id,
      label: `${data.city}, ${data.province}. ${data.postal_code}`,
      // Kecamatan tidak disimpan di store_settings; cukup untuk tampilan.
      district: "",
      city: data.city,
      province: data.province,
      postalCode: data.postal_code,
    },
    note: data.note ?? "",
  };
}
