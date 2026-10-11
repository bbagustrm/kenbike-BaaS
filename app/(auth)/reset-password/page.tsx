import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ResetPasswordForm } from "@/features/auth";
import { getCurrentUser } from "@/lib/auth/session";

import { AuthHeading } from "../auth-heading";

export const metadata: Metadata = { title: "Atur ulang password" };

export default function ResetPasswordPage() {
  return (
    <>
      <AuthHeading title="Atur ulang password" />
      <Suspense fallback={<Skeleton className="h-56 w-full" />}>
        <ResetGate />
      </Suspense>
    </>
  );
}

/** Halaman ini hanya berguna dengan session dari tautan reset di email. */
async function ResetGate() {
  const user = await getCurrentUser();
  if (user) return <ResetPasswordForm />;

  return (
    <div className="space-y-4 text-center">
      <p className="text-sm text-muted-foreground">
        Tautan reset password tidak valid atau sudah kedaluwarsa.
      </p>
      <Link href="/forgot-password" className={buttonVariants({ className: "w-full" })}>
        Minta tautan baru
      </Link>
    </div>
  );
}
