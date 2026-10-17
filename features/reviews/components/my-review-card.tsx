import Image from "next/image";

import { RatingStars } from "@/components/shared/rating-stars";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/format";

import type { MyOrderReview } from "../queries";
import { reviewPhotoUrl } from "../types";

/** Ulasan milik pembeli di detail pesanan (read-only; tidak bisa diubah). */
export function MyReviewCard({ review }: { review: MyOrderReview }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ulasanmu</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <RatingStars value={review.rating} />
          <span className="text-xs text-muted-foreground">{formatDate(review.createdAt)}</span>
        </div>
        {review.body && <p className="whitespace-pre-line">{review.body}</p>}
        {review.photos.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {review.photos.map((path) => (
              <Image
                key={path}
                src={reviewPhotoUrl(path)}
                alt=""
                width={64}
                height={64}
                className="size-14 rounded-lg border object-cover"
              />
            ))}
          </div>
        )}
        {review.adminReply && (
          <div className="ml-4 space-y-1 border-l-2 pl-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-medium">KenBike</span>
              <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                Admin
              </Badge>
            </div>
            <p className="whitespace-pre-line text-muted-foreground">{review.adminReply}</p>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Terima kasih! Ulasan tampil di halaman produk.
        </p>
      </CardContent>
    </Card>
  );
}
