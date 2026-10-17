import { PackageIcon } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

import { inboxQuery } from "../inbox-params";
import type { InboxItem, InboxParams } from "../queries";

/** Daftar percakapan admin (server component). */
export function InboxList({
  items,
  params,
  next,
  activeId,
}: {
  items: InboxItem[];
  params: InboxParams;
  next: { at: string; id: string } | null;
  activeId?: string;
}) {
  if (items.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyTitle>
            {params.filter === "needs_reply" ? "Semua pesan sudah dibalas" : "Tidak ada percakapan"}
          </EmptyTitle>
          <EmptyDescription>
            {params.q || params.kind
              ? "Ubah filter pencarian."
              : "Pesan pembeli akan muncul di sini."}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const query = inboxQuery({ ...params, before: undefined });

  return (
    <div className="space-y-2">
      <ul className="divide-y overflow-hidden rounded-xl border">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={`/admin/messages/${item.id}${query}`}
              aria-current={item.id === activeId ? "page" : undefined}
              className={cn(
                "block space-y-1 px-3 py-2.5 transition-colors hover:bg-muted/50",
                item.id === activeId && "bg-muted",
              )}
            >
              <div className="flex items-center gap-2">
                {item.unread && (
                  <span
                    className="size-2 shrink-0 rounded-full bg-primary"
                    aria-label="Belum dibaca"
                  />
                )}
                <span
                  className={cn("min-w-0 flex-1 truncate text-sm", item.unread && "font-semibold")}
                >
                  {item.customerName ?? item.customerEmail ?? "Pembeli"}
                </span>
                <time
                  dateTime={item.lastMessageAt}
                  className="shrink-0 text-xs text-muted-foreground"
                >
                  {formatDateTime(item.lastMessageAt)}
                </time>
              </div>
              <p className="flex items-center gap-1 truncate text-sm">
                {item.orderNumber && (
                  <PackageIcon
                    className="size-3.5 shrink-0 text-muted-foreground"
                    aria-label="Pesanan"
                  />
                )}
                <span className="truncate">{item.subject}</span>
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {item.lastSender === "admin" && "Kamu: "}
                {item.preview}
              </p>
              <div className="flex gap-1.5 text-[11px]">
                {item.needsReply && (
                  <span className="rounded bg-destructive/10 px-1.5 text-destructive">
                    Butuh balasan
                  </span>
                )}
                {item.status === "closed" && (
                  <span className="rounded bg-muted px-1.5 text-muted-foreground">Selesai</span>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
      {next && (
        <Link
          href={`/admin/messages${inboxQuery(params, next)}`}
          className={buttonVariants({ variant: "outline", size: "sm", className: "w-full" })}
        >
          Lebih lama
        </Link>
      )}
    </div>
  );
}
