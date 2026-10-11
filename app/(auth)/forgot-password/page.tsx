import type { Metadata } from "next";

import { ForgotPasswordForm } from "@/features/auth";

import { AuthHeading } from "../auth-heading";

export const metadata: Metadata = { title: "Lupa password" };

export default function ForgotPasswordPage() {
  return (
    <>
      <AuthHeading
        title="Lupa password"
        description="Masukkan email akunmu, kami kirimkan tautan untuk mengatur ulang password."
      />
      <ForgotPasswordForm />
    </>
  );
}
