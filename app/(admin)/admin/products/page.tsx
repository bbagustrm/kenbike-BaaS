import { PlusIcon, SearchIcon } from "lucide-react";
import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { AdminPageHeader } from "@/features/admin";
import { ProductTable } from "@/features/admin/products/components/product-table";
import {
  type AdminProductListParams,
  listAdminProducts,
  listCategoryOptions,
} from "@/features/admin/products/queries";

export const metadata: Metadata = { title: "Produk · Admin" };

function first(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export default async function AdminProductsPage({ searchParams }: PageProps<"/admin/products">) {
  const raw = await searchParams;
  const status = first(raw.status);
  const params: AdminProductListParams = {
    q: first(raw.q)?.trim().slice(0, 100) || undefined,
    category: first(raw.category) || undefined,
    status: status === "active" || status === "inactive" ? status : undefined,
    page: Math.max(1, Math.min(500, Number.parseInt(first(raw.page) ?? "1", 10) || 1)),
  };

  const [{ rows, total, pageCount }, categories] = await Promise.all([
    listAdminProducts(params),
    listCategoryOptions(),
  ]);

  const pageHref = (page: number) => {
    const sp = new URLSearchParams();
    if (params.q) sp.set("q", params.q);
    if (params.category) sp.set("category", params.category);
    if (params.status) sp.set("status", params.status);
    if (page > 1) sp.set("page", String(page));
    const qs = sp.toString();
    return qs ? `/admin/products?${qs}` : "/admin/products";
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Produk"
        description={`${total} produk`}
        actions={
          <Link href="/admin/products/new" className={buttonVariants()}>
            <PlusIcon />
            Tambah produk
          </Link>
        }
      />

      <Form action="/admin/products" className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            type="search"
            placeholder="Cari nama produk…"
            aria-label="Cari produk"
            defaultValue={params.q}
            className="pl-8"
          />
        </div>
        <NativeSelect name="category" defaultValue={params.category ?? ""} aria-label="Kategori">
          <NativeSelectOption value="">Semua kategori</NativeSelectOption>
          {categories.map((c) => (
            <NativeSelectOption key={c.id} value={c.id}>
              {c.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <NativeSelect name="status" defaultValue={params.status ?? ""} aria-label="Status">
          <NativeSelectOption value="">Semua status</NativeSelectOption>
          <NativeSelectOption value="active">Aktif</NativeSelectOption>
          <NativeSelectOption value="inactive">Nonaktif</NativeSelectOption>
        </NativeSelect>
        <Button type="submit" variant="outline">
          Filter
        </Button>
      </Form>

      {rows.length > 0 ? (
        <ProductTable rows={rows} />
      ) : (
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>Belum ada produk yang cocok</EmptyTitle>
            <EmptyDescription>Ubah filter atau tambahkan produk baru.</EmptyDescription>
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
                href={pageHref(params.page - 1)}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Sebelumnya
              </Link>
            )}
            {params.page < pageCount && (
              <Link
                href={pageHref(params.page + 1)}
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
