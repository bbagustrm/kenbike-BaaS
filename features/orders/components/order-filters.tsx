import Link from "next/link";

import { cn } from "@/lib/utils";

import { ORDER_FILTERS, type OrderFilter } from "@/lib/order-status";

export function ordersHref(filter?: OrderFilter, page = 1) {
  const sp = new URLSearchParams();
  if (filter) sp.set("status", filter);
  if (page > 1) sp.set("page", String(page));
  const qs = sp.toString();
  return qs ? `/account/orders?${qs}` : "/account/orders";
}

/** Filter status sebagai tautan (bisa dibagikan & tetap jalan tanpa JS). */
export function OrderFilters({ active }: { active?: OrderFilter }) {
  const items: [OrderFilter | undefined, string][] = [
    [undefined, "Semua"],
    ...(Object.entries(ORDER_FILTERS) as [OrderFilter, string][]),
  ];
  return (
    <nav aria-label="Filter status pesanan" className="flex gap-2 overflow-x-auto pb-1">
      {items.map(([value, label]) => {
        const current = value === active;
        return (
          <Link
            key={label}
            href={ordersHref(value)}
            aria-current={current ? "page" : undefined}
            className={cn(
              "rounded-full border px-3 py-1 text-sm whitespace-nowrap transition-colors",
              current
                ? "border-primary bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
