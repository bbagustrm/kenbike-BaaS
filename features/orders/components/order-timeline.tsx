import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

import type { TimelineEntry } from "@/lib/order-status";
import { toneDotClass } from "./order-status-badge";

/** Riwayat status order, terbaru di atas. */
export function OrderTimeline({ entries }: { entries: TimelineEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">Belum ada riwayat.</p>;
  }
  const latestFirst = [...entries].reverse();
  return (
    <ol className="relative space-y-5 border-l pl-6">
      {latestFirst.map((entry, i) => (
        <li key={`${entry.label}-${entry.at}`} className="relative">
          <span
            aria-hidden="true"
            className={cn(
              "absolute top-1.5 -left-[1.95rem] size-3 rounded-full ring-4 ring-background",
              i === 0 ? toneDotClass[entry.tone] : "bg-border",
            )}
          />
          <p className={cn("text-sm", i === 0 ? "font-medium" : "text-muted-foreground")}>
            {entry.label}
          </p>
          <time className="text-xs text-muted-foreground" dateTime={entry.at}>
            {formatDateTime(entry.at)}
          </time>
        </li>
      ))}
    </ol>
  );
}
