import { Suspense } from "react";

import { UserSlot } from "@/components/layout/user-slot";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminContentSkeleton, AdminSidebar } from "@/features/admin";
import { requireAdmin } from "@/lib/auth/session";

/**
 * Kerangka admin (sidebar + header) statis; konten halaman hanya dirender
 * setelah requireAdmin() lolos. Non-admin mendapat 404, tamu sudah diarahkan
 * ke /login oleh proxy.ts.
 */
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <Suspense fallback={<Skeleton className="size-8 rounded-full" />}>
              <UserSlot />
            </Suspense>
          </div>
        </header>
        <div className="flex-1 p-4 sm:p-6">
          <Suspense fallback={<AdminContentSkeleton />}>
            <AdminGate>{children}</AdminGate>
          </Suspense>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

async function AdminGate({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return children;
}
