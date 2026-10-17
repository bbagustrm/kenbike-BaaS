"use client";

import { ImagePlusIcon, XIcon } from "lucide-react";
import { useEffect, useId, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { ProductImage } from "@/components/shared/product-image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

import { submitOrderReview } from "../actions";
import { compressImage } from "../compress";
import {
  MAX_PHOTO_BYTES,
  MAX_REVIEW_LENGTH,
  MAX_REVIEW_PHOTOS,
  QUICK_TEXTS,
  hasQuickText,
  REVIEW_PHOTO_TYPES,
  reviewPhotoPath,
  toggleQuickText,
} from "../schemas";
import { REVIEW_PHOTO_BUCKET } from "../types";
import { StarInput } from "./star-input";

export type ReviewableOrder = {
  orderId: string;
  orderNumber: string;
  items: { name: string; variant: string | null; image: string | null; quantity: number }[];
};

/** Form ulasan satu pesanan: bintang (wajib), quick text, teks, foto (≤ 5). */
export function ReviewFormDialog({
  order,
  userId,
  open,
  onOpenChange,
  onSubmitted,
}: {
  order: ReviewableOrder;
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitted?: () => void;
}) {
  const id = useId();
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [pending, startTransition] = useTransition();

  const previews = useMemo(() => photos.map((f) => URL.createObjectURL(f)), [photos]);
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  function addPhotos(list: FileList | null) {
    if (!list) return;
    const picked = Array.from(list);
    if (picked.some((f) => !(f.type in REVIEW_PHOTO_TYPES))) {
      return void toast.error("Foto harus JPG, PNG, atau WEBP.");
    }
    if (photos.length + picked.length > MAX_REVIEW_PHOTOS) {
      return void toast.error(`Maksimal ${MAX_REVIEW_PHOTOS} foto.`);
    }
    setPhotos((prev) => [...prev, ...picked]);
  }

  function submit() {
    if (rating === 0) return void toast.error("Pilih bintang dulu ya.");
    startTransition(async () => {
      const supabase = createClient();
      const paths: string[] = [];
      for (const original of photos) {
        const file = await compressImage(original);
        if (file.size > MAX_PHOTO_BYTES) return void toast.error(`${original.name} terlalu besar.`);
        const ext = REVIEW_PHOTO_TYPES[file.type as keyof typeof REVIEW_PHOTO_TYPES];
        const path = reviewPhotoPath(userId, crypto.randomUUID(), ext);
        const { error } = await supabase.storage
          .from(REVIEW_PHOTO_BUCKET)
          .upload(path, file, { contentType: file.type, cacheControl: "31536000", upsert: false });
        if (error) return void toast.error(`Gagal mengunggah ${original.name}.`);
        paths.push(path);
      }

      const result = await submitOrderReview(order.orderId, { rating, body, photoPaths: paths });
      if (result.status === "error") return void toast.error(result.message);
      toast.success(result.message);
      onOpenChange(false);
      onSubmitted?.();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!pending) onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Beri ulasan</DialogTitle>
          <DialogDescription>
            Pesanan <span className="font-mono">{order.orderNumber}</span> · ulasanmu tampil di
            setiap produk berikut.
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-2">
          {order.items.map((item, i) => (
            <li key={`${item.name}-${i}`} className="flex items-center gap-3 text-sm">
              <ProductImage
                path={item.image}
                alt={item.name}
                sizes="40px"
                className="size-10 shrink-0"
              />
              <div className="min-w-0">
                <p className="truncate font-medium">{item.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {[item.variant, `${item.quantity}×`].filter(Boolean).join(" · ")}
                </p>
              </div>
            </li>
          ))}
        </ul>

        <StarInput value={rating} onChange={setRating} disabled={pending} />

        <div className="space-y-2">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Pilihan cepat">
            {QUICK_TEXTS.map((text) => {
              const active = hasQuickText(body, text);
              return (
                <button
                  key={text}
                  type="button"
                  aria-pressed={active}
                  disabled={pending}
                  onClick={() =>
                    setBody((b) => toggleQuickText(b, text).slice(0, MAX_REVIEW_LENGTH))
                  }
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs transition-colors",
                    active ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
                  )}
                >
                  {text}
                </button>
              );
            })}
          </div>
          <Textarea
            id={`${id}-body`}
            aria-label="Tulis ulasan (opsional)"
            placeholder="Ceritakan pengalamanmu (opsional)"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={MAX_REVIEW_LENGTH}
            rows={3}
            disabled={pending}
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">
            Foto <span className="font-normal text-muted-foreground">(opsional, maks. 5)</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {previews.map((url, i) => (
              <div key={url} className="relative">
                {/* Pratinjau blob lokal sebelum diunggah. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="size-16 rounded-lg border object-cover" />
                <button
                  type="button"
                  aria-label={`Hapus foto ${i + 1}`}
                  disabled={pending}
                  onClick={() => setPhotos((prev) => prev.filter((_, j) => j !== i))}
                  className="absolute -top-1.5 -right-1.5 rounded-full bg-foreground p-0.5 text-background"
                >
                  <XIcon className="size-3" />
                </button>
              </div>
            ))}
            {photos.length < MAX_REVIEW_PHOTOS && (
              <label
                className={cn(
                  "flex size-16 cursor-pointer items-center justify-center rounded-lg border border-dashed text-muted-foreground hover:bg-muted",
                  pending && "pointer-events-none opacity-50",
                )}
              >
                <ImagePlusIcon className="size-5" />
                <span className="sr-only">Tambah foto</span>
                <input
                  type="file"
                  accept={Object.keys(REVIEW_PHOTO_TYPES).join(",")}
                  multiple
                  className="sr-only"
                  onChange={(e) => {
                    addPhotos(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button disabled={pending || rating === 0} onClick={submit} className="w-full sm:w-auto">
            {pending && <Spinner />}
            Kirim ulasan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
