"use client";

import { StarIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

import { fetchProductReviews } from "../fetch";
import {
  type ProductReview,
  type RatingDistribution,
  REVIEW_PAGE_SIZE,
  type ReviewCursor,
} from "../types";
import { type LightboxState, PhotoLightbox } from "./photo-lightbox";
import { ReviewItem } from "./review-item";

/**
 * Semua ulasan dalam modal: filter bintang, terbaru dulu, 5 per muat
 * (infinite scroll). Isi modal baru dirender — dan datanya diambil — saat dibuka.
 */
export function AllReviewsDialog({
  productId,
  count,
  distribution,
}: {
  productId: string;
  count: number;
  distribution: RatingDistribution | null;
}) {
  const [rating, setRating] = useState<number | null>(null);
  const [lightbox, setLightbox] = useState<LightboxState>(null);

  const filters: { value: number | null; label: string; n: number }[] = [
    { value: null, label: "Semua", n: count },
    ...([5, 4, 3, 2, 1] as const).map((star) => ({
      value: star,
      label: String(star),
      n: distribution?.[star] ?? 0,
    })),
  ];

  return (
    <>
      <Dialog>
        <DialogTrigger render={<Button variant="outline" className="w-full sm:w-auto" />}>
          Tampilkan semua ulasan ({count})
        </DialogTrigger>
        <DialogContent className="flex max-h-[90dvh] flex-col gap-0 p-0 sm:max-w-2xl">
          <DialogHeader className="space-y-3 border-b p-4">
            <DialogTitle>Ulasan pembeli</DialogTitle>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filter bintang">
              {filters.map((f) => (
                <Button
                  key={f.label}
                  size="sm"
                  variant={rating === f.value ? "default" : "outline"}
                  aria-pressed={rating === f.value}
                  onClick={() => setRating(f.value)}
                  className="gap-1"
                >
                  {f.value !== null && <StarIcon className="fill-current" />}
                  {f.label}
                  <span
                    className={cn("tabular-nums", rating !== f.value && "text-muted-foreground")}
                  >
                    ({f.n})
                  </span>
                </Button>
              ))}
            </div>
          </DialogHeader>
          {/* key: ganti filter → daftar baru dari awal. */}
          <ReviewList
            key={rating ?? "all"}
            productId={productId}
            rating={rating}
            onPhotoClick={(photos, index) => setLightbox({ photos, index })}
          />
        </DialogContent>
      </Dialog>
      <PhotoLightbox state={lightbox} onChange={setLightbox} />
    </>
  );
}

type ListState = {
  reviews: ProductReview[];
  next: ReviewCursor | null;
  status: "loading" | "idle" | "done" | "error";
};

function ReviewList({
  productId,
  rating,
  onPhotoClick,
}: {
  productId: string;
  rating: number | null;
  onPhotoClick: (photos: string[], index: number) => void;
}) {
  const [state, setState] = useState<ListState>({ reviews: [], next: null, status: "loading" });
  const sentinel = useRef<HTMLDivElement>(null);
  const inFlight = useRef(false);

  const load = useCallback(
    async (before: ReviewCursor | null) => {
      if (inFlight.current) return;
      inFlight.current = true;
      try {
        const page = await fetchProductReviews({
          productId,
          limit: REVIEW_PAGE_SIZE,
          rating,
          before,
        });
        setState((prev) => ({
          reviews: before ? [...prev.reviews, ...page.reviews] : page.reviews,
          next: page.next,
          status: page.next ? "idle" : "done",
        }));
      } catch {
        setState((prev) => ({ ...prev, status: "error" }));
      } finally {
        inFlight.current = false;
      }
    },
    [productId, rating],
  );

  // Muat halaman pertama saat daftar ditampilkan.
  useEffect(() => {
    let cancelled = false;
    fetchProductReviews({ productId, limit: REVIEW_PAGE_SIZE, rating })
      .then((page) => {
        if (cancelled) return;
        setState({
          reviews: page.reviews,
          next: page.next,
          status: page.next ? "idle" : "done",
        });
      })
      .catch(() => !cancelled && setState((prev) => ({ ...prev, status: "error" })));
    return () => {
      cancelled = true;
    };
  }, [productId, rating]);

  // Infinite scroll: muat berikutnya saat penanda di bawah daftar terlihat.
  useEffect(() => {
    const el = sentinel.current;
    if (!el || state.status !== "idle") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        setState((prev) => ({ ...prev, status: "loading" }));
        void load(state.next);
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [state.status, state.next, load]);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4">
      <div className="divide-y">
        {state.reviews.map((review) => (
          <ReviewItem key={review.id} review={review} onPhotoClick={onPhotoClick} />
        ))}
      </div>
      {state.status === "done" && state.reviews.length === 0 && (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Belum ada ulasan dengan bintang ini.
        </p>
      )}
      {state.status === "error" && (
        <div className="py-6 text-center text-sm">
          <p className="text-muted-foreground">Gagal memuat ulasan.</p>
          <Button
            variant="link"
            onClick={() => {
              setState((prev) => ({ ...prev, status: "loading" }));
              void load(state.next);
            }}
          >
            Coba lagi
          </Button>
        </div>
      )}
      <div ref={sentinel} aria-hidden="true" className="h-px" />
      {state.status === "loading" && (
        <div className="flex justify-center py-4">
          <Spinner />
        </div>
      )}
    </div>
  );
}
