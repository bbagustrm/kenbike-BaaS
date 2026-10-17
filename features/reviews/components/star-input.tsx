"use client";

import { StarIcon } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

import { RATING_LABELS } from "../schemas";

/** Pilih bintang 1–5 (radio group: klik atau panah kiri/kanan). */
export function StarInput({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        role="radiogroup"
        aria-label="Beri bintang"
        className="flex gap-1"
        onMouseLeave={() => setHover(0)}
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={`${star} bintang — ${RATING_LABELS[star]}`}
            tabIndex={value === star || (value === 0 && star === 1) ? 0 : -1}
            disabled={disabled}
            onMouseEnter={() => setHover(star)}
            onClick={() => onChange(star)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowUp") {
                e.preventDefault();
                onChange(Math.min(5, (value || 0) + 1));
              }
              if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
                e.preventDefault();
                onChange(Math.max(1, (value || 2) - 1));
              }
            }}
            className="rounded-md p-0.5 transition-transform hover:scale-110 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <StarIcon
              className={cn(
                "size-9",
                star <= shown ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40",
              )}
            />
          </button>
        ))}
      </div>
      <p className="h-5 text-sm font-medium" aria-live="polite">
        {shown ? RATING_LABELS[shown] : ""}
      </p>
    </div>
  );
}
