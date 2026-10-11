import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { Container } from "@/components/layout/container";
import { Skeleton } from "@/components/ui/skeleton";
import { listMyAddresses } from "@/features/address/queries";
import { CheckoutForm, SnapScript } from "@/features/checkout";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

/** Syarat checkout: login + punya alamat kirim (alamat dengan area Biteship). */
export default function CheckoutPage() {
  return (
    <Container className="space-y-6 py-10">
      <h1 className="text-2xl font-bold tracking-tight">Checkout</h1>
      <Suspense fallback={<CheckoutSkeleton />}>
        <Checkout />
      </Suspense>
      <SnapScript />
    </Container>
  );
}

async function Checkout() {
  await requireUser("/checkout");
  const addresses = await listMyAddresses();
  if (!addresses.some((a) => a.area)) redirect("/account/addresses?next=/checkout");
  return <CheckoutForm addresses={addresses} />;
}

function CheckoutSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]" aria-busy="true">
      <div className="space-y-6">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
      <Skeleton className="h-72" />
    </div>
  );
}
