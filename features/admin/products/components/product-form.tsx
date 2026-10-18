"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { type Control, FormProvider, type UseFormReturn, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { FormAlert } from "@/components/shared/form-alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { ActionState } from "@/lib/action-state";

import { saveProduct } from "../actions";
import { type OptionFormValues, type ProductFormValues, productFormSchema } from "../schemas";
import { uploadProductImages } from "../upload";
import {
  buildVariantRows,
  comboKey,
  comboLabel,
  skuBaseFromSlug,
  suggestSku,
} from "../variant-matrix";
import { OptionsEditor } from "./options-editor";
import { type PendingImage, PendingImages } from "./pending-images";
import {
  FormSection,
  PackagingSection,
  PreorderSection,
  ProductInfoSection,
} from "./product-form-sections";
import { VariantMatrix } from "./variant-matrix";

const NEW_VARIANT_DEFAULTS = { price: 0, stock: 0 };

const EMPTY: ProductFormValues = {
  name: "",
  slug: "",
  categoryId: "",
  descriptionDoc: null,
  isActive: true,
  isPreorder: false,
  preorderDays: null,
  // Pengemasan sengaja kosong: admin wajib mengisi ukuran paket sebenarnya.
  weightGram: undefined as unknown as number,
  lengthCm: undefined as unknown as number,
  widthCm: undefined as unknown as number,
  heightCm: undefined as unknown as number,
  options: [],
  variants: [],
};

/** Opsi yang sudah lengkap (punya nama & nilai) — yang lain diabaikan di matriks. */
const completeOptions = (options: OptionFormValues[] | undefined) =>
  (options ?? []).filter((o) => o.name.trim() && o.values.length > 0);

type ProductFormProps = {
  productId: string | null;
  initial?: ProductFormValues;
  categories: { id: string; label: string }[];
};

export function ProductForm({ productId, initial, categories }: ProductFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<ActionState | null>(null);
  // Foto untuk produk baru disimpan dulu di browser, diunggah setelah produk dibuat.
  const [newImages, setNewImages] = useState<PendingImage[]>([]);
  // Slug otomatis dari nama hanya untuk produk baru, sampai slug diubah manual.
  const [slugEdited, setSlugEdited] = useState(Boolean(productId));

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: initial ?? EMPTY,
    mode: "onTouched",
  });
  useVariantRowsSync(form);
  const variantChoices = useVariantChoices(form.control);

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const result = await saveProduct(productId, values);
      if (result.status === "error" && !result.productId) {
        setFormError(result);
        toast.error(result.message ?? "Gagal menyimpan produk.");
        return;
      }
      if (result.status === "error") toast.error(result.message);
      else toast.success(result.message);

      if (!result.productId) return;
      if (productId) {
        form.reset(values);
        // Sebagian stok gagal diubah → tetap di form agar admin bisa melihat & mengulang.
        if (result.status === "success") router.push("/admin/products");
        return;
      }
      if (newImages.length > 0) {
        // Foto ditautkan ke varian lewat SKU (id varian baru ada setelah dibuat).
        const valid = completeOptions(values.options);
        const skuByKey = new Map(
          values.variants.map((v) => [comboKey(valid, v.options), v.sku.toLowerCase()]),
        );
        const upload = await uploadProductImages(
          result.productId,
          newImages.map((img) => ({
            file: img.file,
            alt: img.alt,
            variantId: img.variantKey
              ? (result.variantIds?.[skuByKey.get(img.variantKey) ?? ""] ?? null)
              : null,
          })),
        );
        if (upload.status === "error") {
          toast.error(`Produk dibuat, tetapi foto gagal diunggah: ${upload.message}`);
        }
      }
      // Halaman tetap hidup di cache router (Activity) — kosongkan agar
      // "Tambah produk" berikutnya mulai dari form baru.
      form.reset(EMPTY);
      setNewImages([]);
      setSlugEdited(false);
      router.push("/admin/products");
    });
  });

  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit} noValidate className="space-y-6">
        {formError && <FormAlert state={formError} />}

        <ProductInfoSection
          categories={categories}
          autoSlug={!slugEdited}
          onSlugEdited={() => setSlugEdited(true)}
        />

        {!productId && (
          <FormSection
            title="Foto"
            description="Atur foto produk dan foto khusus varian (mis. per warna)."
          >
            <PendingImages images={newImages} onChange={setNewImages} variants={variantChoices} />
          </FormSection>
        )}

        <PackagingSection />

        <FormSection title="Opsi varian" description="Maksimal 3 opsi, mis. Warna dan Ukuran.">
          <OptionsEditor />
        </FormSection>

        <FormSection title="Varian" description="Dibuat otomatis dari kombinasi opsi.">
          <VariantMatrix />
        </FormSection>

        <PreorderSection />

        <div className="sticky bottom-0 -mx-4 flex justify-end gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
          <Button type="button" variant="outline" onClick={() => router.push("/admin/products")}>
            Batal
          </Button>
          <Button type="submit" disabled={pending}>
            {pending && <Spinner />}
            {productId ? "Simpan perubahan" : "Buat produk"}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}

/** Susun ulang matriks varian setiap kali opsi berubah (baris lama dipertahankan). */
function useVariantRowsSync({ control, getValues, setValue }: UseFormReturn<ProductFormValues>) {
  const options = useWatch({ control, name: "options" });
  const slug = useWatch({ control, name: "slug" });
  // SKU yang dibuat otomatis (belum diketik admin) ikut diperbarui saat slug/opsi
  // berubah — mis. baris pertama dibuat ketika slug masih kosong ("KB").
  const autoSkus = useRef(new Set<string>());

  useEffect(() => {
    const current = getValues("variants");
    const base = skuBaseFromSlug(slug ?? "");
    const valid = completeOptions(options);
    const typed = new Set(current.map((r) => r.sku));
    const next = buildVariantRows(options ?? [], current, base, NEW_VARIANT_DEFAULTS).map((row) => {
      // Baris baru (SKU saran dari buildVariantRows) atau SKU otomatis sebelumnya.
      const auto = !typed.has(row.sku) || autoSkus.current.has(row.sku);
      if (row.id || !auto) return row;
      const sku = suggestSku(base, valid, row.options);
      autoSkus.current.add(sku);
      return { ...row, sku };
    });
    const keys = (rows: typeof current) => rows.map((r) => comboKey(valid, r.options)).join(",");
    const same =
      next.length === current.length &&
      keys(next) === keys(current) &&
      next.every(
        (row, i) =>
          row.sku === current[i]?.sku &&
          JSON.stringify(row.options) === JSON.stringify(current[i]?.options),
      );
    if (!same) setValue("variants", next, { shouldDirty: true });
  }, [options, slug, getValues, setValue]);
}

/** Pilihan "foto untuk varian" pada produk baru: dikunci per kombinasi opsi. */
function useVariantChoices(control: Control<ProductFormValues>) {
  const options = useWatch({ control, name: "options" });
  const variants = useWatch({ control, name: "variants" });
  return useMemo(() => {
    const valid = completeOptions(options);
    return (variants ?? []).map((row) => ({
      key: comboKey(valid, row.options),
      label: comboLabel(valid, row.options),
    }));
  }, [options, variants]);
}
