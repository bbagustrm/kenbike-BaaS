import Link from "next/link";

import { Price } from "@/components/shared/price";

import type { ProductCardData } from "../types";
import { ProductImage } from "./product-image";

export function ProductCard({
  product,
  priority,
}: {
  product: ProductCardData;
  priority?: boolean;
}) {
  return (
    <Link
      href={`/products/${product.slug}`}
      className="group flex flex-col gap-3 rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <ProductImage
        path={product.imagePath}
        alt={product.name}
        sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
        priority={priority}
        className="transition-opacity group-hover:opacity-90"
      />
      <div className="space-y-1">
        {product.categoryName && (
          <p className="text-xs text-muted-foreground">{product.categoryName}</p>
        )}
        <h3 className="line-clamp-2 text-sm font-medium group-hover:underline">{product.name}</h3>
        <p className="text-sm">
          {product.priceMin !== product.priceMax && (
            <span className="text-muted-foreground">Mulai </span>
          )}
          <Price min={product.priceMin} />
        </p>
      </div>
    </Link>
  );
}
