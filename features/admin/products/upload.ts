"use client";

import type { ActionState } from "@/lib/action-state";
import { PRODUCT_IMAGE_BUCKET } from "@/lib/product-images";
import { createClient } from "@/lib/supabase/client";

import { addProductImages } from "./image-actions";
import { ALLOWED_IMAGE_TYPES, productImagePath, validateImageFile } from "./images";

export const MAX_FILES_PER_UPLOAD = 10;

export type UploadItem = File | { file: File; alt?: string; variantId?: string | null };

/**
 * Unggah foto langsung dari browser ke Storage (policy hanya admin), lalu
 * catat lewat Server Action. Jika ada yang gagal, file yang sudah terunggah
 * dihapus agar tidak tertinggal tanpa baris di DB.
 */
export async function uploadProductImages(
  productId: string,
  items: UploadItem[],
): Promise<ActionState> {
  const list = items
    .slice(0, MAX_FILES_PER_UPLOAD)
    .map((item) => (item instanceof File ? { file: item } : item));
  const invalid = list.map((item) => validateImageFile(item.file)).filter(Boolean);
  if (invalid.length > 0) return { status: "error", message: invalid.join(" ") };

  const supabase = createClient();
  const uploaded: string[] = [];
  try {
    for (const { file } of list) {
      const ext = ALLOWED_IMAGE_TYPES[file.type as keyof typeof ALLOWED_IMAGE_TYPES];
      const path = productImagePath(productId, crypto.randomUUID(), ext);
      const { error } = await supabase.storage
        .from(PRODUCT_IMAGE_BUCKET)
        .upload(path, file, { contentType: file.type, cacheControl: "31536000", upsert: false });
      if (error) throw new Error(`${file.name}: ${error.message}`);
      uploaded.push(path);
    }
    return await addProductImages({
      productId,
      images: uploaded.map((path, i) => ({
        path,
        alt: list[i]?.alt?.trim() || undefined,
        variantId: list[i]?.variantId ?? null,
      })),
    });
  } catch (error) {
    if (uploaded.length > 0) await supabase.storage.from(PRODUCT_IMAGE_BUCKET).remove(uploaded);
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Gagal mengunggah foto.",
    };
  }
}
