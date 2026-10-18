"use client";

import { ArrowLeftIcon, ArrowRightIcon, ImagePlusIcon, XIcon } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

import { ALLOWED_IMAGE_TYPES, validateImageFile } from "../images";
import { MAX_FILES_PER_UPLOAD } from "../upload";

/** Foto yang belum diunggah. `variantKey` = comboKey varian (id varian belum ada). */
export type PendingImage = { file: File; alt: string; variantKey: string | null };

/**
 * Pilih foto sebelum produk dibuat. File disimpan di memori browser dan
 * diunggah setelah produk tersimpan (butuh id produk untuk path Storage).
 * Tampilan disamakan dengan ImageManager di halaman edit.
 */
export function PendingImages({
  images,
  onChange,
  variants,
}: {
  images: PendingImage[];
  onChange: (images: PendingImage[]) => void;
  variants: { key: string; label: string }[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previews = useMemo(() => images.map((img) => URL.createObjectURL(img.file)), [images]);
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  const add = (list: FileList | null) => {
    if (!list) return;
    const accepted: PendingImage[] = [];
    for (const file of Array.from(list)) {
      const error = validateImageFile(file);
      if (error) toast.error(error);
      else accepted.push({ file, alt: "", variantKey: null });
    }
    const next = [...images, ...accepted];
    if (next.length > MAX_FILES_PER_UPLOAD) {
      toast.error(`Maksimal ${MAX_FILES_PER_UPLOAD} foto saat membuat produk.`);
    }
    onChange(next.slice(0, MAX_FILES_PER_UPLOAD));
    if (inputRef.current) inputRef.current.value = "";
  };

  const move = (index: number, direction: -1 | 1) => {
    const next = [...images];
    const target = index + direction;
    [next[index], next[target]] = [next[target]!, next[index]!];
    onChange(next);
  };

  const patch = (index: number, value: Partial<PendingImage>) =>
    onChange(images.map((img, i) => (i === index ? { ...img, ...value } : img)));

  const variantKeys = new Set(variants.map((v) => v.key));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept={Object.keys(ALLOWED_IMAGE_TYPES).join(",")}
          multiple
          hidden
          onChange={(e) => add(e.target.files)}
        />
        <Button
          type="button"
          variant="outline"
          disabled={images.length >= MAX_FILES_PER_UPLOAD}
          onClick={() => inputRef.current?.click()}
        >
          <ImagePlusIcon />
          Pilih foto
        </Button>
        <p className="text-xs text-muted-foreground">
          JPG, PNG, atau WebP, maks. 5 MB, hingga {MAX_FILES_PER_UPLOAD} foto per produk. Foto
          pertama menjadi foto utama. Foto diunggah saat produk dibuat.
        </p>
      </div>

      {images.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Belum ada foto. Produk ditampilkan dengan gambar placeholder.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {images.map((img, index) => (
            <li
              key={`${img.file.name}-${img.file.lastModified}-${index}`}
              className="space-y-2 rounded-lg border p-3"
            >
              <div className="relative aspect-square overflow-hidden rounded-md bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element -- pratinjau blob lokal */}
                <img src={previews[index]} alt="" className="size-full object-cover" />
                {index === 0 && <Badge className="absolute top-2 left-2">Utama</Badge>}
              </div>
              <Input
                aria-label="Teks alternatif"
                placeholder="Teks alternatif (deskripsi foto)"
                maxLength={200}
                value={img.alt}
                onChange={(e) => patch(index, { alt: e.target.value })}
              />
              {variants.length > 1 && (
                <NativeSelect
                  aria-label="Foto untuk varian"
                  value={img.variantKey && variantKeys.has(img.variantKey) ? img.variantKey : ""}
                  onChange={(e) => patch(index, { variantKey: e.target.value || null })}
                >
                  <NativeSelectOption value="">Semua varian</NativeSelectOption>
                  {variants.map((v) => (
                    <NativeSelectOption key={v.key} value={v.key}>
                      {v.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              )}
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Geser ke kiri"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  <ArrowLeftIcon />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Geser ke kanan"
                  disabled={index === images.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <ArrowRightIcon />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="ml-auto"
                  aria-label={`Batalkan ${img.file.name}`}
                  onClick={() => onChange(images.filter((_, i) => i !== index))}
                >
                  <XIcon />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
