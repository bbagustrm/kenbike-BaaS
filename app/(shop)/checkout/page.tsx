import type { Metadata } from "next";

import { Container } from "@/components/layout/container";
import { CheckoutView } from "@/features/cart";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

/** Wajib login (dijaga proxy.ts). Alamat, ongkir, dan pembayaran menyusul di M5–M6. */
export default function CheckoutPage() {
  return (
    <Container className="space-y-6 py-10">
      <h1 className="text-2xl font-bold tracking-tight">Checkout</h1>
      <CheckoutView />
    </Container>
  );
}
