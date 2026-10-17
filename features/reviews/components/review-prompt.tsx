"use client";

import { PackageCheckIcon } from "lucide-react";
import { useState, useSyncExternalStore } from "react";

import { ProductImage } from "@/components/shared/product-image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { dismissReviewPrompt } from "../actions";
import { type ReviewableOrder, ReviewFormDialog } from "./review-form-dialog";

/** Ditutup lewat X: jangan muncul lagi di sesi tab ini (Nanti = permanen per pesanan). */
const SESSION_KEY = "kenbike:review-prompt-closed";

const noopSubscribe = () => () => {};

function closedThisSession(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

function rememberClosed() {
  try {
    sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    // storage diblokir: cukup tutup untuk halaman ini.
  }
}

/**
 * Modal "Pesanan sudah sampai" untuk pembeli yang punya pesanan delivered
 * belum diulas: Beri ulasan → form, Nanti → tidak ditawarkan lagi untuk pesanan itu.
 */
export function ReviewPrompt({ orders, userId }: { orders: ReviewableOrder[]; userId: string }) {
  // Server: dianggap sudah ditutup (tidak dirender) → tidak ada beda hasil hydration.
  const closedBefore = useSyncExternalStore(noopSubscribe, closedThisSession, () => true);
  const [queue, setQueue] = useState(orders);
  const [closed, setClosed] = useState(false);
  const [reviewing, setReviewing] = useState<ReviewableOrder | null>(null);
  const current = queue[0];
  const open = Boolean(current) && !closedBefore && !closed && reviewing === null;

  return (
    <>
      {current && (
        <Dialog
          open={open}
          onOpenChange={(value) => {
            if (value) return;
            setClosed(true);
            rememberClosed();
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader className="items-center text-center">
              <PackageCheckIcon className="size-10 text-primary" aria-hidden="true" />
              <DialogTitle>Pesananmu sudah sampai! 🎉</DialogTitle>
              <DialogDescription>
                Gimana barangnya? Bantu pembeli lain dengan memberi ulasan untuk pesanan{" "}
                <span className="font-mono">{current.orderNumber}</span>.
              </DialogDescription>
            </DialogHeader>
            <ul className="space-y-2">
              {current.items.slice(0, 3).map((item, i) => (
                <li key={`${item.name}-${i}`} className="flex items-center gap-3 text-sm">
                  <ProductImage
                    path={item.image}
                    alt={item.name}
                    sizes="40px"
                    className="size-10 shrink-0"
                  />
                  <span className="min-w-0 truncate">{item.name}</span>
                </li>
              ))}
              {current.items.length > 3 && (
                <li className="text-xs text-muted-foreground">
                  +{current.items.length - 3} produk lainnya
                </li>
              )}
            </ul>
            <DialogFooter className="gap-2 sm:justify-center">
              <Button
                variant="outline"
                onClick={() => {
                  void dismissReviewPrompt(current.orderId);
                  setQueue((q) => q.slice(1));
                }}
              >
                Nanti
              </Button>
              <Button onClick={() => setReviewing(current)}>Beri ulasan</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {reviewing && (
        <ReviewFormDialog
          order={reviewing}
          userId={userId}
          open
          onOpenChange={(value) => {
            if (value) return;
            setReviewing(null);
            // Pesanan ini selesai ditangani; tawarkan pesanan berikutnya (bila ada).
            setQueue((q) => q.slice(1));
          }}
        />
      )}
    </>
  );
}
