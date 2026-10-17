"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

import { reviewPhotoUrl } from "../types";

export type LightboxState = { photos: string[]; index: number } | null;

/** Foto ulasan ukuran besar dengan navigasi sebelumnya/berikutnya. */
export function PhotoLightbox({
  state,
  onChange,
}: {
  state: LightboxState;
  onChange: (state: LightboxState) => void;
}) {
  const photos = state?.photos ?? [];
  const index = state?.index ?? 0;
  const go = (delta: number) =>
    state && onChange({ photos, index: (index + delta + photos.length) % photos.length });

  return (
    <Dialog open={state !== null} onOpenChange={(open) => !open && onChange(null)}>
      <DialogContent
        className="max-w-3xl p-2 sm:max-w-3xl"
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") go(-1);
          if (e.key === "ArrowRight") go(1);
        }}
      >
        <DialogTitle className="sr-only">
          Foto ulasan {index + 1} dari {photos.length}
        </DialogTitle>
        {photos[index] && (
          <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted sm:aspect-[4/3]">
            <Image
              src={reviewPhotoUrl(photos[index])}
              alt={`Foto ulasan ${index + 1}`}
              fill
              sizes="(min-width: 768px) 768px, 100vw"
              className="object-contain"
            />
          </div>
        )}
        {photos.length > 1 && (
          <div className="flex items-center justify-between px-1 pb-1">
            <Button variant="ghost" size="icon" onClick={() => go(-1)} aria-label="Foto sebelumnya">
              <ChevronLeftIcon />
            </Button>
            <span className="text-sm text-muted-foreground tabular-nums">
              {index + 1} / {photos.length}
            </span>
            <Button variant="ghost" size="icon" onClick={() => go(1)} aria-label="Foto berikutnya">
              <ChevronRightIcon />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
