"use client";

import { MinusIcon, PlusIcon, ShoppingCartIcon } from "lucide-react";
import { Suspense, use, useMemo, useState } from "react";

import { Price } from "@/components/shared/price";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import type { ProductDetail } from "../types";
import { findVariant, initialSelection, type Selection, valueState } from "../variant-selection";
import { ProductImage } from "./product-image";

const MAX_PER_ITEM = 10;

type ProductViewProps = {
  product: ProductDetail;
  /** Stok tersedia per varian; tidak di-cache sehingga di-stream terpisah. */
  availabilityPromise: Promise<Record<string, number>>;
};

export function ProductView({ product, availabilityPromise }: ProductViewProps) {
  const [selection, setSelection] = useState<Selection>(() =>
    initialSelection(product.options, product.variants),
  );
  const variant = findVariant(product.options, product.variants, selection);
  const prices = product.variants.map((v) => v.price);

  return (
    <div className="grid gap-8 md:grid-cols-2 lg:gap-12">
      <ProductGallery product={product} variantId={variant?.id ?? null} />

      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{product.name}</h1>
          <p className="text-2xl">
            {variant ? (
              <Price min={variant.price} />
            ) : (
              <Price min={Math.min(...prices)} max={Math.max(...prices)} />
            )}
          </p>
          {variant && <p className="text-xs text-muted-foreground">SKU: {variant.sku}</p>}
        </div>

        <Suspense fallback={<PurchaseSkeleton options={product.options.length} />}>
          <PurchaseOptions
            product={product}
            selection={selection}
            onSelect={(optionId, valueId) => setSelection((s) => ({ ...s, [optionId]: valueId }))}
            availabilityPromise={availabilityPromise}
          />
        </Suspense>

        {variant && (
          <dl className="grid grid-cols-2 gap-2 border-t pt-4 text-sm">
            <dt className="text-muted-foreground">Berat</dt>
            <dd>{(variant.weightGram / 1000).toLocaleString("id-ID")} kg</dd>
            <dt className="text-muted-foreground">Dimensi paket</dt>
            <dd>{variant.dimensionsCm.join(" × ")} cm</dd>
          </dl>
        )}
      </div>
    </div>
  );
}

function PurchaseOptions({
  product,
  selection,
  onSelect,
  availabilityPromise,
}: {
  product: ProductDetail;
  selection: Selection;
  onSelect: (optionId: string, valueId: string) => void;
  availabilityPromise: Promise<Record<string, number>>;
}) {
  const availability = use(availabilityPromise);
  const [quantity, setQuantity] = useState(1);
  const variant = findVariant(product.options, product.variants, selection);
  const stock = variant ? (availability[variant.id] ?? 0) : 0;
  const maxQuantity = Math.min(stock, MAX_PER_ITEM);
  const clampedQuantity = Math.min(Math.max(quantity, 1), Math.max(maxQuantity, 1));

  return (
    <div className="space-y-6">
      {product.options.map((option) => (
        <fieldset key={option.id} className="space-y-2">
          <legend className="text-sm font-medium">
            {option.name}
            {selection[option.id] && (
              <span className="font-normal text-muted-foreground">
                : {option.values.find((v) => v.id === selection[option.id])?.value}
              </span>
            )}
          </legend>
          <div className="flex flex-wrap gap-2">
            {option.values.map((value) => {
              const state = valueState(
                product.options,
                product.variants,
                selection,
                option.id,
                value.id,
                availability,
              );
              const selected = selection[option.id] === value.id;
              return (
                <Button
                  key={value.id}
                  type="button"
                  variant={selected ? "default" : "outline"}
                  size="sm"
                  aria-pressed={selected}
                  disabled={state === "unavailable"}
                  onClick={() => onSelect(option.id, value.id)}
                  className={cn(state === "sold-out" && "text-muted-foreground line-through")}
                  title={state === "sold-out" ? "Stok habis" : undefined}
                >
                  {value.value}
                </Button>
              );
            })}
          </div>
        </fieldset>
      ))}

      <p className="text-sm" aria-live="polite">
        {!variant ? (
          <span className="text-muted-foreground">Kombinasi ini tidak tersedia.</span>
        ) : stock <= 0 ? (
          <span className="font-medium text-destructive">Stok habis</span>
        ) : stock <= 5 ? (
          <span className="font-medium text-amber-600 dark:text-amber-400">Sisa {stock} unit</span>
        ) : (
          <span className="text-muted-foreground">Stok tersedia</span>
        )}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center rounded-lg border" role="group" aria-label="Jumlah">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Kurangi jumlah"
            disabled={clampedQuantity <= 1}
            onClick={() => setQuantity(clampedQuantity - 1)}
          >
            <MinusIcon />
          </Button>
          <span className="w-10 text-center text-sm tabular-nums" aria-live="polite">
            {clampedQuantity}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Tambah jumlah"
            disabled={clampedQuantity >= maxQuantity}
            onClick={() => setQuantity(clampedQuantity + 1)}
          >
            <PlusIcon />
          </Button>
        </div>
        {/* TODO(#51, #52): hubungkan ke keranjang (guest store / cart DB). */}
        <Button
          type="button"
          size="lg"
          className="flex-1"
          disabled
          title="Keranjang segera tersedia"
        >
          <ShoppingCartIcon />
          {stock > 0 ? "Tambah ke keranjang" : "Stok habis"}
        </Button>
      </div>
    </div>
  );
}

function PurchaseSkeleton({ options }: { options: number }) {
  return (
    <div className="space-y-6" aria-busy="true">
      {Array.from({ length: options }, (_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-48" />
        </div>
      ))}
      <Skeleton className="h-10 w-full" />
    </div>
  );
}

function ProductGallery({
  product,
  variantId,
}: {
  product: ProductDetail;
  variantId: string | null;
}) {
  // Foto khusus varian terpilih didahulukan, lalu foto umum produk.
  const images = useMemo(() => {
    const own = product.images.filter((img) => img.variantId && img.variantId === variantId);
    const general = product.images.filter((img) => !img.variantId);
    return own.length > 0 ? [...own, ...general] : general.length > 0 ? general : product.images;
  }, [product.images, variantId]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = images.find((img) => img.id === activeId) ?? images[0] ?? null;

  return (
    <div className="space-y-3">
      <ProductImage
        path={active?.path ?? null}
        alt={active?.alt ?? product.name}
        sizes="(min-width: 768px) 50vw, 100vw"
        priority
      />
      {images.length > 1 && (
        <div className="grid grid-cols-5 gap-2">
          {images.map((img) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setActiveId(img.id)}
              aria-label={`Lihat foto ${img.alt ?? product.name}`}
              aria-pressed={img.id === active?.id}
              className={cn(
                "rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                img.id === active?.id && "ring-2 ring-primary",
              )}
            >
              <ProductImage path={img.path} alt="" sizes="20vw" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
