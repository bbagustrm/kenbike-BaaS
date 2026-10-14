import { SearchIcon } from "lucide-react";
import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { AdminPageHeader } from "@/features/admin";
import { AdminOrderTable } from "@/features/admin/orders/components/admin-order-table";
import {
  ADMIN_ORDER_FILTERS,
  adminOrdersHref,
  parseAdminOrderParams,
} from "@/features/admin/orders/filters";
import { listAdminOrders } from "@/features/admin/orders/queries";

export const metadata: Metadata = { title: "Pesanan · Admin" };

export default async function AdminOrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  const params = parseAdminOrderParams(await searchParams);
  const { rows, total, pageCount } = await listAdminOrders(params);
  const hasFilters = Boolean(params.filter || params.q || params.from || params.to);

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Pesanan" description={`${total} pesanan`} />

      <Form action="/admin/orders" className="flex flex-wrap items-end gap-2">
        <div className="relative min-w-56 flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            type="search"
            placeholder="Nomor pesanan atau nama penerima…"
            aria-label="Cari pesanan"
            defaultValue={params.q}
            className="pl-8"
          />
        </div>
        <NativeSelect name="status" defaultValue={params.filter ?? ""} aria-label="Status">
          <NativeSelectOption value="">Semua status</NativeSelectOption>
          {Object.entries(ADMIN_ORDER_FILTERS).map(([value, label]) => (
            <NativeSelectOption key={value} value={value}>
              {label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Dari
          <Input type="date" name="from" defaultValue={params.from} className="w-40" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Sampai
          <Input type="date" name="to" defaultValue={params.to} className="w-40" />
        </label>
        <Button type="submit">Terapkan</Button>
        {hasFilters && (
          <Link href="/admin/orders" className={buttonVariants({ variant: "ghost" })}>
            Reset
          </Link>
        )}
      </Form>

      {rows.length > 0 ? (
        <AdminOrderTable rows={rows} />
      ) : (
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>Tidak ada pesanan yang cocok</EmptyTitle>
            <EmptyDescription>
              {hasFilters ? "Ubah filter pencarian." : "Pesanan pertama akan muncul di sini."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {pageCount > 1 && (
        <nav aria-label="Halaman" className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Halaman {params.page} dari {pageCount}
          </span>
          <div className="flex gap-2">
            {params.page > 1 && (
              <Link
                href={adminOrdersHref({ ...params, page: params.page - 1 })}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Sebelumnya
              </Link>
            )}
            {params.page < pageCount && (
              <Link
                href={adminOrdersHref({ ...params, page: params.page + 1 })}
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
