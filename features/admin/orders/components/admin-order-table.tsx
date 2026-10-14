import Link from "next/link";

import { Price } from "@/components/shared/price";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/features/orders";
import { formatDateTime } from "@/lib/format";
import { orderDisplayStatus } from "@/lib/order-status";

import { ATTENTION } from "../attention";
import type { AdminOrderRow } from "../queries";

export function AdminOrderTable({ rows }: { rows: AdminOrderRow[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>No. pesanan</TableHead>
            <TableHead>Pelanggan</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Kurir</TableHead>
            <TableHead>Dibuat</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                <Link
                  href={`/admin/orders/${row.orderNumber}`}
                  className="font-mono text-sm font-medium hover:underline"
                >
                  {row.orderNumber}
                </Link>
                {row.attentionReason && (
                  <Badge variant="destructive" className="ml-2">
                    {ATTENTION[row.attentionReason].label}
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-sm">{row.customerName}</TableCell>
              <TableCell className="text-right whitespace-nowrap">
                <Price min={row.total} className="text-sm font-normal" />
              </TableCell>
              <TableCell>
                <StatusBadge {...orderDisplayStatus(row.paymentStatus, row.shippingStatus)} />
              </TableCell>
              <TableCell className="text-sm whitespace-nowrap">{row.courier}</TableCell>
              <TableCell className="text-sm whitespace-nowrap text-muted-foreground">
                {formatDateTime(row.createdAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
