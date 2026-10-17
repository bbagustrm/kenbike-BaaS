import { SearchIcon } from "lucide-react";
import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { AdminPageHeader } from "@/features/admin";
import { AdminCommentList } from "@/features/admin/comments/components/admin-comment-list";
import {
  adminCommentsHref,
  COMMENT_FILTERS,
  parseAdminCommentParams,
} from "@/features/admin/comments/params";
import { listAdminComments } from "@/features/admin/comments/queries";
import { listProductChoices } from "@/features/admin/reviews/queries";

export const metadata: Metadata = { title: "Komentar · Admin" };

export default async function AdminCommentsPage({ searchParams }: PageProps<"/admin/comments">) {
  const params = parseAdminCommentParams(await searchParams);
  const [{ comments, total, pageCount }, products] = await Promise.all([
    listAdminComments(params),
    listProductChoices(),
  ]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Komentar"
        description={`${total} ${COMMENT_FILTERS[params.filter].toLowerCase()} · tanya-jawab di halaman produk`}
      />

      <Form action="/admin/comments" className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            type="search"
            placeholder="Isi komentar, nama, atau produk…"
            aria-label="Cari komentar"
            defaultValue={params.q}
            className="pl-8"
          />
        </div>
        <NativeSelect name="status" defaultValue={params.filter} aria-label="Status">
          {Object.entries(COMMENT_FILTERS).map(([value, label]) => (
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
      </Form>

      {comments.length > 0 ? (
        <AdminCommentList comments={comments} />
      ) : (
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>
              {params.filter === "unanswered"
                ? "Semua pertanyaan sudah dijawab 🎉"
                : "Tidak ada komentar"}
            </EmptyTitle>
            <EmptyDescription>
              {params.q || params.productId
                ? "Ubah filter pencarian."
                : "Pertanyaan pembeli di halaman produk akan muncul di sini."}
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
                href={adminCommentsHref({ ...params, page: params.page - 1 })}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Sebelumnya
              </Link>
            )}
            {params.page < pageCount && (
              <Link
                href={adminCommentsHref({ ...params, page: params.page + 1 })}
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
