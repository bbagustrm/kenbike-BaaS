import { AlertTriangleIcon, ClockIcon, PackageIcon, TruckIcon, Undo2Icon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Price } from "@/components/shared/price";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminPageHeader } from "@/features/admin";
import { SalesChart } from "@/features/admin/dashboard/components/sales-chart";
import { getDashboard } from "@/features/admin/dashboard/queries";
import { AdminOrderTable } from "@/features/admin/orders/components/admin-order-table";
import { listAdminOrders } from "@/features/admin/orders/queries";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Dashboard · Admin" };

export default async function AdminHomePage() {
  const [d, recent] = await Promise.all([getDashboard(), listAdminOrders({ page: 1 })]);

  const queues = [
    {
      href: "/admin/orders?status=attention",
      icon: AlertTriangleIcon,
      label: "Perlu tindakan",
      value: d.attention,
      urgent: d.attention > 0,
    },
    {
      href: "/admin/orders?status=refund",
      icon: Undo2Icon,
      label: "Menunggu refund",
      value: d.refundPending,
      urgent: d.refundPending > 0,
    },
    {
      href: "/admin/orders?status=processing",
      icon: PackageIcon,
      label: "Perlu dikirim",
      value: d.toShip,
    },
    {
      href: "/admin/orders?status=unpaid",
      icon: ClockIcon,
      label: "Menunggu bayar",
      value: d.pendingPayment,
    },
    {
      href: "/admin/orders?status=shipped",
      icon: TruckIcon,
      label: "Dalam pengiriman",
      value: d.shipped,
    },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Dashboard" description="Omzet dihitung dari pesanan lunas (WIB)." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Omzet hari ini</CardDescription>
            <CardTitle className="text-2xl">
              <Price min={d.revenue.today} />
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {d.paidToday} lunas · {d.ordersToday} pesanan dibuat
            </p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Omzet 7 hari</CardDescription>
            <CardTitle className="text-2xl">
              <Price min={d.revenue.week} />
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Omzet 30 hari</CardDescription>
            <CardTitle className="text-2xl">
              <Price min={d.revenue.month} />
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Stok menipis</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{d.lowStock.length}</CardTitle>
            <p className="text-xs text-muted-foreground">varian aktif ≤ 2 tersedia</p>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {queues.map((q) => (
          <Link
            key={q.href}
            href={q.href}
            className="rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Card
              className={
                q.urgent
                  ? "border-destructive/50 transition-colors hover:bg-muted/50"
                  : "transition-colors hover:bg-muted/50"
              }
            >
              <CardHeader>
                <CardDescription className="flex items-center gap-2">
                  <q.icon
                    className={q.urgent ? "size-4 text-destructive" : "size-4"}
                    aria-hidden="true"
                  />
                  {q.label}
                </CardDescription>
                <CardTitle className="text-3xl tabular-nums">{q.value}</CardTitle>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[1fr_22rem]">
        <Card>
          <CardHeader>
            <CardTitle>Omzet harian · 30 hari</CardTitle>
          </CardHeader>
          <CardContent>
            <SalesChart data={d.daily} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stok menipis</CardTitle>
          </CardHeader>
          <CardContent>
            {d.lowStock.length === 0 ? (
              <p className="text-sm text-muted-foreground">Semua stok aman.</p>
            ) : (
              <ul className="divide-y text-sm">
                {d.lowStock.map((s) => (
                  <li key={s.sku} className="flex items-center justify-between gap-2 py-2">
                    <Link
                      href={`/admin/products/${s.product_id}`}
                      className="min-w-0 hover:underline"
                    >
                      <span className="block truncate">{s.product_name}</span>
                      <span className="font-mono text-xs text-muted-foreground">{s.sku}</span>
                    </Link>
                    <span
                      className={
                        s.available === 0
                          ? "shrink-0 text-xs font-medium text-destructive"
                          : "shrink-0 text-xs tabular-nums"
                      }
                    >
                      {s.available === 0 ? "Habis" : `Sisa ${s.available}`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Job terjadwal</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y text-sm">
            {d.cron.map((job) => {
              const failing = job.lastStatus === "failed" || job.failures24h > 0;
              return (
                <li
                  key={job.name}
                  className="flex flex-wrap items-center justify-between gap-2 py-2"
                >
                  <span className="font-mono text-xs">{job.name}</span>
                  <span className={failing ? "text-destructive" : "text-muted-foreground"}>
                    {!job.active
                      ? "Nonaktif"
                      : job.lastRunAt
                        ? `${job.lastStatus === "succeeded" ? "Berhasil" : (job.lastStatus ?? "—")} · ${formatDateTime(job.lastRunAt)}`
                        : "Belum pernah jalan"}
                    {job.failures24h > 0 && ` · ${job.failures24h} gagal (24 jam)`}
                  </span>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Pesanan terbaru</h2>
          <Link href="/admin/orders" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            Lihat semua
          </Link>
        </div>
        {recent.rows.length > 0 ? (
          <AdminOrderTable rows={recent.rows.slice(0, 5)} />
        ) : (
          <p className="text-sm text-muted-foreground">Belum ada pesanan.</p>
        )}
      </div>
    </div>
  );
}
