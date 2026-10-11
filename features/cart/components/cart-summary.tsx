"use client";

import Link from "next/link";

import { Price } from "@/components/shared/price";
import { Button, buttonVariants } from "@/components/ui/button";

import { isPurchasable, subtotal } from "../items";
import { useCartStore } from "../store";
import type { CartLine } from "../types";

/**
 * Subtotal + satu tombol aksi.
 * - drawer: tamu → "Masuk untuk checkout", user login → "Checkout" (ke /checkout).
 * - checkout: lanjut ke pembayaran (M6).
 */
export function CartSummary({
  lines,
  place,
  onNavigate,
}: {
  lines: CartLine[];
  place: "drawer" | "checkout";
  onNavigate?: () => void;
}) {
  const userId = useCartStore((s) => s.userId);
  const blocked = lines.some((l) => !isPurchasable(l));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Subtotal</span>
        <Price min={subtotal(lines)} className="text-lg" />
      </div>
      <p className="text-xs text-muted-foreground">Ongkos kirim dihitung saat checkout.</p>
      {blocked && (
        <p className="text-xs text-destructive">
          Ada barang yang stoknya tidak cukup. Ubah jumlah atau hapus barang tersebut.
        </p>
      )}
      {place === "checkout" ? (
        // TODO(M6 #60): alamat, ongkir, lalu pembayaran Midtrans.
        <Button className="w-full" size="lg" disabled title="Pembayaran segera tersedia">
          Lanjut ke pembayaran
        </Button>
      ) : (
        <Link
          href={userId ? "/checkout" : "/login?next=/checkout"}
          onClick={onNavigate}
          aria-disabled={blocked || undefined}
          className={buttonVariants({
            size: "lg",
            className: blocked ? "pointer-events-none w-full opacity-50" : "w-full",
          })}
        >
          {userId ? "Checkout" : "Masuk untuk checkout"}
        </Link>
      )}
    </div>
  );
}
