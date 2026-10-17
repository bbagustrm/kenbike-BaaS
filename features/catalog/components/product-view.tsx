"use client";

import { ClockIcon, MinusIcon, PlusIcon, ShoppingCartIcon } from "lucide-react";
import { Suspense, use, useState, useTransition } from "react";
import { toast } from "sonner";

import { Price } from "@/components/shared/price";
import { formatRating, RatingStars } from "@/components/shared/rating-stars";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { addToCart, MAX_PER_ITEM, setCartDrawerOpen } from "@/features/cart";
import { cn } from "@/lib/utils";

import type { ProductDetail } from "../types";
import {
  findVariant,
  initialSelection,
  type Selection,
  selectionForVariant,
  valueState,
} from "../variant-selection";
import { ProductGallery } from "./product-gallery";

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
      <ProductGallery
        product={product}
        variantId={variant?.id ?? null}
        onSelectVariant={(id) => {
          const target = product.variants.find((v) => v.id === id);
          if (target) setSelection(selectionForVariant(product.options, target));
        }}
      />

      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{product.name}</h1>
          {product.rating.count > 0 && (
            <a
              href="#ulasan"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <RatingStars value={product.rating.avg} size="xs" />
              <span className="font-medium text-foreground">
                {formatRating(product.rating.avg)}
              </span>
              <span>({product.rating.count} ulasan)</span>
            </a>
          )}
          <p className="text-2xl">
            {variant ? (
              <Price min={variant.price} />
            ) : (
              <Price min={Math.min(...prices)} max={Math.max(...prices)} />
            )}
          </p>
          {variant && <p className="text-xs text-muted-foreground">SKU: {variant.sku}</p>}
        </div>

        {product.preorderDays !== null && (
          <div className="flex gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
            <ClockIcon
              className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400"
              aria-hidden="true"
            />
            <p>
              <strong>Pre-order</strong> · barang siap dikirim sekitar{" "}
              <strong>{product.preorderDays} hari</strong> setelah pembayaran, lebih lama dari
              pengiriman biasa.
            </p>
          </div>
        )}

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
  const [adding, startAdding] = useTransition();
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
        <Button
          type="button"
          size="lg"
          className="flex-1"
          disabled={!variant || stock <= 0 || adding}
          onClick={() =>
            variant &&
            startAdding(async () => {
              const result = await addToCart(variant.id, clampedQuantity);
              if (result.status === "error") {
                toast.error(result.message);
                return;
              }
              toast.success("Ditambahkan ke keranjang", {
                description: product.name,
                action: { label: "Lihat", onClick: () => setCartDrawerOpen(true) },
              });
            })
          }
        >
          {adding ? <Spinner /> : <ShoppingCartIcon />}
          {stock <= 0
            ? "Stok habis"
            : product.preorderDays !== null
              ? "Pre-order"
              : "Tambah ke keranjang"}
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
