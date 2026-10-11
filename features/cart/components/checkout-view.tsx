"use client";

import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";

import { useCartStore } from "../store";
import { CartLines } from "./cart-lines";
import { CartSummary } from "./cart-summary";

/** Isi halaman /checkout: tinjau barang + ringkasan (data dari store keranjang). */
export function CheckoutView() {
  const lines = useCartStore((s) => s.lines);

  if (lines === null) {
    return (
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]" aria-busy="true">
        <Skeleton className="h-64" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyTitle>Keranjang masih kosong</EmptyTitle>
          <EmptyDescription>Yuk, cari sepeda atau sparepart favoritmu.</EmptyDescription>
        </EmptyHeader>
        <Link href="/products" className={buttonVariants()}>
          Mulai belanja
        </Link>
      </Empty>
    );
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_20rem]">
      <Card>
        <CardContent>
          <CartLines lines={lines} size="lg" />
        </CardContent>
      </Card>
      <Card className="lg:sticky lg:top-20">
        <CardHeader>
          <CardTitle>Ringkasan belanja</CardTitle>
        </CardHeader>
        <CardContent>
          <CartSummary lines={lines} place="checkout" />
        </CardContent>
      </Card>
    </div>
  );
}
