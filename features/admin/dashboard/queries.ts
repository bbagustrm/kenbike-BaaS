import "server-only";

import { LOW_STOCK_THRESHOLD } from "@/features/admin/products/constants";
import { createClient } from "@/lib/supabase/server";

import type { DailySales } from "./components/sales-chart";

type Stats = {
  revenue: number;
  paid_orders: number;
  pending_payment: number;
  to_ship: number;
  shipped: number;
  attention: number;
  daily: DailySales[];
  low_stock: { product_id: string; product_name: string; sku: string; available: number }[];
};

export type Dashboard = {
  revenue: { today: number; week: number; month: number };
  ordersToday: number;
  paidToday: number;
  pendingPayment: number;
  toShip: number;
  shipped: number;
  attention: number;
  refundPending: number;
  daily: DailySales[];
  lowStock: Stats["low_stock"];
  cron: {
    name: string;
    active: boolean;
    lastRunAt: string | null;
    lastStatus: string | null;
    failures24h: number;
  }[];
};

/** Awal hari ini (WIB) dalam ISO UTC. */
function todayStartWib(now = new Date()): string {
  const wib = new Date(now.getTime() + 7 * 3_600_000).toISOString().slice(0, 10);
  return new Date(`${wib}T00:00:00+07:00`).toISOString();
}

/** Ringkasan dashboard; agregasi di DB lewat RPC admin_dashboard_stats. Tanpa cache. */
export async function getDashboard(): Promise<Dashboard> {
  const supabase = await createClient();
  const stats = async (days: number) => {
    const { data, error } = await supabase.rpc("admin_dashboard_stats", {
      p_days: days,
      p_low_stock: LOW_STOCK_THRESHOLD,
    });
    if (error) throw new Error(`admin_dashboard_stats: ${error.message}`);
    return data as unknown as Stats;
  };

  const [today, week, month, created, refunds, cron] = await Promise.all([
    stats(1),
    stats(7),
    stats(30),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .gte("created_at", todayStartWib()),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("payment_status", "refund_pending"),
    supabase.rpc("admin_cron_health"),
  ]);
  if (cron.error) throw new Error(`admin_cron_health: ${cron.error.message}`);

  return {
    revenue: { today: today.revenue, week: week.revenue, month: month.revenue },
    ordersToday: created.count ?? 0,
    paidToday: today.paid_orders,
    pendingPayment: month.pending_payment,
    toShip: month.to_ship,
    shipped: month.shipped,
    attention: month.attention,
    refundPending: refunds.count ?? 0,
    daily: month.daily,
    lowStock: month.low_stock,
    cron: cron.data.map((j) => ({
      name: j.job_name,
      active: j.active,
      lastRunAt: j.last_run_at,
      lastStatus: j.last_status,
      failures24h: j.failures_24h,
    })),
  };
}
