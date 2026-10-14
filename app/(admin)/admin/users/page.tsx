import { SearchIcon } from "lucide-react";
import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { AdminPageHeader } from "@/features/admin";
import { UserTable } from "@/features/admin/users/components/user-table";
import { listAdminUsers, parseAdminUserParams } from "@/features/admin/users/queries";
import { requireAdmin } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Pengguna · Admin" };

export default async function AdminUsersPage({ searchParams }: PageProps<"/admin/users">) {
  const params = parseAdminUserParams(await searchParams);
  const [me, { users, total, pageCount }] = await Promise.all([
    requireAdmin(),
    listAdminUsers(params),
  ]);

  const href = (page: number) => {
    const sp = new URLSearchParams();
    if (params.q) sp.set("q", params.q);
    if (params.role) sp.set("role", params.role);
    if (page > 1) sp.set("page", String(page));
    const qs = sp.toString();
    return qs ? `/admin/users?${qs}` : "/admin/users";
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Pengguna" description={`${total} pengguna`} />

      <Form action="/admin/users" className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            type="search"
            placeholder="Cari nama atau email…"
            aria-label="Cari pengguna"
            defaultValue={params.q}
            className="pl-8"
          />
        </div>
        <NativeSelect name="role" defaultValue={params.role ?? ""} aria-label="Role">
          <NativeSelectOption value="">Semua role</NativeSelectOption>
          <NativeSelectOption value="admin">Admin</NativeSelectOption>
          <NativeSelectOption value="customer">Customer</NativeSelectOption>
        </NativeSelect>
        <Button type="submit">Terapkan</Button>
      </Form>

      {users.length > 0 ? (
        <UserTable users={users} currentUserId={me.id} />
      ) : (
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>Tidak ada pengguna yang cocok</EmptyTitle>
            <EmptyDescription>Ubah kata kunci atau filter role.</EmptyDescription>
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
                href={href(params.page - 1)}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Sebelumnya
              </Link>
            )}
            {params.page < pageCount && (
              <Link
                href={href(params.page + 1)}
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
