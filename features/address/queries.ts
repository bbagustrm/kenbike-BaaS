import "server-only";

import { createClient } from "@/lib/supabase/server";

import type { Address } from "./types";

const COLUMNS =
  "id, label, recipient_name, phone, address_line, district, city, province, postal_code, biteship_area_id, note, is_default";

type Row = {
  id: string;
  label: string | null;
  recipient_name: string;
  phone: string;
  address_line: string;
  district: string | null;
  city: string;
  province: string;
  postal_code: string;
  biteship_area_id: string | null;
  note: string | null;
  is_default: boolean;
};

export function toAddress(row: Row): Address {
  return {
    id: row.id,
    label: row.label,
    recipientName: row.recipient_name,
    phone: row.phone,
    addressLine: row.address_line,
    area: row.biteship_area_id
      ? {
          id: row.biteship_area_id,
          label:
            [row.district, row.city, row.province].filter(Boolean).join(", ") +
            `. ${row.postal_code}`,
          district: row.district ?? "",
          city: row.city,
          province: row.province,
          postalCode: row.postal_code,
        }
      : null,
    note: row.note,
    isDefault: row.is_default,
  };
}

/** Alamat milik user yang login (RLS), alamat utama dulu lalu terbaru. Tanpa cache. */
export async function listMyAddresses(): Promise<Address[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("addresses")
    .select(COLUMNS)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(`listMyAddresses: ${error.message}`);
  return data.map(toAddress);
}

/** Apakah user sudah punya alamat yang bisa dipakai kirim (punya area Biteship). */
export async function hasShippableAddress(): Promise<boolean> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("addresses")
    .select("id", { count: "exact", head: true })
    .not("biteship_area_id", "is", null);
  if (error) throw new Error(`hasShippableAddress: ${error.message}`);
  return (count ?? 0) > 0;
}
