import Link from "next/link";

import { Container } from "@/components/layout/container";
import { buttonVariants } from "@/components/ui/button";

// Beranda sementara — isi sebenarnya dikerjakan di #42.
export default function HomePage() {
  return (
    <Container className="flex flex-col items-start gap-6 py-24">
      <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
        Gowes lebih jauh bersama KenBike
      </h1>
      <p className="max-w-xl text-lg text-muted-foreground">
        Sepeda, sparepart, dan aksesoris pilihan dengan pengiriman ke seluruh Indonesia.
      </p>
      <Link href="/products" className={buttonVariants({ size: "lg" })}>
        Lihat Produk
      </Link>
    </Container>
  );
}
