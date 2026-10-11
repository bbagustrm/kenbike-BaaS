import type { Metadata } from "next";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { RegisterForm } from "@/features/auth";

import { AuthHeading } from "../auth-heading";

export const metadata: Metadata = { title: "Daftar" };

export default function RegisterPage() {
  return (
    <>
      <AuthHeading title="Buat akun" description="Belanja lebih cepat dan pantau pesananmu." />
      <Suspense fallback={<Skeleton className="h-[28rem] w-full" />}>
        <RegisterForm />
      </Suspense>
    </>
  );
}
