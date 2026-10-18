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
import { ProductImage } from "@/components/shared/product-image";

import { deleteProductImage, reorderProductImages, updateProductImage } from "../image-actions";
import { ALLOWED_IMAGE_TYPES, MAX_PRODUCT_IMAGES } from "../images";
import type { AdminProductImage, AdminVariantStock } from "../queries";
import { uploadProductImages } from "../upload";

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
  const remaining = Math.max(0, MAX_PRODUCT_IMAGES - images.length);

  const upload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (files.length > remaining) {
      toast.error(`Maksimal ${MAX_PRODUCT_IMAGES} foto per produk — sisa ${remaining} lagi.`);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setUploading(true);
    const result = await uploadProductImages(productId, Array.from(files));
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
    if (result.status === "error") toast.error(result.message);
    else toast.success(result.message);
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
          disabled={uploading || remaining === 0}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? <Spinner /> : <ImagePlusIcon />}
          {uploading ? "Mengunggah…" : "Unggah foto"}
        </Button>
        <p className="text-xs text-muted-foreground">
          JPG, PNG, atau WebP, maks. 5 MB. {images.length}/{MAX_PRODUCT_IMAGES} foto. Foto pertama
          menjadi foto utama.
        </p>
        {pending && <Spinner className="ml-auto" />}
      </div>

      {images.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Belum ada foto. Produk ditampilkan dengan gambar placeholder.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
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
