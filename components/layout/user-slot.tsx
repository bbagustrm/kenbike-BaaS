import { UserIcon } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { UserMenu } from "@/features/auth";
import { getCurrentUser } from "@/lib/auth/session";

/**
 * Slot user di navbar. Membaca session (cookies), jadi harus dirender di
 * dalam <Suspense> agar sisa halaman tetap masuk static shell.
 */
export async function UserSlot() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <Link href="/login" className={buttonVariants({ variant: "outline", size: "sm" })}>
        <UserIcon />
        Masuk
      </Link>
    );
  }

  return (
    <UserMenu
      name={user.fullName}
      email={user.email}
      avatarUrl={user.avatarUrl}
      isAdmin={user.role === "admin"}
    />
  );
}
