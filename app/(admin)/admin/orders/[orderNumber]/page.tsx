import { AlertTriangleIcon, ExternalLinkIcon } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Price } from "@/components/shared/price";
import { ProductImage } from "@/components/shared/product-image";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AdminPageHeader } from "@/features/admin";
import { ATTENTION } from "@/features/admin/orders/attention";
import { InternalNotes } from "@/features/admin/orders/components/internal-notes";
import { OrderChatButton } from "@/features/chat";
import { OrderActions } from "@/features/admin/orders/components/order-actions";
import { getAdminOrder } from "@/features/admin/orders/queries";
import {
  canDownloadInvoice,
  canDownloadLabel,
  InvoiceButton,
  LabelButton,
} from "@/features/documents";
import { StatusBadge } from "@/features/orders";
import { CancelOrderDialog, isCancellable, RefundPanel } from "@/features/refunds";
import { adminCancelOrder } from "@/features/refunds/actions";
import { getRefund } from "@/features/refunds/queries";
import { formatDateTime, formatRupiah } from "@/lib/format";
import { orderDisplayStatus } from "@/lib/order-status";

export const metadata: Metadata = { title: "Detail pesanan · Admin" };

export default async function AdminOrderPage({ params }: PageProps<"/admin/orders/[orderNumber]">) {
  const { orderNumber } = await params;
  const order = await getAdminOrder(decodeURIComponent(orderNumber));
  if (!order) notFound();
  const refund = await getRefund(order.id);

  const status = orderDisplayStatus(order.paymentStatus, order.shippingStatus);
  const paid = order.paymentStatus === "paid";
  const shippingOpen =
    order.shippingStatus === null ||
    order.shippingStatus === "pending" ||
    order.shippingStatus === "processing";
  const a = order.address;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        backHref="/admin/orders"
        backLabel="Kembali ke daftar pesanan"
        title={order.orderNumber}
        description={`Dibuat ${formatDateTime(order.createdAt)}${order.paidAt ? ` · Dibayar ${formatDateTime(order.paidAt)}` : ""}`}
        actions={<StatusBadge {...status} />}
      />

      {order.attentionReason && (
        <Alert variant="destructive">
          <AlertTriangleIcon />
          <AlertTitle>Perlu tindakan: {ATTENTION[order.attentionReason].label}</AlertTitle>
          <AlertDescription>{ATTENTION[order.attentionReason].guide}</AlertDescription>
        </Alert>
      )}

      {(canDownloadInvoice(order.paymentStatus) ||
        canDownloadLabel(order.paymentStatus, order.shippingStatus)) && (
        <div className="flex flex-wrap gap-2">
          {canDownloadInvoice(order.paymentStatus) && (
            <InvoiceButton orderNumber={order.orderNumber} admin size="sm" />
          )}
          {canDownloadLabel(order.paymentStatus, order.shippingStatus) && (
            <LabelButton orderNumber={order.orderNumber} />
          )}
        </div>
      )}

      <OrderActions
        orderId={order.id}
        hasAttention={Boolean(order.attentionReason)}
        canCreateShipment={
          paid &&
          shippingOpen &&
          !order.shipment?.biteshipOrderId &&
          order.attentionReason !== "late_payment_out_of_stock"
        }
      >
        <OrderChatButton orderId={order.id} admin size="sm" />
        {isCancellable(order.paymentStatus, order.shippingStatus) && (
          <CancelOrderDialog
            orderId={order.id}
            total={formatRupiah(order.total)}
            action={adminCancelOrder}
            admin
            size="sm"
          />
        )}
      </OrderActions>

      <div className="grid items-start gap-6 xl:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Barang</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="divide-y">
                {order.items.map((item, i) => (
                  <li key={i} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                    <ProductImage
                      path={item.imagePath}
                      alt={item.name}
                      sizes="56px"
                      className="size-14 shrink-0"
                    />
                    <div className="min-w-0 flex-1 text-sm">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-muted-foreground">
                        {[item.variantLabel, item.sku].filter(Boolean).join(" · ")}
                      </p>
                      <p className="text-muted-foreground">
                        {item.quantity} × <Price min={item.price} className="font-normal" />
                      </p>
                    </div>
                    <Price min={item.price * item.quantity} className="text-sm" />
                  </li>
                ))}
              </ul>
              <dl className="space-y-1 border-t pt-4 text-sm">
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pembayaran (Midtrans)</CardTitle>
            </CardHeader>
            <CardContent>
              {order.payments.length === 0 ? (
                <p className="text-sm text-muted-foreground">Belum ada percobaan pembayaran.</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID transaksi</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Metode</TableHead>
                        <TableHead className="text-right">Nominal</TableHead>
                        <TableHead>Dibuat</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {order.payments.map((p) => (
                        <TableRow key={p.gatewayOrderId} className="align-top">
                          <TableCell className="font-mono text-xs">
                            {p.gatewayOrderId}
                            {p.raw && (
                              <details className="mt-1">
                                <summary className="text-muted-foreground">Respons mentah</summary>
                                <pre className="mt-1 max-h-60 max-w-md overflow-auto rounded bg-muted p-2 text-[11px] whitespace-pre-wrap">
                                  {JSON.stringify(p.raw, null, 2)}
                                </pre>
                              </details>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{p.status}</Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {[p.type, p.channel].filter(Boolean).join(" · ") || "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Price min={p.amount} className="text-sm font-normal" />
                          </TableCell>
                          <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                            {formatDateTime(p.createdAt)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Riwayat lengkap</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-2 text-sm">
                {order.history.map((h, i) => (
                  <li
                    key={i}
                    className="flex flex-wrap items-baseline gap-x-2 border-b pb-2 last:border-0"
                  >
                    <span className="w-36 shrink-0 text-xs text-muted-foreground">
                      {formatDateTime(h.createdAt)}
                    </span>
                    <Badge variant="outline">{h.source}</Badge>
                    <span className="text-muted-foreground">{h.type}</span>
                    <span className="font-medium">{h.value}</span>
                    {h.raw && (
                      <details className="basis-full">
                        <summary className="text-xs text-muted-foreground">Payload</summary>
                        <pre className="mt-1 max-h-60 overflow-auto rounded bg-muted p-2 text-[11px] whitespace-pre-wrap">
                          {JSON.stringify(h.raw, null, 2)}
                        </pre>
                      </details>
                    )}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {refund && <RefundPanel orderId={order.id} refund={refund} admin />}

          <Card>
            <CardHeader>
              <CardTitle>Pelanggan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="font-medium">{order.customer.name ?? "—"}</p>
              <p className="text-muted-foreground">{order.customer.email ?? "—"}</p>
              {order.customer.phone && (
                <p className="text-muted-foreground">{order.customer.phone}</p>
              )}
              {order.customerNote && (
                <p className="mt-2 rounded-lg bg-muted/50 p-2">
                  <span className="text-xs text-muted-foreground">Catatan pembeli: </span>
                  {order.customerNote}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pengiriman</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <p className="font-medium">{a.recipient_name}</p>
                <p className="text-muted-foreground">{a.phone}</p>
                <p className="text-muted-foreground">
                  {a.address_line}, {[a.district, a.city, a.province].filter(Boolean).join(", ")}{" "}
                  {a.postal_code}
                </p>
                {a.note && <p className="text-xs text-muted-foreground">Catatan: {a.note}</p>}
              </div>
              <div className="border-t pt-2">
                <p>
                  {order.courier.code.toUpperCase()} · {order.courier.service.toUpperCase()}
                </p>
                {order.shipment?.biteshipOrderId ? (
                  <>
                    <p className="text-xs text-muted-foreground">
                      Biteship: <span className="font-mono">{order.shipment.biteshipOrderId}</span>
                    </p>
                    <p>
                      Resi:{" "}
                      <span className="font-mono">{order.shipment.waybillId ?? "menunggu"}</span>
                    </p>
                    {order.shipment.trackingUrl && (
                      <a
                        href={order.shipment.trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={buttonVariants({
                          variant: "outline",
                          size: "sm",
                          className: "mt-1",
                        })}
                      >
                        Lacak
                        <ExternalLinkIcon />
                      </a>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground">Belum ada order pengiriman.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Catatan internal</CardTitle>
            </CardHeader>
            <CardContent>
              <InternalNotes orderId={order.id} notes={order.notes} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
