import { z } from "zod";

/** Area Biteship yang dipilih lewat autocomplete (kecamatan, kota, provinsi, kode pos). */
export const areaSchema = z.object(
  {
    id: z.string().trim().min(1).max(100),
    label: z.string().trim().max(300),
    district: z.string().trim().max(120),
    city: z.string().trim().min(1).max(120),
    province: z.string().trim().min(1).max(120),
    postalCode: z.string().regex(/^[0-9]{5}$/),
  },
  { error: "Pilih kecamatan / kota dari daftar" },
);
