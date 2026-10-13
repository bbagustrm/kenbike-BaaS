import { PackageIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { buttonVariants } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import {
  OrderFilters,
  OrderList,
  type OrderFilter,
  ordersHref,
  parseOrderFilter,
} from "@/features/orders";
import { listMyOrders } from "@/features/orders/queries";
import { requireUser } from "@/lib/auth/session";
import { firstParam } from "@/lib/search";

export const metadata: Metadata = { title: "Pesanan saya" };

export default function OrdersPage({ searchParams }: PageProps<"/account/orders">) {
  return (
    <Suspense fallback={<OrdersSkeleton />}>
      {searchParams.then((sp) => (
        <Orders
          filter={parseOrderFilter(firstParam(sp.status))}
          page={Math.max(1, Math.min(500, Number.parseInt(firstParam(sp.page) ?? "1", 10) || 1))}
        />
      ))}
    </Suspense>
  );
}

async function Orders({ filter, page }: { filter?: OrderFilter; page: number }) {
  await requireUser("/account/orders");
  const { orders, total, pageCount } = await listMyOrders({ filter, page });

  return (
    <div className="space-y-4">
      <OrderFilters active={filter} />
      {orders.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <PackageIcon />
            </EmptyMedia>
            <EmptyTitle>
              {filter ? "Tidak ada pesanan dengan status ini" : "Belum ada pesanan"}
            </EmptyTitle>
            <EmptyDescription>
              {filter ? "Coba filter lain." : "Pesanan yang kamu buat akan muncul di sini."}
            </EmptyDescription>
          </EmptyHeader>
          {!filter && (
            <Link href="/products" className={buttonVariants()}>
              Mulai belanja
            </Link>
          )}
        </Empty>
      ) : (
        <OrderList orders={orders} />
      )}
      {pageCount > 1 && (
        <nav aria-label="Halaman" className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {total} pesanan · halaman {page} dari {pageCount}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={ordersHref(filter, page - 1)}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Sebelumnya
              </Link>
            )}
            {page < pageCount && (
              <Link
                href={ordersHref(filter, page + 1)}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Berikutnya
              </Link>
            )}
          </div>
        </nav>
      )}
    </div>
  );
}

function OrdersSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true">
      <Skeleton className="h-8 w-80" />
      {Array.from({ length: 3 }, (_, i) => (
        <Skeleton key={i} className="h-24 w-full" />
      ))}
    </div>
  );
}
