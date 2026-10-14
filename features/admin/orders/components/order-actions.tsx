"use client";

import { RefreshCwIcon, TruckIcon } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { ActionState } from "@/lib/action-state";

import {
  cancelShipment,
  markRefunded,
  resolveAttention,
  retryShipment,
  syncOrderPayment,
} from "../actions";

type OrderActionsProps = {
  orderId: string;
  canCreateShipment: boolean;
  canCancelShipment: boolean;
  canMarkRefunded: boolean;
  hasAttention: boolean;
};

/** Aksi admin pada satu order; setiap aksi dicatat di timeline. */
export function OrderActions(props: OrderActionsProps) {
  const [pending, startTransition] = useTransition();
  const run = (action: (id: string) => Promise<ActionState>) =>
    startTransition(async () => {
      const result = await action(props.orderId);
      if (result.status === "error") toast.error(result.message);
      else toast.success(result.message);
    });

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" disabled={pending} onClick={() => run(syncOrderPayment)}>
        {pending ? <Spinner /> : <RefreshCwIcon />}
        Cek status Midtrans
      </Button>
      {props.canCreateShipment && (
        <Button size="sm" disabled={pending} onClick={() => run(retryShipment)}>
          <TruckIcon />
          Buat pengiriman
        </Button>
      )}
      {props.hasAttention && (
        <ConfirmDialog
          trigger={<Button variant="outline" size="sm" disabled={pending} />}
          triggerLabel="Selesaikan"
          title="Tandai sudah ditangani?"
          description="Tanda “perlu tindakan” dihapus dan dicatat di riwayat. Pastikan masalahnya sudah diselesaikan."
          confirmLabel="Selesaikan"
          onConfirm={() => resolveAttention(props.orderId)}
        />
      )}
      {props.canMarkRefunded && (
        <ConfirmDialog
          trigger={<Button variant="outline" size="sm" disabled={pending} />}
          triggerLabel="Tandai sudah refund"
          title="Tandai pesanan sudah di-refund?"
          description="Lakukan refund di dashboard Midtrans terlebih dahulu. Status pembayaran berubah menjadi “Dana dikembalikan”."
          confirmLabel="Tandai refund"
          destructive
          onConfirm={() => markRefunded(props.orderId)}
        />
      )}
      {props.canCancelShipment && (
        <ConfirmDialog
          trigger={
            <Button variant="ghost" size="sm" className="text-destructive" disabled={pending} />
          }
          triggerLabel="Batalkan pengiriman"
          title="Batalkan pengiriman?"
          description="Order di Biteship dibatalkan (hanya bisa sebelum paket diambil kurir)."
          confirmLabel="Batalkan pengiriman"
          destructive
          onConfirm={() => cancelShipment(props.orderId)}
        />
      )}
    </div>
  );
}
