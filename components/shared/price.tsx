import { formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Harga tunggal atau rentang ("Rp 450.000 – Rp 500.000"). */
export function Price({
  min,
  max = min,
  className,
}: {
  min: number;
  max?: number;
  className?: string;
}) {
  return (
    <span className={cn("font-semibold tabular-nums", className)}>
      {min === max ? formatRupiah(min) : `${formatRupiah(min)} – ${formatRupiah(max)}`}
    </span>
  );
}
