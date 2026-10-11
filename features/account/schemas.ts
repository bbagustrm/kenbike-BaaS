import { z } from "zod";

import { phoneSchema } from "@/lib/phone";

export const profileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, { error: "Nama minimal 2 karakter" })
    .max(120, { error: "Nama maksimal 120 karakter" }),
  phone: phoneSchema,
});
