"use client";

import { ShoppingCartIcon } from "lucide-react";
import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";

import { countItems } from "../items";
import { setCartDrawerOpen, useCartStore } from "../store";
import { CartLines } from "./cart-lines";
import { CartSummary } from "./cart-summary";

/** Ikon keranjang + badge jumlah di navbar; membuka drawer keranjang. */
export function CartButton() {
  const open = useCartStore((s) => s.drawerOpen);
  const lines = useCartStore((s) => s.lines);
  const count = useCartStore((s) =>
    s.userId === undefined || !s.hydrated
      ? 0
      : s.userId
        ? countItems(s.lines ?? [])
        : countItems(s.guestItems),
  );
  const close = () => setCartDrawerOpen(false);

  return (
    <Sheet open={open} onOpenChange={setCartDrawerOpen}>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            aria-label={count > 0 ? `Keranjang, ${count} barang` : "Keranjang"}
          />
        }
      >
        <ShoppingCartIcon />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-none font-semibold text-primary-foreground tabular-nums">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>Keranjang{count > 0 ? ` (${count})` : ""}</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4">
          {lines === null ? (
            <div className="space-y-4" aria-busy="true">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : lines.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>Keranjang masih kosong</EmptyTitle>
                <EmptyDescription>Yuk, cari sepeda atau sparepart favoritmu.</EmptyDescription>
              </EmptyHeader>
              <Link href="/products" onClick={close} className={buttonVariants()}>
                Mulai belanja
              </Link>
            </Empty>
          ) : (
            <CartLines lines={lines} onNavigate={close} />
          )}
        </div>

        {lines && lines.length > 0 && (
          <SheetFooter className="border-t">
            <CartSummary lines={lines} place="drawer" onNavigate={close} />
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
