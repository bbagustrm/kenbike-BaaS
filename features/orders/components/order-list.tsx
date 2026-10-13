import { ChevronRightIcon } from "lucide-react";
import Link from "next/link";

import { Price } from "@/components/shared/price";
import { ProductImage } from "@/components/shared/product-image";
import { formatDateTime } from "@/lib/format";

import type { OrderListItem } from "../queries";
import { orderDisplayStatus } from "../status";
import { StatusBadge } from "./order-status-badge";

export function OrderList({ orders }: { orders: OrderListItem[] }) {
  return (
    <ul className="space-y-3">
      {orders.map((order) => {
        const status = orderDisplayStatus(order.paymentStatus, order.shippingStatus);
        const others = order.itemCount - 1;
        return (
          <li key={order.orderNumber}>
            <Link
              href={`/account/orders/${order.orderNumber}`}
              className="flex items-center gap-4 rounded-xl border p-4 transition-colors hover:bg-muted/50"
            >
              <ProductImage
                path={order.firstItem?.imagePath ?? null}
                alt={order.firstItem?.name ?? "Pesanan"}
                sizes="64px"
                className="size-16 shrink-0"
              />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-medium">{order.orderNumber}</span>
                  <StatusBadge {...status} />
                </div>
                <p className="truncate text-sm">
                  {order.firstItem?.name}
                  {others > 0 && (
                    <span className="text-muted-foreground"> +{others} barang lainnya</span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">{formatDateTime(order.createdAt)}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Price min={order.total} className="text-sm" />
                <ChevronRightIcon className="size-4 text-muted-foreground" aria-hidden="true" />
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
