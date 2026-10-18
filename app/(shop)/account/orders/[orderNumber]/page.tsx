import { ChevronLeftIcon, ClockIcon, ExternalLinkIcon, MapPinIcon, TruckIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Price } from "@/components/shared/price";
import { ProductImage } from "@/components/shared/product-image";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PaymentPanel, SnapScript } from "@/features/checkout";
import { OrderChatButton } from "@/features/chat";
import { canDownloadInvoice, InvoiceButton } from "@/features/documents";
import { CancelOrderDialog, isCancellable, RefundPanel } from "@/features/refunds";
import { customerCancelOrder } from "@/features/refunds/actions";
import { getRefund } from "@/features/refunds/queries";
import { MyReviewCard, ReviewOrderButton } from "@/features/reviews";
import { getMyOrderReview } from "@/features/reviews/queries";
import { BuyAgainButton, OrderTimeline, orderDisplayStatus, StatusBadge } from "@/features/orders";
import { getMyOrder } from "@/features/orders/queries";
import { requireUser } from "@/lib/auth/session";
import { formatDateTime, formatRupiah } from "@/lib/format";

export const metadata: Metadata = { title: "Detail pesanan", robots: { index: false } };

const PAYMENT_BUFFER_MS = 15 * 60_000;

export default function OrderDetailPage({ params }: PageProps<"/account/orders/[orderNumber]">) {
  return (
    <div className="space-y-6">
      <Link
        href="/account/orders"
        className={buttonVariants({ variant: "ghost", size: "sm", className: "-ml-2" })}
      >
        <ChevronLeftIcon />
        Semua pesanan
      </Link>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        {params.then(({ orderNumber }) => (
          <OrderDetail orderNumber={decodeURIComponent(orderNumber)} />
        ))}
      </Suspense>
      <SnapScript />
    </div>
  );
}

async function OrderDetail({ orderNumber }: { orderNumber: string }) {
  const user = await requireUser(`/account/orders/${encodeURIComponent(orderNumber)}`);
  const order = await getMyOrder(orderNumber);
  if (!order) notFound();
  const delivered = order.shippingStatus === "delivered";
  const [refund, review] = await Promise.all([
    order.paymentStatus === "paid" ? null : getRefund(order.id),
    delivered ? getMyOrderReview(order.id) : null,
  ]);

  const status = orderDisplayStatus(order.paymentStatus, order.shippingStatus);
  const pending = order.paymentStatus === "pending_payment";
  const deadline =
    order.payment?.status === "pending"
      ? order.payment.expiresAt
      : new Date(new Date(order.expiresAt).getTime() - PAYMENT_BUFFER_MS).toISOString();
  const a = order.address;
  const finished = !pending;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-mono text-xl font-semibold">{order.orderNumber}</h2>
            <StatusBadge {...status} />
          </div>
          <p className="text-sm text-muted-foreground">
            Dibuat {formatDateTime(order.createdAt)}
            {order.paidAt && ` · Dibayar ${formatDateTime(order.paidAt)}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canDownloadInvoice(order.paymentStatus) && (
            <InvoiceButton orderNumber={order.orderNumber} />
          )}
          {delivered && !review && (
            <ReviewOrderButton
              userId={user.id}
              order={{
                orderId: order.id,
                orderNumber: order.orderNumber,
                items: order.items.map((i) => ({
                  name: i.name,
                  variant: i.variantLabel,
                  image: i.imagePath,
                  quantity: i.quantity,
                })),
              }}
            />
          )}
          <OrderChatButton orderId={order.id} />
          {finished && <BuyAgainButton orderNumber={order.orderNumber} />}
          {isCancellable(order.paymentStatus, order.shippingStatus) && (
            <CancelOrderDialog
              orderId={order.id}
              total={formatRupiah(order.total)}
              action={customerCancelOrder}
            />
          )}
        </div>
      </div>

      {pending && (
        <Card>
          <CardHeader>
            <CardTitle>Menunggu pembayaran</CardTitle>
          </CardHeader>
          <CardContent>
            <PaymentPanel orderNumber={order.orderNumber} expiresAt={deadline} />
          </CardContent>
        </Card>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Barang</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="divide-y">
                {order.items.map((item) => (
                  <li key={item.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                    <ProductImage
                      path={item.imagePath}
                      alt={item.name}
                      sizes="64px"
                      className="size-16 shrink-0"
                    />
                    <div className="min-w-0 flex-1 text-sm">
                      <p className="font-medium">{item.name}</p>
                      {item.variantLabel && (
                        <p className="text-muted-foreground">{item.variantLabel}</p>
                      )}
                      {item.preorderDays !== null && (
                        <p className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                          <ClockIcon className="size-3" aria-hidden="true" />
                          Pre-order · dikirim ±{item.preorderDays} hari
                        </p>
                      )}
                      <p className="text-muted-foreground">
                        {item.quantity} × <Price min={item.price} className="font-normal" />
                      </p>
                    </div>
                    <Price min={item.price * item.quantity} className="text-sm" />
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
                  <dt className="text-muted-foreground">
                    Ongkir ({order.courier.code.toUpperCase()} {order.courier.service.toUpperCase()}
                    )
                  </dt>
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
              {order.payment?.channel && order.paymentStatus === "paid" && (
                <p className="text-xs text-muted-foreground">
                  Dibayar via {order.payment.channel.toUpperCase()}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Riwayat status</CardTitle>
            </CardHeader>
            <CardContent>
              <OrderTimeline entries={order.timeline} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {review && <MyReviewCard review={review} />}
          {refund && <RefundPanel orderId={order.id} refund={refund} />}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TruckIcon className="size-4" aria-hidden="true" />
                Pengiriman
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                {order.courier.code.toUpperCase()} · {order.courier.service.toUpperCase()}
              </p>
              {order.shipment?.waybillId ? (
                <p>
                  Resi: <span className="font-mono font-medium">{order.shipment.waybillId}</span>
                </p>
              ) : (
                <p className="text-muted-foreground">
                  {order.paymentStatus === "paid"
                    ? "Nomor resi muncul setelah kurir dijadwalkan."
                    : "Pengiriman diproses setelah pembayaran diterima."}
                </p>
              )}
              {order.shipment?.trackingUrl && (
                <a
                  href={order.shipment.trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  Lacak paket
                  <ExternalLinkIcon />
                </a>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPinIcon className="size-4" aria-hidden="true" />
                Alamat tujuan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="font-medium">{a.recipient_name}</p>
              <p className="text-muted-foreground">{a.phone}</p>
              <p className="text-muted-foreground">
                {a.address_line}, {[a.district, a.city, a.province].filter(Boolean).join(", ")}{" "}
                {a.postal_code}
              </p>
              {a.note && <p className="text-xs text-muted-foreground">Catatan: {a.note}</p>}
            </CardContent>
          </Card>

          {order.note && (
            <Card>
              <CardHeader>
                <CardTitle>Catatan untuk penjual</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{order.note}</CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
