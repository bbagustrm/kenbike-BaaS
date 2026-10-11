"use client";

import { FolderTreeIcon, LayoutDashboardIcon, PackageIcon, StoreIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
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
            <SidebarMenuButton size="lg" render={<Link href="/admin" />}>
              <span className="flex size-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
                K
              </span>
              <span className="font-semibold">KenBike Admin</span>
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
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton render={<Link href="/" />} tooltip="Lihat toko">
              <StoreIcon />
              <span>Lihat toko</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
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
