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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { formatRating } from "@/components/shared/rating-stars";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductView, productListHref } from "@/features/catalog";
import {
  getProductBySlug,
  getVariantAvailability,
  listProductSlugs,
} from "@/features/catalog/queries";
import type { ProductDetail } from "@/features/catalog";
import { ProductComments } from "@/features/comments";
import { ProductReviews } from "@/features/reviews";
import { publicEnv } from "@/lib/env/public";
import { productImageUrl } from "@/lib/product-images";

/** Produk yang di-prerender saat build; produk lain dirender saat pertama diminta. */
const PRERENDER_LIMIT = 100;

export async function generateStaticParams() {
  const slugs = await listProductSlugs();
  // Cache Components mewajibkan minimal satu param; slug fiktif berakhir 404.
  return slugs.length > 0
    ? slugs.slice(0, PRERENDER_LIMIT).map(({ slug }) => ({ slug }))
    : [{ slug: "_" }];
}

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
      {/* Slug di luar generateStaticParams baru diketahui saat request → di dalam Suspense. */}
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
      <ProductSections product={product} />
      <ProductJsonLd product={product} />
    </div>
  );
}

/**
 * Deskripsi & Ulasan terbuka secara default, Komentar tertutup. Panel yang
 * tertutup tidak dirender (Base UI), jadi data ulasan/komentar baru diambil
 * saat panelnya terbuka. Deskripsi
 * tetap di-render server agar terbaca mesin pencari.
 */
function ProductSections({ product }: { product: ProductDetail }) {
  const { avg, count } = product.rating;
  return (
    <Accordion multiple defaultValue={["description", "reviews"]} className="max-w-3xl border-t">
      <AccordionItem value="description">
        <AccordionTrigger className="py-4 text-base font-semibold">Deskripsi</AccordionTrigger>
        <AccordionContent keepMounted>
          {product.description ? (
            <p className="whitespace-pre-line text-muted-foreground">{product.description}</p>
          ) : (
            <p className="text-muted-foreground">Belum ada deskripsi.</p>
          )}
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="reviews" id="ulasan" className="scroll-mt-20">
        <AccordionTrigger className="py-4 text-base font-semibold">
          <span>
            Ulasan
            {count > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ★ {formatRating(avg)} · {count}
              </span>
            )}
          </span>
        </AccordionTrigger>
        {/* Reset margin paragraf bawaan AccordionContent agar jarak antar-ulasan rapat. */}
        <AccordionContent className="[&_p:not(:last-child)]:mb-0">
          <ProductReviews productId={product.id} avg={avg} count={count} />
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="comments" id="komentar" className="scroll-mt-20">
        <AccordionTrigger className="py-4 text-base font-semibold">Komentar</AccordionTrigger>
        <AccordionContent className="[&_p:not(:last-child)]:mb-0">
          <ProductComments productId={product.id} productPath={`/products/${product.slug}`} />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
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
    // Bintang di hasil pencarian Google; hanya bila sudah ada ulasan.
    aggregateRating:
      product.rating.count > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: product.rating.avg,
            reviewCount: product.rating.count,
            bestRating: 5,
            worstRating: 1,
          }
        : undefined,
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
