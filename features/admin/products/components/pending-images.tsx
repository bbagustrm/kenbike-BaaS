"use client";

import { ArrowLeftIcon, ArrowRightIcon, ImagePlusIcon, XIcon } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { ALLOWED_IMAGE_TYPES, validateImageFile } from "../images";
import { MAX_FILES_PER_UPLOAD } from "../upload";

/**
 * Pilih foto sebelum produk dibuat. File disimpan di memori browser dan
 * diunggah setelah produk tersimpan (butuh id produk untuk path Storage).
 */
export function PendingImages({
  files,
  onChange,
}: {
  files: File[];
  onChange: (files: File[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previews = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files]);
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  const add = (list: FileList | null) => {
    if (!list) return;
    const accepted: File[] = [];
    for (const file of Array.from(list)) {
      const error = validateImageFile(file);
      if (error) toast.error(error);
      else accepted.push(file);
    }
    const next = [...files, ...accepted];
    if (next.length > MAX_FILES_PER_UPLOAD) {
      toast.error(`Maksimal ${MAX_FILES_PER_UPLOAD} foto saat membuat produk.`);
    }
    onChange(next.slice(0, MAX_FILES_PER_UPLOAD));
    if (inputRef.current) inputRef.current.value = "";
  };

  const move = (index: number, direction: -1 | 1) => {
    const next = [...files];
    const target = index + direction;
    [next[index], next[target]] = [next[target]!, next[index]!];
    onChange(next);
  };

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
          disabled={files.length >= MAX_FILES_PER_UPLOAD}
          onClick={() => inputRef.current?.click()}
        >
          <ImagePlusIcon />
          Pilih foto
        </Button>
        <p className="text-xs text-muted-foreground">
          JPG, PNG, atau WebP, maks. 5 MB, hingga {MAX_FILES_PER_UPLOAD} foto. Foto pertama menjadi
          foto utama. Foto diunggah saat produk dibuat.
        </p>
      </div>

      {files.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${file.lastModified}-${index}`}
              className="space-y-2 rounded-lg border p-2"
            >
              <div className="relative aspect-square overflow-hidden rounded-md bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element -- pratinjau blob lokal */}
                <img src={previews[index]} alt="" className="size-full object-cover" />
                {index === 0 && <Badge className="absolute top-2 left-2">Utama</Badge>}
              </div>
              <p className="truncate text-xs text-muted-foreground" title={file.name}>
                {file.name}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Geser ke kiri"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  <ArrowLeftIcon />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Geser ke kanan"
                  disabled={index === files.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <ArrowRightIcon />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="ml-auto"
                  aria-label={`Batalkan ${file.name}`}
                  onClick={() => onChange(files.filter((_, i) => i !== index))}
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
