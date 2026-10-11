import "server-only";

import { BiteshipError, getRates } from "@/lib/biteship/client";
import type { ShippingRate } from "@/lib/biteship/types";
import { createAdminClient } from "@/lib/supabase/admin";
import type { createClient } from "@/lib/supabase/server";

import { toRateItems } from "./rate-items";

type UserClient = Awaited<ReturnType<typeof createClient>>;

export type ShippingQuote = { ok: true; rates: ShippingRate[] } | { ok: false; message: string };

/** Area asal pengiriman (store_settings hanya bisa dibaca admin → service role). */
async function storeOriginAreaId(): Promise<string | null> {
  const { data, error } = await createAdminClient()
    .from("store_settings")
    .select("biteship_area_id")
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw new Error(`store_settings: ${error.message}`);
  return data?.biteship_area_id ?? null;
}

/**
 * Opsi ongkir untuk isi keranjang user ke salah satu alamatnya. Semua data
 * (alamat, barang, berat) dibaca ulang dari DB — tidak ada angka dari client.
 * Dipakai cek ongkir di checkout dan validasi ulang saat membuat order (M6).
 */
export async function quoteShipping(
  supabase: UserClient,
  addressId: string,
): Promise<ShippingQuote> {
  const [address, cart, origin] = await Promise.all([
    // RLS: hanya alamat milik user ini yang terbaca.
    supabase.from("addresses").select("biteship_area_id").eq("id", addressId).maybeSingle(),
    supabase.from("cart_items").select(
      `quantity,
         variant:product_variants (price, weight_gram, length_cm, width_cm, height_cm,
           product:products (name))`,
    ),
    storeOriginAreaId(),
  ]);
  if (address.error) throw new Error(`addresses: ${address.error.message}`);
  if (cart.error) throw new Error(`cart_items: ${cart.error.message}`);

  if (!address.data) return { ok: false, message: "Alamat tidak ditemukan." };
  if (!address.data.biteship_area_id) {
    return { ok: false, message: "Lengkapi kecamatan pada alamat ini untuk menghitung ongkir." };
  }
  if (!origin) return { ok: false, message: "Toko belum mengatur alamat pengiriman." };

  const items = toRateItems(
    cart.data.flatMap((row) =>
      row.variant
        ? [
            {
              name: row.variant.product?.name ?? "Barang",
              price: row.variant.price,
              quantity: row.quantity,
              weightGram: row.variant.weight_gram,
              lengthCm: row.variant.length_cm,
              widthCm: row.variant.width_cm,
              heightCm: row.variant.height_cm,
            },
          ]
        : [],
    ),
  );
  if (items.length === 0) return { ok: false, message: "Keranjang masih kosong." };

  try {
    const rates = await getRates({
      originAreaId: origin,
      destinationAreaId: address.data.biteship_area_id,
      items,
    });
    if (rates.length === 0) {
      return { ok: false, message: "Belum ada kurir yang melayani alamat ini." };
    }
    return { ok: true, rates };
  } catch (error) {
    if (error instanceof BiteshipError) return { ok: false, message: error.message };
    throw error;
  }
}
