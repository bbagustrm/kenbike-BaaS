import { ChevronLeftIcon } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

/** Judul halaman admin + tombol kembali opsional + slot aksi di kanan. */
export function AdminPageHeader({
  title,
  description,
  actions,
  backHref,
  backLabel = "Kembali",
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex items-start gap-2">
        {backHref && (
          <Link
            href={backHref}
            aria-label={backLabel}
            title={backLabel}
            className={buttonVariants({
              variant: "ghost",
              size: "icon",
              className: "mt-0.5 -ml-2",
            })}
          >
            <ChevronLeftIcon />
          </Link>
        )}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
