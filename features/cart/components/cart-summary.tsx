"use client";

import Link from "next/link";

import { Price } from "@/components/shared/price";
import { buttonVariants } from "@/components/ui/button";

import { isPurchasable, subtotal } from "../items";
import { useCartStore } from "../store";
import type { CartLine } from "../types";

/**
 * Subtotal + satu tombol di drawer: tamu → "Masuk untuk checkout",
 * user login → "Checkout" (/checkout mengecek alamat).
 */
export function CartSummary({ lines, onNavigate }: { lines: CartLine[]; onNavigate?: () => void }) {
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
    </div>
  );
}
