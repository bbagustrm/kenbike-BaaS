"use client";

import {
  ExternalLinkIcon,
  FolderTreeIcon,
  LayoutDashboardIcon,
  PackageIcon,
  StoreIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

// Menu ditambah seiring fitur: Order (M9), Pengaturan toko (M5), Pengguna (M9).
const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboardIcon, exact: true },
  { href: "/admin/products", label: "Produk", icon: PackageIcon },
  { href: "/admin/categories", label: "Kategori", icon: FolderTreeIcon },
] as const;

export function AdminSidebar() {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/admin" />} tooltip="KenBike Admin">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
                K
              </span>
              {/* Saat sidebar diciutkan hanya logo "K" yang tampil. */}
              <span className="truncate font-semibold group-data-[collapsible=icon]:hidden">
                KenBike Admin
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              render={<Link href="/" target="_blank" />}
              tooltip="Lihat toko"
              variant="outline"
            >
              <StoreIcon />
              <span>Lihat toko</span>
              <ExternalLinkIcon className="ml-auto group-data-[collapsible=icon]:hidden" />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Kelola</SidebarGroupLabel>
          <SidebarGroupContent>
            {/* usePathname() adalah data request pada route dinamis → di dalam Suspense;
                fallback-nya menu yang sama tanpa sorotan aktif (masuk static shell). */}
            <Suspense fallback={<NavItems pathname={null} />}>
              <ActiveNavItems />
            </Suspense>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}

function ActiveNavItems() {
  return <NavItems pathname={usePathname()} />;
}

function NavItems({ pathname }: { pathname: string | null }) {
  const isActive = (href: string, exact?: boolean) =>
    pathname !== null &&
    (exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`));

  return (
    <SidebarMenu>
      {NAV.map((item) => (
        <SidebarMenuItem key={item.href}>
          <SidebarMenuButton
            render={<Link href={item.href} />}
            isActive={isActive(item.href, "exact" in item && item.exact)}
            tooltip={item.label}
          >
            <item.icon />
            <span>{item.label}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
