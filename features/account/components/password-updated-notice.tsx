"use client";

import { useSearchParams } from "next/navigation";

import { FormAlert } from "@/components/shared/form-alert";

export function PasswordUpdatedNotice() {
  if (useSearchParams().get("password") !== "updated") return null;
  return <FormAlert state={{ status: "success", message: "Password berhasil diperbarui." }} />;
}
