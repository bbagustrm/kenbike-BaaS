import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Fragment, Suspense } from "react";

import { Container } from "@/components/layout/container";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductView, productImageUrl, productListHref } from "@/features/catalog";
import { getProductBySlug, getVariantAvailability } from "@/features/catalog/queries";
import type { ProductDetail } from "@/features/catalog";
import { publicEnv } from "@/lib/env/public";

export async function generateMetadata({
  params,
}: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Produk tidak ditemukan" };

  const description = product.description?.slice(0, 160) ?? `Beli ${product.name} di KenBike.`;
  const image = product.images[0];
  return {
    title: product.name,
    description,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      title: product.name,
      description,
      type: "website",
      images: image
        ? [{ url: productImageUrl(image.path), alt: image.alt ?? product.name }]
        : undefined,
    },
  };
}

export default function ProductPage({ params }: PageProps<"/products/[slug]">) {
  return (
    <Container className="py-8">
      {/* Tanpa generateStaticParams, params adalah data request → di dalam Suspense. */}
      <Suspense fallback={<ProductSkeleton />}>
        {params.then(({ slug }) => (
          <ProductContent slug={slug} />
        ))}
      </Suspense>
    </Container>
  );
}

async function ProductContent({ slug }: { slug: string }) {
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  // Tidak di-await: stok di-stream terpisah agar info produk (cached) tampil dulu.
  const availabilityPromise = getVariantAvailability(product.variants.map((v) => v.id));

  return (
    <div className="space-y-8">
      <ProductBreadcrumb product={product} />
      <ProductView product={product} availabilityPromise={availabilityPromise} />
      {product.description && (
        <section className="max-w-3xl space-y-2 border-t pt-8">
          <h2 className="text-lg font-semibold">Deskripsi</h2>
          <p className="whitespace-pre-line text-muted-foreground">{product.description}</p>
        </section>
      )}
      <ProductJsonLd product={product} />
    </div>
  );
}

function ProductBreadcrumb({ product }: { product: ProductDetail }) {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink render={<Link href="/products" />}>Produk</BreadcrumbLink>
        </BreadcrumbItem>
        {product.breadcrumb.map((category) => (
          <Fragment key={category.id}>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href={productListHref({ category: category.slug })} />}>
                {category.name}
              </BreadcrumbLink>
            </BreadcrumbItem>
          </Fragment>
        ))}
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>{product.name}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}

/** Data terstruktur schema.org/Product untuk hasil pencarian. */
function ProductJsonLd({ product }: { product: ProductDetail }) {
  const prices = product.variants.map((v) => v.price);
  const url = new URL(`/products/${product.slug}`, publicEnv.NEXT_PUBLIC_SITE_URL).toString();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description ?? undefined,
    sku: product.variants[0]?.sku,
    image: product.images.map((img) => productImageUrl(img.path)),
    url,
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "IDR",
      lowPrice: Math.min(...prices),
      highPrice: Math.max(...prices),
      offerCount: product.variants.length,
      url,
    },
  };
  return (
    <script
      type="application/ld+json"
      // Escape "<" agar teks dari DB tidak bisa menutup tag <script>.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\u003c") }}
    />
  );
}

function ProductSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true">
      <Skeleton className="h-4 w-64" />
      <div className="grid gap-8 md:grid-cols-2 lg:gap-12">
        <Skeleton className="aspect-square rounded-lg" />
        <div className="space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </div>
  );
}
