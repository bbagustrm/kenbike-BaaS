"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Controller, FormProvider, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { FormAlert } from "@/components/shared/form-alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { ActionState } from "@/lib/action-state";
import { slugify } from "@/lib/slug";

import { saveProduct } from "../actions";
import { type ProductFormValues, productFormSchema } from "../schemas";
import { buildVariantRows, comboKey, skuBaseFromSlug } from "../variant-matrix";
import { OptionsEditor } from "./options-editor";
import { VariantMatrix } from "./variant-matrix";

const NEW_VARIANT_DEFAULTS = {
  price: 0,
  weightGram: 1000,
  lengthCm: 30,
  widthCm: 20,
  heightCm: 10,
};

const EMPTY: ProductFormValues = {
  name: "",
  slug: "",
  categoryId: "",
  description: "",
  isActive: true,
  options: [],
  variants: [],
};

type ProductFormProps = {
  productId: string | null;
  initial?: ProductFormValues;
  categories: { id: string; label: string }[];
};

export function ProductForm({ productId, initial, categories }: ProductFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<ActionState | null>(null);
  // Slug otomatis dari nama hanya untuk produk baru, sampai slug diubah manual.
  const [slugTouched, setSlugTouched] = useState(Boolean(productId));

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: initial ?? EMPTY,
    mode: "onTouched",
  });
  const { control, register, handleSubmit, setValue, getValues, formState } = form;

  // Susun ulang matriks varian setiap kali opsi berubah (baris lama dipertahankan).
  const options = useWatch({ control, name: "options" });
  const slug = useWatch({ control, name: "slug" });
  useEffect(() => {
    const current = getValues("variants");
    const next = buildVariantRows(
      options ?? [],
      current,
      skuBaseFromSlug(getValues("slug")),
      NEW_VARIANT_DEFAULTS,
    );
    const valid = (options ?? []).filter((o) => o.name.trim() && o.values.length > 0);
    const keys = (rows: typeof current) => rows.map((r) => comboKey(valid, r.options)).join(",");
    const sameShape =
      next.length === current.length &&
      keys(next) === keys(current) &&
      next.every((row, i) => JSON.stringify(row.options) === JSON.stringify(current[i]?.options));
    if (!sameShape) setValue("variants", next, { shouldDirty: true });
  }, [options, getValues, setValue]);

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const result = await saveProduct(productId, values);
      if (result.status === "error") {
        setFormError(result);
        toast.error(result.message ?? "Gagal menyimpan produk.");
        return;
      }
      toast.success(result.message);
      if (!productId && result.productId) {
        router.push(`/admin/products/${result.productId}`);
      } else {
        form.reset(values);
      }
    });
  });

  const errors = formState.errors;

  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit} noValidate className="space-y-6">
        {formError && <FormAlert state={formError} />}

        <Card>
          <CardHeader>
            <CardTitle>Informasi produk</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field data-invalid={errors.name ? true : undefined}>
                <FieldLabel htmlFor="name">Nama produk</FieldLabel>
                <Input
                  id="name"
                  aria-invalid={errors.name ? true : undefined}
                  {...register("name", {
                    onChange: (e) => {
                      if (!slugTouched) {
                        setValue("slug", slugify(e.target.value, 150), { shouldValidate: true });
                      }
                    },
                  })}
                />
                <FieldError>{errors.name?.message}</FieldError>
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field data-invalid={errors.slug ? true : undefined}>
                  <FieldLabel htmlFor="slug">Slug</FieldLabel>
                  <Input
                    id="slug"
                    className="font-mono"
                    aria-invalid={errors.slug ? true : undefined}
                    {...register("slug", { onChange: () => setSlugTouched(true) })}
                  />
                  <FieldDescription>URL: /products/{slug || "…"}</FieldDescription>
                  <FieldError>{errors.slug?.message}</FieldError>
                </Field>
                <Field data-invalid={errors.categoryId ? true : undefined}>
                  <FieldLabel htmlFor="categoryId">Kategori</FieldLabel>
                  <NativeSelect
                    id="categoryId"
                    aria-invalid={errors.categoryId ? true : undefined}
                    {...register("categoryId")}
                  >
                    <NativeSelectOption value="">Pilih kategori…</NativeSelectOption>
                    {categories.map((c) => (
                      <NativeSelectOption key={c.id} value={c.id}>
                        {c.label}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                  <FieldError>{errors.categoryId?.message}</FieldError>
                </Field>
              </div>
              <Field data-invalid={errors.description ? true : undefined}>
                <FieldLabel htmlFor="description">Deskripsi</FieldLabel>
                <Textarea id="description" rows={5} {...register("description")} />
                <FieldError>{errors.description?.message}</FieldError>
              </Field>
              <Field orientation="horizontal">
                <Controller
                  control={control}
                  name="isActive"
                  render={({ field }) => (
                    <Switch id="isActive" checked={field.value} onCheckedChange={field.onChange} />
                  )}
                />
                <FieldLabel htmlFor="isActive">Tampilkan di toko</FieldLabel>
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Opsi varian</CardTitle>
            <CardDescription>Maksimal 3 opsi, mis. Warna dan Ukuran.</CardDescription>
          </CardHeader>
          <CardContent>
            <OptionsEditor />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Varian</CardTitle>
            <CardDescription>
              Dibuat otomatis dari kombinasi opsi. Berat dan dimensi dipakai untuk ongkos kirim.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <VariantMatrix />
          </CardContent>
        </Card>

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
