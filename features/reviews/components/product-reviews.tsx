"use client";

import { MessageSquareTextIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { fetchProductReviews, fetchRatingDistribution } from "../fetch";
import { type ProductReview, type RatingDistribution, REVIEW_PREVIEW_COUNT } from "../types";
import { AllReviewsDialog } from "./all-reviews-dialog";
import { type LightboxState, PhotoLightbox } from "./photo-lightbox";
import { RatingSummary } from "./rating-summary";
import { ReviewItem } from "./review-item";

/**
 * Isi section Ulasan di halaman produk. Dirender hanya saat panel accordion
 * terbuka, jadi data (2 ulasan terbaru + distribusi) baru diambil saat itu.
 */
export function ProductReviews({
  productId,
  avg,
  count,
}: {
  productId: string;
  avg: number;
  count: number;
}) {
  const [reviews, setReviews] = useState<ProductReview[] | null>(null);
  const [distribution, setDistribution] = useState<RatingDistribution | null>(null);
  const [failed, setFailed] = useState(false);
  const [lightbox, setLightbox] = useState<LightboxState>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (count === 0) return;
    let cancelled = false;
    Promise.all([
      fetchProductReviews({ productId, limit: REVIEW_PREVIEW_COUNT }),
      fetchRatingDistribution(productId),
    ])
      .then(([page, dist]) => {
        if (cancelled) return;
        setReviews(page.reviews);
        setDistribution(dist);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [productId, count, attempt]);

  if (count === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-center text-muted-foreground">
        <MessageSquareTextIcon className="size-8" aria-hidden="true" />
        <p>Belum ada ulasan untuk produk ini.</p>
        <p className="text-xs">Ulasan ditulis oleh pembeli setelah pesanannya sampai.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <RatingSummary avg={avg} count={count} distribution={distribution} />
      {failed ? (
        <div className="text-sm">
          <span className="text-muted-foreground">Gagal memuat ulasan. </span>
          <Button
            variant="link"
            className="h-auto p-0"
            onClick={() => {
              setFailed(false);
              setAttempt((n) => n + 1);
            }}
          >
            Coba lagi
          </Button>
        </div>
      ) : reviews === null ? (
        <div className="space-y-4" aria-busy="true">
          {Array.from({ length: REVIEW_PREVIEW_COUNT }, (_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-12 w-full" />
            </div>
          ))}
        </div>
      ) : (
        <div className="divide-y">
          {reviews.map((review) => (
            <ReviewItem
              key={review.id}
              review={review}
              onPhotoClick={(photos, index) => setLightbox({ photos, index })}
            />
          ))}
        </div>
      )}
      {count > REVIEW_PREVIEW_COUNT && (
        <AllReviewsDialog productId={productId} count={count} distribution={distribution} />
      )}
      <PhotoLightbox state={lightbox} onChange={setLightbox} />
    </div>
  );
}
