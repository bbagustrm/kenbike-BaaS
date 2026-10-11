import type { Metadata } from "next";

import { Container } from "@/components/layout/container";
import { CartPageView } from "@/features/cart";

export const metadata: Metadata = { title: "Keranjang", robots: { index: false } };

export default function CartPage() {
  return (
    <Container className="space-y-6 py-10">
      <h1 className="text-2xl font-bold tracking-tight">Keranjang</h1>
      <CartPageView />
    </Container>
  );
}
