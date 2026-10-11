"use client";

import { MapPinIcon, UserIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

// Menu bertambah seiring fitur: Pesanan (M8).
const ITEMS = [
  { href: "/account", label: "Profil", icon: UserIcon },
  { href: "/account/addresses", label: "Alamat", icon: MapPinIcon },
] as const;

export function AccountNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Menu akun" className="flex gap-1 overflow-x-auto border-b">
      {ITEMS.map((item) => {
        const active = pathname === item.href;
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
          </Link>
        );
      })}
    </nav>
  );
}
