import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { Container } from "@/components/layout/container";
import { Skeleton } from "@/components/ui/skeleton";
import { hasShippableAddress } from "@/features/address/queries";
import { CheckoutView } from "@/features/cart";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

/** Syarat checkout: login + punya alamat kirim. Pilih alamat, ongkir & pembayaran di M6. */
export default function CheckoutPage() {
  return (
    <Container className="space-y-6 py-10">
      <h1 className="text-2xl font-bold tracking-tight">Checkout</h1>
      <Suspense fallback={<CheckoutSkeleton />}>
        <CheckoutGate>
          <CheckoutView />
        </CheckoutGate>
      </Suspense>
    </Container>
  );
}

async function CheckoutGate({ children }: { children: React.ReactNode }) {
  await requireUser("/checkout");
  if (!(await hasShippableAddress())) redirect("/account/addresses?next=/checkout");
  return children;
}

function CheckoutSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]" aria-busy="true">
      <Skeleton className="h-64" />
      <Skeleton className="h-40" />
    </div>
  );
}
