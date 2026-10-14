import { z } from "zod";

import { ORDER_FILTER_QUERY, ORDER_FILTERS, type OrderFilter } from "@/lib/order-status";
import { firstParam } from "@/lib/search";

/** Filter daftar order admin: status customer + "perlu tindakan" + "menunggu refund". */
export const ADMIN_ORDER_FILTERS = {
  attention: "Perlu tindakan",
  refund: "Menunggu refund",
  ...ORDER_FILTERS,
} as const;

export type AdminOrderFilter = keyof typeof ADMIN_ORDER_FILTERS;

export const ADMIN_ORDER_FILTER_QUERY: Record<Exclude<AdminOrderFilter, "attention">, string> = {
  ...ORDER_FILTER_QUERY,
  refund: "payment_status.eq.refund_pending",
};

export type AdminOrderListParams = {
  filter?: AdminOrderFilter;
  q?: string;
  /** YYYY-MM-DD (WIB) */
  from?: string;
  to?: string;
  page: number;
};

const date = z.iso.date();

export function parseAdminOrderParams(
  raw: Record<string, string | string[] | undefined>,
): AdminOrderListParams {
  const filter = firstParam(raw.status);
  const from = firstParam(raw.from);
  const to = firstParam(raw.to);
  return {
    filter: filter && filter in ADMIN_ORDER_FILTERS ? (filter as AdminOrderFilter) : undefined,
    // Koma/kurung adalah sintaks filter or() PostgREST → dibuang.
    q:
      firstParam(raw.q)?.replace(/[,()]/g, " ").replace(/\s+/g, " ").trim().slice(0, 100) ||
      undefined,
    from: from && date.safeParse(from).success ? from : undefined,
    to: to && date.safeParse(to).success ? to : undefined,
    page: Math.max(1, Math.min(500, Number.parseInt(firstParam(raw.page) ?? "1", 10) || 1)),
  };
}

export function adminOrdersHref(params: Partial<AdminOrderListParams>) {
  const sp = new URLSearchParams();
  if (params.filter) sp.set("status", params.filter);
  if (params.q) sp.set("q", params.q);
  if (params.from) sp.set("from", params.from);
  if (params.to) sp.set("to", params.to);
  if (params.page && params.page > 1) sp.set("page", String(params.page));
  const qs = sp.toString();
  return qs ? `/admin/orders?${qs}` : "/admin/orders";
}

/** Awal hari (WIB) dalam ISO UTC, untuk filter created_at. */
export function wibDayStart(day: string): string {
  return new Date(`${day}T00:00:00+07:00`).toISOString();
}

export type { OrderFilter };
