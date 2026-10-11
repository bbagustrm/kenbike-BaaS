import { z } from "zod";

import type { ActionState } from "./action-state";

export function validationError(error: z.ZodError, values?: Record<string, string>): ActionState {
  return {
    status: "error",
    message: "Periksa kembali isian kamu.",
    fieldErrors: z.flattenError(error).fieldErrors as ActionState["fieldErrors"],
    values: values && withoutSecrets(values),
  };
}

/** Buang field rahasia sebelum nilai form dikembalikan ke client. */
export function withoutSecrets(values: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(values).filter(([key]) => !/password/i.test(key)));
}

/** Ambil field teks dari FormData (File diabaikan) untuk divalidasi Zod. */
export function formDataToObject(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of formData) {
    if (typeof value === "string") out[key] = value;
  }
  return out;
}
