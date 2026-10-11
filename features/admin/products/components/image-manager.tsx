"use client";

import { ArrowLeftIcon, ArrowRightIcon, ImagePlusIcon, Trash2Icon } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { ProductImage } from "@/features/catalog";
import { createClient } from "@/lib/supabase/client";

import {
  addProductImages,
  deleteProductImage,
  reorderProductImages,
  updateProductImage,
} from "../image-actions";
import {
  ALLOWED_IMAGE_TYPES,
  PRODUCT_IMAGE_BUCKET,
  productImagePath,
  validateImageFile,
} from "../images";
import type { AdminProductImage, AdminVariantStock } from "../queries";

type ImageManagerProps = {
  productId: string;
  productName: string;
  images: AdminProductImage[];
  variants: Pick<AdminVariantStock, "variantId" | "label" | "isActive">[];
};

export function ImageManager({ productId, productName, images, variants }: ImageManagerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();

  const upload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const list = Array.from(files).slice(0, 10);
    const invalid = list.map(validateImageFile).filter(Boolean);
    if (invalid.length > 0) {
      invalid.forEach((message) => toast.error(message));
      return;
    }

    setUploading(true);
    const supabase = createClient();
    const uploaded: { path: string }[] = [];
    try {
      for (const file of list) {
        const ext = ALLOWED_IMAGE_TYPES[file.type as keyof typeof ALLOWED_IMAGE_TYPES];
        const path = productImagePath(productId, crypto.randomUUID(), ext);
        // Upload langsung dari browser; policy Storage hanya mengizinkan admin.
        const { error } = await supabase.storage
          .from(PRODUCT_IMAGE_BUCKET)
          .upload(path, file, { contentType: file.type, cacheControl: "31536000", upsert: false });
        if (error) throw new Error(`${file.name}: ${error.message}`);
        uploaded.push({ path });
      }
      const result = await addProductImages({ productId, images: uploaded });
      if (result.status === "error") toast.error(result.message);
      else toast.success(result.message);
    } catch (error) {
      if (uploaded.length > 0) {
        await supabase.storage.from(PRODUCT_IMAGE_BUCKET).remove(uploaded.map((u) => u.path));
      }
      toast.error(error instanceof Error ? error.message : "Gagal mengunggah foto.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const move = (index: number, direction: -1 | 1) => {
    const ids = images.map((img) => img.id);
    const target = index + direction;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target]!, ids[index]!];
    startTransition(async () => {
      const result = await reorderProductImages({ productId, ids });
      if (result.status === "error") toast.error(result.message);
    });
  };

  const update = (id: string, patch: { alt?: string | null; variantId?: string | null }) =>
    startTransition(async () => {
      const result = await updateProductImage({ id, ...patch });
      if (result.status === "error") toast.error(result.message);
      else toast.success(result.message);
    });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept={Object.keys(ALLOWED_IMAGE_TYPES).join(",")}
          multiple
          hidden
          onChange={(e) => upload(e.target.files)}
        />
        <Button
          type="button"
          variant="outline"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? <Spinner /> : <ImagePlusIcon />}
          {uploading ? "Mengunggah…" : "Unggah foto"}
        </Button>
        <p className="text-xs text-muted-foreground">
          JPG, PNG, atau WebP, maks. 5 MB, hingga 10 file sekaligus. Foto pertama menjadi foto
          utama.
        </p>
        {pending && <Spinner className="ml-auto" />}
      </div>

      {images.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Belum ada foto. Produk ditampilkan dengan gambar placeholder.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((img, index) => (
            <li key={img.id} className="space-y-2 rounded-lg border p-3">
              <div className="relative">
                <ProductImage path={img.path} alt={img.alt ?? productName} sizes="300px" />
                {index === 0 && <Badge className="absolute top-2 left-2">Utama</Badge>}
              </div>
              <Input
                aria-label="Teks alternatif"
                placeholder="Teks alternatif (deskripsi foto)"
                defaultValue={img.alt ?? ""}
                onBlur={(e) => {
                  const value = e.target.value.trim();
                  if (value !== (img.alt ?? "")) update(img.id, { alt: value || null });
                }}
              />
              {variants.length > 1 && (
                <NativeSelect
                  aria-label="Foto untuk varian"
                  defaultValue={img.variantId ?? ""}
                  onChange={(e) => update(img.id, { variantId: e.target.value || null })}
                >
                  <NativeSelectOption value="">Semua varian</NativeSelectOption>
                  {variants.map((v) => (
                    <NativeSelectOption key={v.variantId} value={v.variantId}>
                      {v.label}
                      {v.isActive ? "" : " (nonaktif)"}
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
                  disabled={index === 0 || pending}
                  onClick={() => move(index, -1)}
                >
                  <ArrowLeftIcon />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Geser ke kanan"
                  disabled={index === images.length - 1 || pending}
                  onClick={() => move(index, 1)}
                >
                  <ArrowRightIcon />
                </Button>
                <div className="ml-auto">
                  <ConfirmDialog
                    trigger={<Button variant="ghost" size="icon" aria-label="Hapus foto" />}
                    triggerLabel={<Trash2Icon />}
                    title="Hapus foto ini?"
                    description="File akan dihapus dari penyimpanan dan tidak bisa dikembalikan."
                    confirmLabel="Hapus"
                    destructive
                    onConfirm={() => deleteProductImage(img.id)}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
