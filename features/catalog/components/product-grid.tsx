import { Skeleton } from "@/components/ui/skeleton";

import type { ProductCardData } from "../types";
import { ProductCard } from "./product-card";

const GRID = "grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4";

export function ProductGrid({ products }: { products: ProductCardData[] }) {
  return (
    <div className={GRID}>
      {products.map((product, i) => (
        <ProductCard key={product.id} product={product} priority={i < 4} />
      ))}
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className={GRID} aria-busy="true" aria-label="Memuat produk">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="aspect-square rounded-lg" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      ))}
    </div>
  );
}
