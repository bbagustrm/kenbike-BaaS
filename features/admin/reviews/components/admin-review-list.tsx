import Image from "next/image";
import Link from "next/link";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { RatingStars } from "@/components/shared/rating-stars";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { reviewPhotoUrl } from "@/features/reviews/types";
import { formatDate, formatDateTime } from "@/lib/format";

import { deleteReview } from "../actions";
import type { AdminReview } from "../queries";
import { ReviewReplyDialog } from "./review-reply-dialog";

/** Daftar ulasan admin (server component) dengan aksi balas & hapus. */
export function AdminReviewList({ reviews }: { reviews: AdminReview[] }) {
  return (
    <ul className="divide-y rounded-xl border">
      {reviews.map((review) => (
        <li key={review.id} className="space-y-3 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{review.reviewerName}</span>
                <RatingStars value={review.rating} size="xs" />
                {review.source === "imported" && <Badge variant="outline">Impor</Badge>}
                {!review.adminReply && <Badge variant="destructive">Belum dibalas</Badge>}
              </div>
              <p className="text-xs text-muted-foreground">
                {formatDate(review.createdAt)}
                {review.orderNumber && (
                  <>
                    {" · "}
                    <Link
                      href={`/admin/orders/${encodeURIComponent(review.orderNumber)}`}
                      className="font-mono underline-offset-4 hover:underline"
                    >
                      {review.orderNumber}
                    </Link>
                  </>
                )}
              </p>
              <p className="text-xs">
                {review.products.map((p, i) => (
                  <span key={p.id}>
                    {i > 0 && ", "}
                    <Link
                      href={`/products/${p.slug}`}
                      target="_blank"
                      className="underline-offset-4 hover:underline"
                    >
                      {p.name}
                    </Link>
                    {p.variantLabel && (
                      <span className="text-muted-foreground"> ({p.variantLabel})</span>
                    )}
                  </span>
                ))}
              </p>
            </div>
            <div className="flex gap-2">
              <ReviewReplyDialog
                reviewId={review.id}
                reviewerName={review.reviewerName}
                initial={review.adminReply}
              />
              <ConfirmDialog
                trigger={<Button variant="ghost" size="sm" className="text-destructive" />}
                triggerLabel="Hapus"
                title="Hapus ulasan ini?"
                description="Ulasan tidak tampil lagi dan rating produk dihitung ulang. Jejaknya tetap tersimpan."
                confirmLabel="Hapus ulasan"
                destructive
                onConfirm={deleteReview.bind(null, review.id)}
              />
            </div>
          </div>

          {review.body && <p className="text-sm whitespace-pre-line">{review.body}</p>}
          {review.photos.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {review.photos.map((path) => (
                <a key={path} href={reviewPhotoUrl(path)} target="_blank" rel="noopener noreferrer">
                  <Image
                    src={reviewPhotoUrl(path)}
                    alt=""
                    width={64}
                    height={64}
                    className="size-14 rounded-lg border object-cover"
                  />
                </a>
              ))}
            </div>
          )}
          {review.adminReply && (
            <div className="ml-4 space-y-1 border-l-2 pl-3 text-sm">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-medium">KenBike</span>
                <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                  Admin
                </Badge>
                {review.adminReplyAt && (
                  <span className="text-muted-foreground">
                    {formatDateTime(review.adminReplyAt)}
                  </span>
                )}
              </div>
              <p className="whitespace-pre-line text-muted-foreground">{review.adminReply}</p>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
