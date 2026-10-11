import { z } from "zod";

import { SLUG_PATTERN } from "@/lib/slug";

const optionalUuid = z
  .union([z.uuid(), z.literal("")])
  .optional()
  .transform((v) => v || undefined);

export const categorySchema = z.object({
  id: optionalUuid,
  name: z
    .string()
    .trim()
    .min(1, { error: "Nama wajib diisi" })
    .max(100, { error: "Maksimal 100 karakter" }),
  slug: z
    .string()
    .trim()
    .min(1, { error: "Slug wajib diisi" })
    .max(100, { error: "Maksimal 100 karakter" })
    .regex(SLUG_PATTERN, { error: "Hanya huruf kecil, angka, dan tanda hubung" }),
  parentId: optionalUuid,
  sortOrder: z.coerce.number().int().min(0).max(9999).catch(0),
});
