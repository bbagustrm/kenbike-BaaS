import { z } from "zod";

import { areaSchema } from "@/lib/biteship/schemas";
import { requiredPhoneSchema } from "@/lib/phone";

const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, { error: `${label} maksimal ${max} karakter` })
    .transform((v) => v || null);

export const addressFormSchema = z.object({
  label: optionalText(50, "Label"),
  recipientName: z
    .string()
    .trim()
    .min(1, { error: "Nama penerima wajib diisi" })
    .max(120, { error: "Nama penerima maksimal 120 karakter" }),
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
  isDefault: z.boolean(),
});

export type AddressFormInput = z.input<typeof addressFormSchema>;
export type AddressFormValues = z.output<typeof addressFormSchema>;
