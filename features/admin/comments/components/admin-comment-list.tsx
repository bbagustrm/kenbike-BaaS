import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

import type { AdminComment } from "../queries";
import { AdminReplyForm, CommentModeration } from "./comment-actions";

/** Daftar pertanyaan + utas balasan untuk admin (server component). */
export function AdminCommentList({ comments }: { comments: AdminComment[] }) {
  return (
    <ul className="divide-y rounded-xl border">
      {comments.map((c) => (
        <li key={c.id} className={cn("space-y-3 p-4", c.isHidden && "bg-muted/40")}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium">{c.authorName}</span>
                {c.authorEmail && <span className="text-muted-foreground">{c.authorEmail}</span>}
                {!c.answered && !c.isHidden && <Badge variant="destructive">Belum dijawab</Badge>}
                {c.isHidden && <Badge variant="outline">Disembunyikan</Badge>}
              </div>
              <p className="text-xs text-muted-foreground">
                {formatDateTime(c.createdAt)} ·{" "}
                <Link
                  href={`/products/${c.productSlug}#komentar`}
                  target="_blank"
                  className="underline-offset-4 hover:underline"
                >
                  {c.productName}
                </Link>
              </p>
            </div>
            <CommentModeration commentId={c.id} hidden={c.isHidden} />
          </div>

          <p className="text-sm break-words whitespace-pre-line">{c.body}</p>

          {c.replies.length > 0 && (
            <ul className="ml-4 space-y-3 border-l-2 pl-3 sm:ml-6">
              {c.replies.map((r) => (
                <li key={r.id} className={cn("space-y-1", r.isHidden && "opacity-60")}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-medium">{r.authorName}</span>
                      {r.authorIsAdmin && (
                        <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                          Admin
                        </Badge>
                      )}
                      {r.isHidden && <Badge variant="outline">Disembunyikan</Badge>}
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(r.createdAt)}
                      </span>
                    </div>
                    <CommentModeration commentId={r.id} hidden={r.isHidden} isReply />
                  </div>
                  <p className="text-sm break-words whitespace-pre-line">{r.body}</p>
                </li>
              ))}
            </ul>
          )}

          {!c.isHidden && <AdminReplyForm productId={c.productId} commentId={c.id} />}
        </li>
      ))}
    </ul>
  );
}
