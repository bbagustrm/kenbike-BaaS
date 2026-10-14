import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import type { Tone } from "@/lib/order-status";

const TONE: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground",
  warning: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  info: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  success: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  danger: "bg-destructive/10 text-destructive",
};

export function StatusBadge({ label, tone }: { label: string; tone: Tone }) {
  return (
    <Badge variant="secondary" className={cn("border-transparent", TONE[tone])}>
      {label}
    </Badge>
  );
}

export const toneDotClass: Record<Tone, string> = {
  neutral: "bg-muted-foreground",
  warning: "bg-amber-500",
  info: "bg-sky-500",
  success: "bg-emerald-500",
  danger: "bg-destructive",
};
