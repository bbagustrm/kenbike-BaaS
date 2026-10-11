import { UserIcon } from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

/**
 * Slot user di navbar. Membaca data request (cookies), jadi harus dirender di
 * dalam <Suspense> agar sisa halaman tetap masuk static shell.
 *
 * TODO(#38): ganti dengan getUser() Supabase + UserMenu setelah auth tersedia.
 */
export async function UserSlot() {
  await cookies();

  return (
    <Link href="/login" className={buttonVariants({ variant: "outline", size: "sm" })}>
      <UserIcon />
      Masuk
    </Link>
  );
}
