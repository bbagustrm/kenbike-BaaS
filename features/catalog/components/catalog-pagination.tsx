import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { pageItems } from "../pagination";
import { type ProductListParams, productListHref } from "../search-params";

export function CatalogPagination({
  params,
  pageCount,
}: {
  params: ProductListParams;
  pageCount: number;
}) {
  if (pageCount <= 1) return null;
  const href = (page: number) => productListHref({ ...params, page });
  const linkClass = (active = false) =>
    buttonVariants({ variant: active ? "outline" : "ghost", size: "icon" });

  return (
    <nav aria-label="Halaman" className="flex items-center justify-center gap-1">
      {params.page > 1 && (
        <Link href={href(params.page - 1)} className={linkClass()} aria-label="Halaman sebelumnya">
          <ChevronLeftIcon />
        </Link>
      )}
      {pageItems(params.page, pageCount).map((item, i) =>
        item === "ellipsis" ? (
          <span key={`e${i}`} className="px-2 text-muted-foreground" aria-hidden="true">
            …
          </span>
        ) : (
          <Link
            key={item}
            href={href(item)}
            className={cn(linkClass(item === params.page))}
            aria-current={item === params.page ? "page" : undefined}
          >
            {item}
          </Link>
        ),
      )}
      {params.page < pageCount && (
        <Link href={href(params.page + 1)} className={linkClass()} aria-label="Halaman berikutnya">
          <ChevronRightIcon />
        </Link>
      )}
    </nav>
  );
}
