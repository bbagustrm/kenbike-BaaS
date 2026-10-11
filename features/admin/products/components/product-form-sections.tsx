"use client";

import { ClockIcon, PackageIcon } from "lucide-react";
import { Controller, useFormContext, useWatch } from "react-hook-form";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { slugify } from "@/lib/slug";

import type { ProductFormValues } from "../schemas";

/** Kartu satu bagian form produk. */
export function FormSection({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {Icon && <Icon className="size-4" aria-hidden="true" />}
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

const invalid = (error: unknown) => (error ? true : undefined);

export function ProductInfoSection({
  categories,
  autoSlug,
  onSlugEdited,
}: {
  categories: { id: string; label: string }[];
  /** Slug mengikuti nama (produk baru, sampai slug diubah manual). */
  autoSlug: boolean;
  onSlugEdited: () => void;
}) {
  const { control, register, setValue, formState } = useFormContext<ProductFormValues>();
  const slug = useWatch({ control, name: "slug" });
  const errors = formState.errors;

  return (
    <FormSection title="Informasi produk">
      <FieldGroup>
        <Field data-invalid={invalid(errors.name)}>
          <FieldLabel htmlFor="name">Nama produk</FieldLabel>
          <Input
            id="name"
            aria-invalid={invalid(errors.name)}
            {...register("name", {
              onChange: (e) => {
                if (autoSlug) {
                  setValue("slug", slugify(e.target.value, 150), { shouldValidate: true });
                }
              },
            })}
          />
          <FieldError>{errors.name?.message}</FieldError>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={invalid(errors.slug)}>
            <FieldLabel htmlFor="slug">Slug</FieldLabel>
            <Input
              id="slug"
              className="font-mono"
              aria-invalid={invalid(errors.slug)}
              {...register("slug", { onChange: onSlugEdited })}
            />
            <FieldDescription>URL: /products/{slug || "…"}</FieldDescription>
            <FieldError>{errors.slug?.message}</FieldError>
          </Field>
          <Field data-invalid={invalid(errors.categoryId)}>
            <FieldLabel htmlFor="categoryId">Kategori</FieldLabel>
            <NativeSelect
              id="categoryId"
              aria-invalid={invalid(errors.categoryId)}
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
        <Field data-invalid={invalid(errors.description)}>
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
    </FormSection>
  );
}

const PACKAGE_FIELDS = [
  { name: "weightGram", label: "Berat (gram)", step: 50 },
  { name: "lengthCm", label: "Panjang (cm)", step: 1 },
  { name: "widthCm", label: "Lebar (cm)", step: 1 },
  { name: "heightCm", label: "Tinggi (cm)", step: 1 },
] as const;

export function PackagingSection() {
  const { register, formState } = useFormContext<ProductFormValues>();
  const errors = formState.errors;

  return (
    <FormSection
      title="Pengemasan"
      icon={PackageIcon}
      description={
        <>
          Berat dan ukuran paket <strong>setelah dikemas</strong>, berlaku untuk semua varian.
          Dipakai kurir untuk menghitung ongkos kirim (berat volumetrik P × L × T).
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PACKAGE_FIELDS.map((f) => (
          <Field key={f.name} data-invalid={invalid(errors[f.name])}>
            <FieldLabel htmlFor={f.name}>{f.label}</FieldLabel>
            <Input
              id={f.name}
              type="number"
              min={1}
              step={f.step}
              aria-invalid={invalid(errors[f.name])}
              {...register(f.name, { valueAsNumber: true })}
            />
            <FieldError>{errors[f.name]?.message}</FieldError>
          </Field>
        ))}
      </div>
    </FormSection>
  );
}

/** Angka dari input number; kosong → null (untuk field opsional). */
const numberOrNull = (v: unknown) => (v === "" || v === null ? null : Number(v));

export function PreorderSection() {
  const { control, register, formState } = useFormContext<ProductFormValues>();
  const isPreorder = useWatch({ control, name: "isPreorder" });
  const errors = formState.errors;

  return (
    <FormSection
      title="Pre-order"
      icon={ClockIcon}
      description="Untuk barang yang perlu dipesan/dirakit dulu. Ditampilkan ke pembeli sebagai estimasi waktu pengiriman."
    >
      <FieldGroup>
        <Field orientation="horizontal">
          <Controller
            control={control}
            name="isPreorder"
            render={({ field }) => (
              <Switch id="isPreorder" checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
          <FieldContent>
            <FieldLabel htmlFor="isPreorder">Jadikan produk pre-order</FieldLabel>
            <FieldDescription>
              Pembeli tetap membayar di muka dan stok tetap berkurang; bedanya pengiriman lebih lama
              dari biasanya.
            </FieldDescription>
          </FieldContent>
        </Field>
        {isPreorder && (
          <Field data-invalid={invalid(errors.preorderDays)} className="max-w-xs">
            <FieldLabel htmlFor="preorderDays">Estimasi siap dikirim (hari)</FieldLabel>
            <Input
              id="preorderDays"
              type="number"
              min={1}
              max={365}
              aria-invalid={invalid(errors.preorderDays)}
              {...register("preorderDays", { setValueAs: numberOrNull })}
            />
            <FieldDescription>
              Ditampilkan ke pembeli, mis. &quot;Pre-order · dikirim ±14 hari&quot;.
            </FieldDescription>
            <FieldError>{errors.preorderDays?.message}</FieldError>
          </Field>
        )}
      </FieldGroup>
    </FormSection>
  );
}
