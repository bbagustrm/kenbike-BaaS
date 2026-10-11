import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { requireAdmin } from "@/lib/auth/session";

// Kerangka sementara — sidebar & navigasi admin dikerjakan di #46.
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <Suspense fallback={<Skeleton className="m-8 h-40" />}>
        <AdminGate>{children}</AdminGate>
      </Suspense>
    </div>
  );
}

/** Non-admin mendapat 404; proxy.ts sudah mengarahkan tamu ke /login. */
async function AdminGate({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return children;
}
