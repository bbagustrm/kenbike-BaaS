"use client";

import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

import type { ProductDetail } from "../types";
import { variantLabel } from "../variant-selection";
import { ProductImage } from "./product-image";

type ProductGalleryProps = {
  product: ProductDetail;
  /** Varian terpilih; carousel bergeser ke foto pertamanya bila ada. */
  variantId: string | null;
  /** Dipanggil saat pembeli memilih foto khusus varian lewat thumbnail. */
  onSelectVariant: (variantId: string) => void;
};

/**
 * Galeri foto produk: carousel (geser / panah / keyboard) + thumbnail.
 * Foto khusus varian diberi label varian; teks alternatif tampil sebagai
 * keterangan foto.
 */
export function ProductGallery({ product, variantId, onSelectVariant }: ProductGalleryProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  const labels = useMemo(
    () => new Map(product.variants.map((v) => [v.id, variantLabel(product.options, v)])),
    [product.options, product.variants],
  );
  const images = product.images;

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    onSelect();
    api.on("select", onSelect).on("reInit", onSelect);
    return () => {
      api.off("select", onSelect).off("reInit", onSelect);
    };
  }, [api]);

  // Varian berganti → tampilkan fotonya (kecuali foto yang sedang tampil sudah
  // milik varian itu). Menyinkronkan Embla (sistem eksternal) dengan pilihan varian.
  useEffect(() => {
    if (!api || !variantId) return;
    if (images[api.selectedScrollSnap()]?.variantId === variantId) return;
    const index = images.findIndex((img) => img.variantId === variantId);
    if (index >= 0) api.scrollTo(index);
  }, [api, variantId, images]);

  if (images.length === 0) {
    return <ProductImage path={null} alt={product.name} sizes="50vw" priority />;
  }

  return (
    <div className="space-y-3">
      <Carousel setApi={setApi} opts={{ loop: images.length > 1 }} aria-label="Foto produk">
        <CarouselContent>
          {images.map((img, index) => {
            const label = img.variantId ? labels.get(img.variantId) : undefined;
            return (
              <CarouselItem key={img.id} aria-label={`Foto ${index + 1} dari ${images.length}`}>
                <div className="relative">
                  <ProductImage
                    path={img.path}
                    alt={img.alt ?? (label ? `${product.name} — ${label}` : product.name)}
                    sizes="(min-width: 768px) 50vw, 100vw"
                    priority={index === 0}
                  />
                  {(label || img.alt) && (
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 space-y-1.5 rounded-b-lg bg-linear-to-t from-black/70 via-black/40 to-transparent p-4 pt-10 text-white">
                      {label && (
                        <Badge className="bg-white/90 text-black hover:bg-white/90">{label}</Badge>
                      )}
                      {img.alt && <p className="text-sm leading-snug text-pretty">{img.alt}</p>}
                    </div>
                  )}
                </div>
              </CarouselItem>
            );
          })}
        </CarouselContent>
        {images.length > 1 && (
          <>
            <CarouselPrevious className="left-3 bg-background/80 backdrop-blur" />
            <CarouselNext className="right-3 bg-background/80 backdrop-blur" />
            <span className="absolute top-3 right-3 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white tabular-nums">
              {current + 1} / {images.length}
            </span>
          </>
        )}
      </Carousel>

      {images.length > 1 && (
        <div className="grid grid-cols-5 gap-2">
          {images.map((img, index) => {
            const label = img.variantId ? labels.get(img.variantId) : undefined;
            return (
              <button
                key={img.id}
                type="button"
                onClick={() => {
                  api?.scrollTo(index);
                  if (img.variantId && labels.has(img.variantId)) onSelectVariant(img.variantId);
                }}
                aria-label={`Lihat foto ${index + 1}${label ? ` (${label})` : ""}`}
                aria-current={index === current ? "true" : undefined}
                title={label}
                className={cn(
                  "rounded-lg opacity-70 transition-opacity outline-none hover:opacity-100 focus-visible:ring-3 focus-visible:ring-ring/50",
                  index === current && "opacity-100 ring-2 ring-primary",
                )}
              >
                <ProductImage path={img.path} alt="" sizes="20vw" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
