import { PackageIcon } from "lucide-react";
import Link from "next/link";

import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

import type { MyConversation } from "../queries";

/** Daftar percakapan pembeli (server component). */
export function MyConversationList({ conversations }: { conversations: MyConversation[] }) {
  return (
    <ul className="divide-y overflow-hidden rounded-xl border">
      {conversations.map((c) => (
        <li key={c.id}>
          <Link
            href={`/account/messages/${c.id}`}
            className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
          >
            <span
              className={cn(
                "mt-1.5 size-2 shrink-0 rounded-full",
                c.unread ? "bg-primary" : "bg-transparent",
              )}
              aria-label={c.unread ? "Ada balasan baru" : undefined}
            />
            <div className="min-w-0 flex-1 space-y-0.5">
              <div className="flex items-center gap-2">
                {c.orderNumber && (
                  <PackageIcon
                    className="size-3.5 shrink-0 text-muted-foreground"
                    aria-label="Pesanan"
                  />
                )}
                <span
                  className={cn("min-w-0 flex-1 truncate text-sm", c.unread && "font-semibold")}
                >
                  {c.subject}
                </span>
                <time dateTime={c.lastMessageAt} className="shrink-0 text-xs text-muted-foreground">
                  {formatDateTime(c.lastMessageAt)}
                </time>
              </div>
              <p className="truncate text-sm text-muted-foreground">
                {c.lastSender === "customer"
                  ? "Kamu: "
                  : c.lastSender === "admin"
                    ? "KenBike: "
                    : ""}
                {c.preview}
              </p>
              {c.status === "closed" && (
                <span className="text-xs text-muted-foreground">
                  Selesai · balas untuk membuka lagi
                </span>
              )}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
