import type { Metadata } from "next";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { PasswordUpdatedNotice, ProfileForm } from "@/features/account";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Akun saya" };

export default function AccountPage() {
  return (
    <div className="space-y-6">
      <Suspense>
        <PasswordUpdatedNotice />
      </Suspense>
      <Suspense fallback={<Skeleton className="h-72 max-w-md" />}>
        <AccountProfile />
      </Suspense>
    </div>
  );
}

async function AccountProfile() {
  const user = await requireUser("/account");
  return <ProfileForm email={user.email} fullName={user.fullName} phone={user.phone} />;
}
