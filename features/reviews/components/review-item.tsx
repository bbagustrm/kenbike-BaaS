"use client";

import Image from "next/image";

import { RatingStars } from "@/components/shared/rating-stars";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";

import { type ProductReview, reviewPhotoUrl } from "../types";

/** Satu ulasan + balasan admin (menjorok, badge Admin). */
export function ReviewItem({
  review,
  onPhotoClick,
}: {
  review: ProductReview;
  onPhotoClick?: (photos: string[], index: number) => void;
}) {
  return (
    <article className="space-y-2 py-4 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-sm font-medium">{review.reviewerName}</span>
        <RatingStars value={review.rating} size="xs" />
        <time dateTime={review.createdAt} className="text-xs text-muted-foreground">
          {formatDate(review.createdAt)}
        </time>
      </div>
      {review.variantLabel && (
        <p className="text-xs text-muted-foreground">Varian: {review.variantLabel}</p>
      )}
      {review.body && <p className="text-sm whitespace-pre-line">{review.body}</p>}
      {review.photos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {review.photos.map((path, i) => (
            <button
              key={path}
              type="button"
              onClick={() => onPhotoClick?.(review.photos, i)}
              className="overflow-hidden rounded-lg border focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              aria-label={`Lihat foto ${i + 1} dari ulasan ${review.reviewerName}`}
            >
              <Image
                src={reviewPhotoUrl(path)}
                alt=""
                width={72}
                height={72}
                className="size-16 object-cover sm:size-18"
              />
            </button>
          ))}
        </div>
      )}
      {review.adminReply && (
        <div className="ml-4 space-y-1 border-l-2 pl-3 sm:ml-6">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-medium">KenBike</span>
            <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
              Admin
            </Badge>
            {review.adminReplyAt && (
              <time dateTime={review.adminReplyAt} className="text-muted-foreground">
                {formatDate(review.adminReplyAt)}
              </time>
            )}
          </div>
          <p className="text-sm whitespace-pre-line text-muted-foreground">{review.adminReply}</p>
        </div>
      )}
    </article>
  );
}
