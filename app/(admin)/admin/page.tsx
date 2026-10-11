import { FolderTreeIcon, PackageIcon, PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminPageHeader } from "@/features/admin";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Dashboard · Admin" };

// Ringkasan sementara; dashboard penjualan lengkap dikerjakan di M9 (#72).
export default async function AdminHomePage() {
  const supabase = await createClient();
  const [products, inactive, categories] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("is_active", false),
    supabase.from("categories").select("id", { count: "exact", head: true }),
  ]);

  const stats = [
    {
      href: "/admin/products",
      icon: PackageIcon,
      label: "Produk",
      value: products.count ?? 0,
      note: `${inactive.count ?? 0} nonaktif`,
    },
    {
      href: "/admin/categories",
      icon: FolderTreeIcon,
      label: "Kategori",
      value: categories.count ?? 0,
      note: "Termasuk sub-kategori",
    },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Dashboard"
        actions={
          <Link href="/admin/products/new" className={buttonVariants()}>
            <PlusIcon />
            Tambah produk
          </Link>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Card className="transition-colors hover:bg-muted/50">
              <CardHeader>
                <CardDescription className="flex items-center gap-2">
                  <s.icon className="size-4" aria-hidden="true" />
                  {s.label}
                </CardDescription>
                <CardTitle className="text-3xl tabular-nums">{s.value}</CardTitle>
                <p className="text-xs text-muted-foreground">{s.note}</p>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
