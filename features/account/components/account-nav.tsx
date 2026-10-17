"use client";

import { MapPinIcon, MessagesSquareIcon, PackageIcon, UserIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

import { UnreadBadge } from "@/features/chat/components/unread-badge";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/account/orders", label: "Pesanan", icon: PackageIcon },
  { href: "/account/messages", label: "Pesan", icon: MessagesSquareIcon, badge: true },
  { href: "/account", label: "Profil", icon: UserIcon },
  { href: "/account/addresses", label: "Alamat", icon: MapPinIcon },
] as const;

export function AccountNav() {
  // usePathname() = data request pada route dinamis → di dalam Suspense;
  // fallback-nya menu yang sama tanpa sorotan aktif (masuk static shell).
  return (
    <Suspense fallback={<NavLinks pathname={null} />}>
      <ActiveNavLinks />
    </Suspense>
  );
}

function ActiveNavLinks() {
  return <NavLinks pathname={usePathname()} />;
}

function NavLinks({ pathname }: { pathname: string | null }) {
  return (
    <nav aria-label="Menu akun" className="flex gap-1 overflow-x-auto border-b">
      {ITEMS.map((item) => {
        // /account/orders/<nomor> tetap menyorot tab Pesanan.
        const active =
          pathname !== null &&
          (item.href === "/account" ? pathname === item.href : pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
              active
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <item.icon className="size-4" aria-hidden="true" />
            {item.label}
            {"badge" in item && <UnreadBadge live />}
          </Link>
        );
      })}
    </nav>
  );
}
