import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Container } from "@/components/layout/container";
import { buttonVariants } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CatalogFilters,
  CatalogPagination,
  ProductGrid,
  ProductGridSkeleton,
  parseProductListParams,
} from "@/features/catalog";
import { listCategories, listProducts } from "@/features/catalog/queries";

export const metadata: Metadata = {
  title: "Produk",
  description: "Sepeda MTB, road bike, sepeda lipat, sparepart, dan aksesoris.",
};

export default function ProductsPage({ searchParams }: PageProps<"/products">) {
  return (
    <Container className="space-y-8 py-10">
      {/* searchParams adalah data request → semua yang membacanya di dalam Suspense. */}
      <Suspense fallback={<CatalogSkeleton />}>
        {searchParams.then((raw) => (
          <Catalog raw={raw} />
        ))}
      </Suspense>
    </Container>
  );
}

async function Catalog({ raw }: { raw: Record<string, string | string[] | undefined> }) {
  const params = parseProductListParams(raw);
  const [categories, result] = await Promise.all([listCategories(), listProducts(params)]);
  const category = categories.find((c) => c.slug === params.category);

  const title = params.q ? `Hasil pencarian "${params.q}"` : (category?.name ?? "Semua produk");

  return (
    <>
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        <p className="text-sm text-muted-foreground">{result.total} produk</p>
      </div>
      {/* key: reset nilai form saat URL berubah lewat navigasi lain (mis. menu). */}
      <CatalogFilters key={JSON.stringify(params)} params={params} categories={categories} />
      {result.items.length > 0 ? (
        <>
          <ProductGrid products={result.items} />
          <CatalogPagination params={params} pageCount={result.pageCount} />
        </>
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Produk tidak ditemukan</EmptyTitle>
            <EmptyDescription>Coba kata kunci lain atau longgarkan filter harga.</EmptyDescription>
          </EmptyHeader>
          <Link href="/products" className={buttonVariants({ variant: "outline" })}>
            Lihat semua produk
          </Link>
        </Empty>
      )}
    </>
  );
}

function CatalogSkeleton() {
  return (
    <>
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-20" />
      </div>
      <Skeleton className="h-16 w-full" />
      <ProductGridSkeleton />
    </>
  );
}
