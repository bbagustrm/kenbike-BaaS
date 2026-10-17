import { SearchIcon } from "lucide-react";
import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { AdminPageHeader } from "@/features/admin";
import { AdminReviewList } from "@/features/admin/reviews/components/admin-review-list";
import { ImportReviewDialog } from "@/features/admin/reviews/components/import-review-dialog";
import {
  adminReviewsHref,
  parseAdminReviewParams,
  REVIEW_SOURCE_FILTERS,
  REVIEW_STATUS_FILTERS,
} from "@/features/admin/reviews/params";
import { listAdminReviews, listProductChoices } from "@/features/admin/reviews/queries";
import { requireAdmin } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Ulasan · Admin" };

export default async function AdminReviewsPage({ searchParams }: PageProps<"/admin/reviews">) {
  const params = parseAdminReviewParams(await searchParams);
  const [admin, { reviews, total, pageCount }, products] = await Promise.all([
    requireAdmin(),
    listAdminReviews(params),
    listProductChoices(),
  ]);
  const hasFilters = Boolean(
    params.q || params.rating || params.status || params.source || params.productId,
  );

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Ulasan"
        description={`${total} ulasan`}
        actions={<ImportReviewDialog products={products} adminId={admin.id} />}
      />

      <Form action="/admin/reviews" className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            type="search"
            placeholder="Nama pengulas atau isi ulasan…"
            aria-label="Cari ulasan"
            defaultValue={params.q}
            className="pl-8"
          />
        </div>
        <NativeSelect name="status" defaultValue={params.status ?? ""} aria-label="Status balasan">
          <NativeSelectOption value="">Semua status</NativeSelectOption>
          {Object.entries(REVIEW_STATUS_FILTERS).map(([value, label]) => (
            <NativeSelectOption key={value} value={value}>
              {label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <NativeSelect name="rating" defaultValue={params.rating ?? ""} aria-label="Bintang">
          <NativeSelectOption value="">Semua bintang</NativeSelectOption>
          {[5, 4, 3, 2, 1].map((star) => (
            <NativeSelectOption key={star} value={star}>
              {star} bintang
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <NativeSelect name="source" defaultValue={params.source ?? ""} aria-label="Sumber">
          <NativeSelectOption value="">Semua sumber</NativeSelectOption>
          {Object.entries(REVIEW_SOURCE_FILTERS).map(([value, label]) => (
            <NativeSelectOption key={value} value={value}>
              {label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <NativeSelect
          name="product"
          defaultValue={params.productId ?? ""}
          aria-label="Produk"
          className="max-w-56"
        >
          <NativeSelectOption value="">Semua produk</NativeSelectOption>
          {products.map((p) => (
            <NativeSelectOption key={p.id} value={p.id}>
              {p.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <Button type="submit">Terapkan</Button>
        {hasFilters && (
          <Link href="/admin/reviews" className={buttonVariants({ variant: "ghost" })}>
            Reset
          </Link>
        )}
      </Form>

      {reviews.length > 0 ? (
        <AdminReviewList reviews={reviews} />
      ) : (
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>Tidak ada ulasan</EmptyTitle>
            <EmptyDescription>
              {hasFilters
                ? "Ubah filter pencarian."
                : "Ulasan pembeli akan muncul di sini. Pindahkan ulasan Shopee lewat “Tambah ulasan”."}
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
                href={adminReviewsHref({ ...params, page: params.page - 1 })}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Sebelumnya
              </Link>
            )}
            {params.page < pageCount && (
              <Link
                href={adminReviewsHref({ ...params, page: params.page + 1 })}
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
