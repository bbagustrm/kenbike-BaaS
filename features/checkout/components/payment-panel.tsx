"use client";

import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useState, useTransition } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

import { cancelMyOrder, payOrder, syncPaymentStatus } from "../actions";
import { openSnap } from "./snap";

const POLL_MS = 5_000;
const POLL_LIMIT_MS = 10 * 60_000;

/**
 * Aksi untuk order `pending_payment`: bayar (buka ulang Snap), ganti metode
 * (attempt baru), batalkan. Status dibaca ulang dari server berkala karena
 * sumber kebenaran pembayaran adalah webhook Midtrans.
 */
export function PaymentPanel({
  orderNumber,
  expiresAt,
}: {
  orderNumber: string;
  expiresAt: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // Status dari DB tiap 5 detik; tiap 15 detik juga tanya Midtrans (cadangan webhook).
  usePolling((tick) => {
    if (tick % 3 === 0) void syncPaymentStatus(orderNumber).then(() => router.refresh());
    else router.refresh();
  });

  const pay = (changeMethod: boolean) =>
    startTransition(async () => {
      const result = await payOrder(orderNumber, changeMethod);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      try {
        await openSnap(result.token);
      } catch {
        toast.error("Halaman pembayaran gagal dimuat. Muat ulang halaman lalu coba lagi.");
      }
      await syncPaymentStatus(orderNumber);
      router.refresh();
    });

  return (
    <div className="space-y-4">
      <Countdown expiresAt={expiresAt} />
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button size="lg" className="sm:flex-1" disabled={pending} onClick={() => pay(false)}>
          {pending && <Spinner />}
          Bayar sekarang
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="sm:flex-1"
          disabled={pending}
          onClick={() => pay(true)}
        >
          Ganti metode pembayaran
        </Button>
      </div>
      <ConfirmDialog
        trigger={<Button variant="ghost" className="w-full text-destructive" disabled={pending} />}
        triggerLabel="Batalkan pesanan"
        title="Batalkan pesanan ini?"
        description="Pembayaran yang belum selesai dibatalkan dan stok dikembalikan. Tindakan ini tidak bisa diurungkan."
        confirmLabel="Batalkan pesanan"
        destructive
        onConfirm={() => cancelMyOrder(orderNumber)}
      />
    </div>
  );
}

/** Muat ulang status selama tab terlihat, maksimal 10 menit. */
function usePolling(callback: (tick: number) => void) {
  const onTick = useEffectEvent(callback);
  useEffect(() => {
    const started = Date.now();
    let tick = 0;
    const timer = setInterval(() => {
      if (Date.now() - started > POLL_LIMIT_MS) clearInterval(timer);
      else if (document.visibilityState === "visible") onTick(++tick);
    }, POLL_MS);
    return () => clearInterval(timer);
  }, []);
}

function Countdown({ expiresAt }: { expiresAt: string }) {
  const end = new Date(expiresAt).getTime();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, []);

  // Render pertama (server/hidrasi) tanpa jam agar tidak mismatch.
  if (now === null) return <p className="h-5" />;
  const left = Math.max(0, end - now);
  const h = Math.floor(left / 3_600_000);
  const m = Math.floor((left % 3_600_000) / 60_000);
  const s = Math.floor((left % 60_000) / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <p className="text-sm" aria-live="polite">
      Selesaikan pembayaran dalam{" "}
      <span className="font-semibold tabular-nums">
        {pad(h)}:{pad(m)}:{pad(s)}
      </span>
    </p>
  );
}
