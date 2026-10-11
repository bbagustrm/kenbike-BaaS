"use client";

import { ClockIcon, MinusIcon, PlusIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";

import { Price } from "@/components/shared/price";
import { Button } from "@/components/ui/button";
import { ProductImage } from "@/features/catalog";
import { cn } from "@/lib/utils";

import { MAX_PER_ITEM } from "../items";
import { removeFromCart, setCartQuantity, useCartStore } from "../store";
import type { CartLine } from "../types";

/** Daftar barang di keranjang (drawer & halaman /checkout). */
export function CartLines({
  lines,
  onNavigate,
  size = "default",
}: {
  lines: CartLine[];
  /** Mis. menutup drawer saat membuka halaman produk. */
  onNavigate?: () => void;
  size?: "default" | "lg";
}) {
  const pending = useCartStore((s) => s.pending);

  return (
    <ul className="divide-y">
      {lines.map((line) => {
        const soldOut = line.available <= 0;
        const short = !soldOut && line.quantity > line.available;
        const max = Math.min(MAX_PER_ITEM, Math.max(line.available, 1));
        return (
          <li key={line.variantId} className="flex gap-3 py-4 first:pt-0 last:pb-0">
            <Link
              href={`/products/${line.slug}`}
              onClick={onNavigate}
              className={cn("shrink-0", size === "lg" ? "w-24" : "w-16")}
            >
              <ProductImage
                path={line.imagePath}
                alt={line.productName}
                sizes={size === "lg" ? "96px" : "64px"}
                className={cn(soldOut && "opacity-50")}
              />
            </Link>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link
                    href={`/products/${line.slug}`}
                    onClick={onNavigate}
                    className="line-clamp-2 text-sm font-medium hover:underline"
                  >
                    {line.productName}
                  </Link>
                  {line.variantLabel && (
                    <p className="text-xs text-muted-foreground">{line.variantLabel}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Hapus ${line.productName} dari keranjang`}
                  disabled={pending}
                  onClick={() => removeFromCart(line.variantId)}
                >
                  <Trash2Icon />
                </Button>
              </div>

              {line.preorderDays !== null && (
                <p className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                  <ClockIcon className="size-3" aria-hidden="true" />
                  Pre-order · dikirim ±{line.preorderDays} hari
                </p>
              )}
              {soldOut && <p className="text-xs font-medium text-destructive">Stok habis</p>}
              {short && (
                <p className="text-xs font-medium text-destructive">
                  Stok tersisa {line.available} — kurangi jumlahnya
                </p>
              )}

              <div className="flex items-center justify-between gap-2 pt-1">
                <div
                  className="flex items-center rounded-lg border"
                  role="group"
                  aria-label={`Jumlah ${line.productName}`}
                >
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Kurangi jumlah"
                    disabled={pending || line.quantity <= 1}
                    onClick={() => setCartQuantity(line.variantId, line.quantity - 1)}
                  >
                    <MinusIcon />
                  </Button>
                  <span className="w-8 text-center text-sm tabular-nums">{line.quantity}</span>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Tambah jumlah"
                    disabled={pending || soldOut || line.quantity >= max}
                    onClick={() => setCartQuantity(line.variantId, line.quantity + 1)}
                  >
                    <PlusIcon />
                  </Button>
                </div>
                <Price
                  min={line.price * line.quantity}
                  className={cn("text-sm", soldOut && "text-muted-foreground line-through")}
                />
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
