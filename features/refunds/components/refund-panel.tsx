import { ExternalLinkIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime, formatRupiah } from "@/lib/format";

import type { Refund } from "../queries";
import { REFUND_STATUS_LABEL } from "../schemas";
import { CompleteRefundDialog } from "./complete-refund-dialog";
import { RefundAccountDialog } from "./refund-account-dialog";

/** Status refund sebuah pesanan; `admin` menampilkan aksi penyelesaian. */
export function RefundPanel({
  orderId,
  refund,
  admin = false,
}: {
  orderId: string;
  refund: Refund;
  admin?: boolean;
}) {
  const done = refund.status === "completed";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Refund</CardTitle>
        <CardAction>
          <Badge variant={done ? "secondary" : "outline"}>
            {REFUND_STATUS_LABEL[refund.status]}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
          <dt className="text-muted-foreground">Nominal</dt>
          <dd className="font-medium">{formatRupiah(refund.amount)}</dd>
          <dt className="text-muted-foreground">Alasan</dt>
          <dd>{refund.reason}</dd>
          <dt className="text-muted-foreground">Dibatalkan</dt>
          <dd>
            {formatDateTime(refund.createdAt)} oleh{" "}
            {refund.requestedBy === "admin" ? "admin" : "pembeli"}
          </dd>
        </dl>

        <div className="rounded-lg bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground">Rekening tujuan</p>
          {refund.account ? (
            <p>
              <span className="font-medium">{refund.account.bankName}</span>{" "}
              <span className="font-mono">{refund.account.accountNumber}</span>
              <br />
              a.n. {refund.account.accountHolder}
            </p>
          ) : (
            <p className="text-muted-foreground">Belum diisi.</p>
          )}
        </div>

        {done ? (
          <div className="space-y-1">
            <p>Diselesaikan {refund.processedAt && formatDateTime(refund.processedAt)}</p>
            {refund.note && <p className="text-muted-foreground">{refund.note}</p>}
            {refund.proofUrl && (
              <a
                href={refund.proofUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 underline underline-offset-4"
              >
                Lihat bukti transfer
                <ExternalLinkIcon className="size-3.5" />
              </a>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <RefundAccountDialog orderId={orderId} initial={refund.account} />
            {admin && (
              <CompleteRefundDialog orderId={orderId} hasAccount={Boolean(refund.account)} />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
