"use client";

import Link from "next/link";

import { Price } from "@/components/shared/price";
import { Button, buttonVariants } from "@/components/ui/button";

import { isPurchasable, subtotal } from "../items";
import { useCartStore } from "../store";
import type { CartLine } from "../types";

/** Subtotal + tombol lanjut. Checkout wajib login; ongkir dihitung di checkout. */
export function CartSummary({ lines }: { lines: CartLine[] }) {
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
      {userId ? (
        // TODO(M5): arahkan ke /checkout.
        <Button className="w-full" size="lg" disabled title="Checkout segera tersedia">
          Checkout
        </Button>
      ) : (
        <Link
          href="/login?next=/cart"
          className={buttonVariants({ size: "lg", className: "w-full" })}
        >
          Masuk untuk checkout
        </Link>
      )}
    </div>
  );
}
