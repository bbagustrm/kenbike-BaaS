import { BikeIcon } from "lucide-react";
import Image from "next/image";

import { cn } from "@/lib/utils";

import { productImageUrl } from "../images";

type ProductImageProps = {
  path: string | null;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
};

/** Gambar produk persegi; placeholder ikon jika produk belum punya foto. */
export function ProductImage({ path, alt, sizes, priority, className }: ProductImageProps) {
  return (
    <div className={cn("relative aspect-square overflow-hidden rounded-lg bg-muted", className)}>
      {path ? (
        <Image
          src={productImageUrl(path)}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
        />
      ) : (
        <div className="flex size-full items-center justify-center text-muted-foreground/40">
          <BikeIcon className="size-1/3" aria-hidden="true" />
          <span className="sr-only">{alt} (belum ada foto)</span>
        </div>
      )}
    </div>
  );
}
