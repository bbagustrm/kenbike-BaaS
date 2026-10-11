import type { Metadata } from "next";
import { Suspense } from "react";

import { Container } from "@/components/layout/container";
import { Skeleton } from "@/components/ui/skeleton";
import { PasswordUpdatedNotice, ProfileForm } from "@/features/account";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Akun saya" };

export default function AccountPage() {
  return (
    <Container className="space-y-6 py-10">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Akun saya</h1>
        <p className="text-muted-foreground">Kelola data dirimu.</p>
      </div>
      <Suspense>
        <PasswordUpdatedNotice />
      </Suspense>
      <Suspense fallback={<Skeleton className="h-72 max-w-md" />}>
        <AccountProfile />
      </Suspense>
    </Container>
  );
}

async function AccountProfile() {
  const user = await requireUser("/account");
  return <ProfileForm email={user.email} fullName={user.fullName} phone={user.phone} />;
}
