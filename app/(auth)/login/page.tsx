import type { Metadata } from "next";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { LoginForm } from "@/features/auth";

import { AuthHeading } from "../auth-heading";

export const metadata: Metadata = { title: "Masuk" };

export default function LoginPage() {
  return (
    <>
      <AuthHeading title="Masuk ke KenBike" description="Selamat datang kembali!" />
      {/* LoginForm membaca searchParams (next, error) → perlu Suspense. */}
      <Suspense fallback={<Skeleton className="h-80 w-full" />}>
        <LoginForm />
      </Suspense>
    </>
  );
}
