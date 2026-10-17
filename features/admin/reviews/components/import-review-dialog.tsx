"use client";

import { ImagePlusIcon, PlusIcon, XIcon } from "lucide-react";
import { useEffect, useId, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { StarInput } from "@/features/reviews/components/star-input";
import { compressImage } from "@/features/reviews/compress";
import {
  MAX_REVIEW_LENGTH,
  MAX_REVIEW_PHOTOS,
  REVIEW_PHOTO_TYPES,
  reviewPhotoPath,
} from "@/features/reviews/schemas";
import { REVIEW_PHOTO_BUCKET } from "@/features/reviews/types";
import { createClient } from "@/lib/supabase/client";

import { importReview } from "../actions";

/** Tanggal hari ini (WIB) YYYY-MM-DD — batas atas input tanggal. */
function todayWib(): string {
  return new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10);
}

/** Tambah ulasan manual, mis. memindahkan ulasan dari Shopee (nama, bintang, teks, foto, tanggal). */
export function ImportReviewDialog({
  products,
  adminId,
}: {
  products: { id: string; name: string }[];
  adminId: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [photos, setPhotos] = useState<File[]>([]);
  const [pending, startTransition] = useTransition();
  const previews = useMemo(() => photos.map((f) => URL.createObjectURL(f)), [photos]);
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  function reset() {
    setRating(0);
    setPhotos([]);
  }

  function submit(form: HTMLFormElement) {
    const data = new FormData(form);
    if (rating === 0) return void toast.error("Pilih bintang dulu.");
    startTransition(async () => {
      const supabase = createClient();
      const paths: string[] = [];
      for (const original of photos) {
        const file = await compressImage(original);
        const ext = REVIEW_PHOTO_TYPES[file.type as keyof typeof REVIEW_PHOTO_TYPES];
        const path = reviewPhotoPath(adminId, crypto.randomUUID(), ext);
        const { error } = await supabase.storage
          .from(REVIEW_PHOTO_BUCKET)
          .upload(path, file, { contentType: file.type, cacheControl: "31536000", upsert: false });
        if (error) return void toast.error(`Gagal mengunggah ${original.name}.`);
        paths.push(path);
      }

      const result = await importReview({
        productId: String(data.get("productId") ?? ""),
        reviewerName: String(data.get("reviewerName") ?? ""),
        rating,
        body: String(data.get("body") ?? ""),
        date: String(data.get("date") ?? "") || undefined,
        variantLabel: String(data.get("variantLabel") ?? ""),
        photoPaths: paths,
      });
      if (result.status === "error") return void toast.error(result.message);
      toast.success(result.message);
      reset();
      // Formulir tetap terbuka (produk & tanggal dipertahankan) agar impor beruntun cepat.
      form.querySelector<HTMLInputElement>("[name=reviewerName]")!.value = "";
      form.querySelector<HTMLTextAreaElement>("[name=body]")!.value = "";
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger render={<Button />}>
        <PlusIcon />
        Tambah ulasan
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            submit(event.currentTarget);
          }}
        >
          <DialogHeader>
            <DialogTitle>Tambah ulasan manual</DialogTitle>
            <DialogDescription>
              Untuk memindahkan ulasan dari marketplace (mis. Shopee). Tampil sama seperti ulasan
              pembeli dan ikut dihitung di rating produk.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup className="gap-3">
            <Field>
              <FieldLabel htmlFor={`${id}-product`}>Produk</FieldLabel>
              <NativeSelect id={`${id}-product`} name="productId" required defaultValue="">
                <NativeSelectOption value="" disabled>
                  Pilih produk…
                </NativeSelectOption>
                {products.map((p) => (
                  <NativeSelectOption key={p.id} value={p.id}>
                    {p.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor={`${id}-name`}>Nama pengulas</FieldLabel>
                <Input id={`${id}-name`} name="reviewerName" required maxLength={100} />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${id}-date`}>Tanggal ulasan</FieldLabel>
                <Input id={`${id}-date`} name="date" type="date" max={todayWib()} />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor={`${id}-variant`}>Varian (opsional)</FieldLabel>
              <Input
                id={`${id}-variant`}
                name="variantLabel"
                maxLength={300}
                placeholder="mis. Ukuran 50 · Hitam"
              />
            </Field>
            <div className="space-y-1">
              <p className="text-sm font-medium">Bintang</p>
              <StarInput value={rating} onChange={setRating} disabled={pending} />
            </div>
            <Field>
              <FieldLabel htmlFor={`${id}-body`}>Teks ulasan (opsional)</FieldLabel>
              <Textarea id={`${id}-body`} name="body" rows={3} maxLength={MAX_REVIEW_LENGTH} />
            </Field>
            <div className="space-y-2">
              <p className="text-sm font-medium">Foto (opsional, maks. {MAX_REVIEW_PHOTOS})</p>
              <div className="flex flex-wrap gap-2">
                {previews.map((url, i) => (
                  <div key={url} className="relative">
                    {/* Pratinjau blob lokal sebelum diunggah. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="size-16 rounded-lg border object-cover" />
                    <button
                      type="button"
                      aria-label={`Hapus foto ${i + 1}`}
                      onClick={() => setPhotos((prev) => prev.filter((_, j) => j !== i))}
                      className="absolute -top-1.5 -right-1.5 rounded-full bg-foreground p-0.5 text-background"
                    >
                      <XIcon className="size-3" />
                    </button>
                  </div>
                ))}
                {photos.length < MAX_REVIEW_PHOTOS && (
                  <label className="flex size-16 cursor-pointer items-center justify-center rounded-lg border border-dashed text-muted-foreground hover:bg-muted">
                    <ImagePlusIcon className="size-5" />
                    <span className="sr-only">Tambah foto</span>
                    <input
                      type="file"
                      accept={Object.keys(REVIEW_PHOTO_TYPES).join(",")}
                      multiple
                      className="sr-only"
                      onChange={(e) => {
                        const picked = Array.from(e.target.files ?? []);
                        e.target.value = "";
                        if (picked.some((f) => !(f.type in REVIEW_PHOTO_TYPES))) {
                          return void toast.error("Foto harus JPG, PNG, atau WEBP.");
                        }
                        setPhotos((prev) => [...prev, ...picked].slice(0, MAX_REVIEW_PHOTOS));
                      }}
                    />
                  </label>
                )}
              </div>
              <FieldDescription>Foto dikompres otomatis sebelum diunggah.</FieldDescription>
            </div>
          </FieldGroup>
          <DialogFooter>
            <Button type="submit" disabled={pending || rating === 0}>
              {pending && <Spinner />}
              Simpan ulasan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
