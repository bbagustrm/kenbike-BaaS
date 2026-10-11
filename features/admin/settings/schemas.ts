import { z } from "zod";

import { areaSchema } from "@/lib/biteship/schemas";
import { requiredPhoneSchema } from "@/lib/phone";
import { optionalText } from "@/lib/validation";

/** Alamat toko = asal pengiriman (origin) untuk cek ongkir & order Biteship. */
export const storeSettingsSchema = z.object({
  storeName: z
    .string()
    .trim()
    .min(1, { error: "Nama toko wajib diisi" })
    .max(100, { error: "Maksimal 100 karakter" }),
  contactName: z
    .string()
    .trim()
    .min(1, { error: "Nama kontak wajib diisi" })
    .max(120, { error: "Maksimal 120 karakter" }),
  phone: requiredPhoneSchema,
  addressLine: z
    .string()
    .trim()
    .min(5, { error: "Alamat minimal 5 karakter" })
    .max(500, { error: "Alamat maksimal 500 karakter" }),
  area: areaSchema.nullable().refine((v) => v !== null, {
    error: "Pilih kecamatan / kota dari daftar",
  }),
  note: optionalText(200, "Catatan"),
});

export type StoreSettingsInput = z.input<typeof storeSettingsSchema>;
export type StoreSettingsValues = z.output<typeof storeSettingsSchema>;
