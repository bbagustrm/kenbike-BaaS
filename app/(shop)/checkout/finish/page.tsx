import { CheckCircle2Icon, ClockIcon, XCircleIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Container } from "@/components/layout/container";
import { Price } from "@/components/shared/price";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PaymentPanel, SnapScript } from "@/features/checkout";
import { getMyOrderPayment, type PaymentStatus } from "@/features/checkout/queries";
import { requireUser } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/format";
import { firstParam } from "@/lib/search";

export const metadata: Metadata = { title: "Status pembayaran", robots: { index: false } };

/**
 * Halaman setelah Snap (juga Finish/Unfinish/Error URL Midtrans). Status dibaca
 * dari DB — callback client tidak dipercaya; webhook yang mengubah status.
 */
export default function FinishPage({ searchParams }: PageProps<"/checkout/finish">) {
  return (
    <Container className="max-w-3xl space-y-6 py-10">
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        {searchParams.then((sp) => (
          <Finish orderNumber={firstParam(sp.order) ?? ""} />
        ))}
      </Suspense>
      <SnapScript />
    </Container>
  );
}

const STATUS: Record<
  PaymentStatus,
  { title: string; description: string; tone: "ok" | "wait" | "bad" }
> = {
  pending_payment: {
    title: "Menunggu pembayaran",
    description:
      "Pesanan dibuat dan stok ditahan untukmu. Status diperbarui otomatis setelah pembayaran diterima.",
    tone: "wait",
  },
  paid: {
    title: "Pembayaran diterima",
    description: "Terima kasih! Pesananmu segera kami proses.",
    tone: "ok",
  },
  expired: {
    title: "Pesanan kedaluwarsa",
    description: "Batas waktu pembayaran terlewati dan stok sudah dilepas.",
    tone: "bad",
  },
  cancelled: {
    title: "Pesanan dibatalkan",
    description: "Pesanan ini sudah dibatalkan.",
    tone: "bad",
  },
  failed: {
    title: "Pembayaran gagal",
    description: "Pembayaran tidak berhasil diproses.",
    tone: "bad",
  },
  refunded: {
    title: "Dana dikembalikan",
    description: "Pembayaran untuk pesanan ini sudah dikembalikan.",
    tone: "bad",
  },
};

const PAYMENT_BUFFER_MS = 15 * 60_000;

async function Finish({ orderNumber }: { orderNumber: string }) {
  await requireUser(`/checkout/finish?order=${encodeURIComponent(orderNumber)}`);
  const order = await getMyOrderPayment(orderNumber);
  if (!order) notFound();

  const status = STATUS[order.paymentStatus];
  const Icon =
    status.tone === "ok" ? CheckCircle2Icon : status.tone === "wait" ? ClockIcon : XCircleIcon;
  // Batas bayar: attempt pending bila ada, selain itu batas order − 15 menit.
  const deadline =
    order.attempt?.status === "pending"
      ? order.attempt.expiresAt
      : new Date(new Date(order.expiresAt).getTime() - PAYMENT_BUFFER_MS).toISOString();

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <Icon
          className={
            status.tone === "ok"
              ? "size-8 shrink-0 text-emerald-600"
              : status.tone === "wait"
                ? "size-8 shrink-0 text-amber-600"
                : "size-8 shrink-0 text-destructive"
          }
          aria-hidden="true"
        />
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">{status.title}</h1>
          <p className="text-muted-foreground">{status.description}</p>
          <p className="text-sm text-muted-foreground">
            No. pesanan{" "}
            <span className="font-mono font-medium text-foreground">{order.orderNumber}</span> ·{" "}
            {formatDateTime(order.createdAt)}
          </p>
        </div>
      </div>

      {order.paymentStatus === "pending_payment" && (
        <Card>
          <CardContent>
            <PaymentPanel orderNumber={order.orderNumber} expiresAt={deadline} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Ringkasan pesanan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="divide-y text-sm">
            {order.items.map((item, i) => (
              <li key={i} className="flex justify-between gap-4 py-2 first:pt-0">
                <span>
                  {item.name}
                  {item.variantLabel && (
                    <span className="text-muted-foreground"> · {item.variantLabel}</span>
                  )}
                  <span className="text-muted-foreground"> × {item.quantity}</span>
                </span>
                <Price min={item.price * item.quantity} className="font-normal" />
              </li>
            ))}
          </ul>
          <dl className="space-y-2 border-t pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd>
                <Price min={order.subtotal} className="font-normal" />
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Ongkir ({order.courier})</dt>
              <dd>
                <Price min={order.shippingCost} className="font-normal" />
              </dd>
            </div>
            <div className="flex justify-between text-base">
              <dt className="font-medium">Total</dt>
              <dd>
                <Price min={order.total} />
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Link href={`/account/orders/${order.orderNumber}`} className={buttonVariants()}>
          Lihat detail pesanan
        </Link>
        <Link href="/products" className={buttonVariants({ variant: "outline" })}>
          Lanjut belanja
        </Link>
      </div>
    </div>
  );
}
