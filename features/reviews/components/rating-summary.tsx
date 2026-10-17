import { formatRating, RatingStars } from "@/components/shared/rating-stars";

import type { RatingDistribution } from "../types";

/** Rata-rata besar + bar distribusi bintang (distribusi null = sedang dimuat). */
export function RatingSummary({
  avg,
  count,
  distribution,
}: {
  avg: number;
  count: number;
  distribution: RatingDistribution | null;
}) {
  return (
    <div className="flex flex-wrap items-center gap-6">
      <div className="space-y-1 text-center">
        <p className="text-4xl font-semibold tabular-nums">
          {formatRating(avg)}
          <span className="text-base font-normal text-muted-foreground">/5</span>
        </p>
        <RatingStars value={avg} />
        <p className="text-xs text-muted-foreground">{count} ulasan</p>
      </div>
      <dl className="min-w-48 flex-1 space-y-1">
        {([5, 4, 3, 2, 1] as const).map((star) => {
          const n = distribution?.[star] ?? 0;
          const pct = count > 0 ? (n / count) * 100 : 0;
          return (
            <div key={star} className="flex items-center gap-2 text-xs">
              <dt className="w-3 text-muted-foreground tabular-nums">{star}</dt>
              <dd className="flex flex-1 items-center gap-2">
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <span
                    className="block h-full rounded-full bg-amber-400 transition-[width]"
                    style={{ width: distribution ? `${pct}%` : "0%" }}
                  />
                </span>
                <span className="w-6 text-right text-muted-foreground tabular-nums">
                  {distribution ? n : "–"}
                </span>
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}
