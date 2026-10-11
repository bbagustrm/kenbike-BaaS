import { ArrowRightIcon, BikeIcon, PackageIcon, WrenchIcon } from "lucide-react";
import Link from "next/link";

import { Container } from "@/components/layout/container";
import { buttonVariants } from "@/components/ui/button";
import { ProductGrid, productListHref } from "@/features/catalog";
import { listCategories, listProducts } from "@/features/catalog/queries";

const CATEGORY_ICONS: Record<string, typeof BikeIcon> = {
  sepeda: BikeIcon,
  sparepart: WrenchIcon,
  aksesoris: PackageIcon,
};

// Seluruh data di halaman ini berasal dari query "use cache", jadi beranda
// ikut static shell; hanya slot user di navbar yang di-stream per request.
export default async function HomePage() {
  const [categories, newest] = await Promise.all([
    listCategories(),
    listProducts({ sort: "newest", page: 1 }),
  ]);
  const roots = categories.filter((c) => !c.parentId);

  return (
    <>
      <section className="border-b bg-muted/30">
        <Container className="flex flex-col items-start gap-6 py-16 sm:py-24">
          <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
            Gowes lebih jauh bersama KenBike
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            Sepeda, sparepart, dan aksesoris pilihan dengan pengiriman ke seluruh Indonesia.
          </p>
          <Link href="/products" className={buttonVariants({ size: "lg" })}>
            Lihat produk
            <ArrowRightIcon />
          </Link>
        </Container>
      </section>

      <Container className="space-y-6 py-12">
        <h2 className="text-xl font-semibold tracking-tight">Belanja per kategori</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {roots.map((category) => {
            const Icon = CATEGORY_ICONS[category.slug] ?? PackageIcon;
            const children = categories.filter((c) => c.parentId === category.id);
            return (
              <Link
                key={category.id}
                href={productListHref({ category: category.slug })}
                className="group flex items-center gap-4 rounded-xl border p-5 transition-colors hover:bg-muted/50"
              >
                <Icon className="size-8 text-muted-foreground" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="font-medium group-hover:underline">{category.name}</p>
                  {children.length > 0 && (
                    <p className="truncate text-sm text-muted-foreground">
                      {children.map((c) => c.name).join(" · ")}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </Container>

      <Container className="space-y-6 pb-16">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-xl font-semibold tracking-tight">Produk terbaru</h2>
          <Link href="/products" className={buttonVariants({ variant: "link", className: "px-0" })}>
            Lihat semua
          </Link>
        </div>
        <ProductGrid products={newest.items.slice(0, 8)} />
      </Container>
    </>
  );
}
