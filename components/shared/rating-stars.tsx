import { StarIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/** Bintang 0–5 (bisa pecahan, mis. 4,5) untuk tampilan saja. */
export function RatingStars({
  value,
  className,
  size = "sm",
}: {
  value: number;
  className?: string;
  size?: "xs" | "sm" | "md";
}) {
  const box = size === "xs" ? "size-3" : size === "md" ? "size-5" : "size-4";
  return (
    <span
      className={cn("inline-flex items-center gap-0.5", className)}
      role="img"
      aria-label={`${value.toLocaleString("id-ID", { maximumFractionDigits: 1 })} dari 5 bintang`}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const fill = Math.max(0, Math.min(1, value - (star - 1)));
        return (
          <span key={star} className={cn("relative", box)} aria-hidden="true">
            <StarIcon className={cn("absolute inset-0 text-muted-foreground/40", box)} />
            {fill > 0 && (
              <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${fill * 100}%` }}
              >
                <StarIcon className={cn("fill-amber-400 text-amber-400", box)} />
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}

/** "4,5" — format rata-rata rating gaya Indonesia. */
export function formatRating(value: number): string {
  return value.toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}
