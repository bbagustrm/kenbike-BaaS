"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { type ChartConfig, ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { formatRupiah } from "@/lib/format";

export type DailySales = { date: string; revenue: number; orders: number };

const config = {
  revenue: { label: "Omzet", color: "var(--primary)" },
} satisfies ChartConfig;

const dayLabel = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
const compact = new Intl.NumberFormat("id-ID", { notation: "compact", maximumFractionDigits: 1 });

const formatDay = (iso: string) => dayLabel.format(new Date(`${iso}T00:00:00Z`));

/** Omzet harian (order lunas) — satu seri, jadi judul kartu sudah menamainya (tanpa legenda). */
export function SalesChart({ data }: { data: DailySales[] }) {
  return (
    <div>
      <ChartContainer config={config} className="aspect-auto h-64 w-full">
        <BarChart data={data} margin={{ left: 4, right: 4, top: 8 }} barCategoryGap={2}>
          <CartesianGrid vertical={false} strokeOpacity={0.4} />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={24}
            tickFormatter={formatDay}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={48}
            tickFormatter={(v: number) => compact.format(v)}
          />
          <ChartTooltip
            cursor={{ fill: "var(--muted)", opacity: 0.6 }}
            content={({ active, payload }) => {
              const row = active ? (payload?.[0]?.payload as DailySales | undefined) : undefined;
              if (!row) return null;
              return (
                <div className="rounded-lg border bg-background px-3 py-2 text-xs shadow-md">
                  <p className="font-medium">{formatDay(row.date)}</p>
                  <p className="tabular-nums">{formatRupiah(row.revenue)}</p>
                  <p className="text-muted-foreground">{row.orders} pesanan lunas</p>
                </div>
              );
            }}
          />
          <Bar
            dataKey="revenue"
            fill="var(--color-revenue)"
            radius={[4, 4, 0, 0]}
            maxBarSize={28}
          />
        </BarChart>
      </ChartContainer>

      <details className="mt-2 text-xs text-muted-foreground">
        <summary className="cursor-pointer">Lihat sebagai tabel</summary>
        <table className="mt-2 w-full text-left">
          <thead>
            <tr>
              <th className="py-1 font-medium">Tanggal</th>
              <th className="py-1 text-right font-medium">Pesanan</th>
              <th className="py-1 text-right font-medium">Omzet</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.date} className="border-t">
                <td className="py-1">{formatDay(d.date)}</td>
                <td className="py-1 text-right tabular-nums">{d.orders}</td>
                <td className="py-1 text-right tabular-nums">{formatRupiah(d.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
