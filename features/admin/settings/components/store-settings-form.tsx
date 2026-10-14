"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { AreaPicker } from "@/features/address";

import { saveStoreSettings } from "../actions";
import { type StoreSettingsInput, type StoreSettingsValues, storeSettingsSchema } from "../schemas";

const EMPTY: StoreSettingsInput = {
  storeName: "KenBike",
  contactName: "",
  phone: "",
  email: "",
  addressLine: "",
  area: null,
  note: "",
};

const invalid = (error: unknown) => (error ? true : undefined);

export function StoreSettingsForm({ initial }: { initial: StoreSettingsInput | null }) {
  const [pending, startTransition] = useTransition();
  const form = useForm<StoreSettingsInput, unknown, StoreSettingsValues>({
    resolver: zodResolver(storeSettingsSchema),
    defaultValues: initial ?? EMPTY,
    mode: "onTouched",
  });
  const { control, register, handleSubmit, formState, reset, getValues } = form;
  const errors = formState.errors;

  const onSubmit = handleSubmit((values) =>
    startTransition(async () => {
      const result = await saveStoreSettings(values);
      if (result.status === "error") {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      reset(getValues());
    }),
  );

  return (
    <form onSubmit={onSubmit} noValidate>
      <Card>
        <CardHeader>
          <CardTitle>Alamat toko (asal pengiriman)</CardTitle>
          <CardDescription>
            Dipakai sebagai titik asal saat menghitung ongkir dan saat membuat pengiriman ke kurir.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={invalid(errors.storeName)}>
                <FieldLabel htmlFor="storeName">Nama toko</FieldLabel>
                <Input
                  id="storeName"
                  aria-invalid={invalid(errors.storeName)}
                  {...register("storeName")}
                />
                <FieldError>{errors.storeName?.message}</FieldError>
              </Field>
              <Field data-invalid={invalid(errors.contactName)}>
                <FieldLabel htmlFor="contactName">Nama kontak</FieldLabel>
                <Input
                  id="contactName"
                  aria-invalid={invalid(errors.contactName)}
                  {...register("contactName")}
                />
                <FieldDescription>Dihubungi kurir saat penjemputan.</FieldDescription>
                <FieldError>{errors.contactName?.message}</FieldError>
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={invalid(errors.phone)}>
                <FieldLabel htmlFor="phone">Nomor HP</FieldLabel>
                <Input
                  id="phone"
                  type="tel"
                  inputMode="tel"
                  aria-invalid={invalid(errors.phone)}
                  {...register("phone")}
                />
                <FieldError>{errors.phone?.message}</FieldError>
              </Field>
              <Field data-invalid={invalid(errors.email)}>
                <FieldLabel htmlFor="email">Email kontak</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  aria-invalid={invalid(errors.email)}
                  {...register("email")}
                />
                <FieldDescription>Tampil di halaman Kontak & kebijakan.</FieldDescription>
                <FieldError>{errors.email?.message}</FieldError>
              </Field>
            </div>
            <Field data-invalid={invalid(errors.area)}>
              <FieldLabel htmlFor="area">Kecamatan / kota</FieldLabel>
              <Controller
                control={control}
                name="area"
                render={({ field }) => (
                  <AreaPicker
                    id="area"
                    value={field.value ?? null}
                    onChange={(area) => {
                      field.onChange(area);
                      field.onBlur();
                    }}
                    invalid={Boolean(errors.area)}
                  />
                )}
              />
              <FieldError>{errors.area?.message}</FieldError>
            </Field>
            <Field data-invalid={invalid(errors.addressLine)}>
              <FieldLabel htmlFor="addressLine">Alamat lengkap</FieldLabel>
              <Textarea
                id="addressLine"
                rows={3}
                aria-invalid={invalid(errors.addressLine)}
                {...register("addressLine")}
              />
              <FieldError>{errors.addressLine?.message}</FieldError>
            </Field>
            <Field data-invalid={invalid(errors.note)}>
              <FieldLabel htmlFor="note">Catatan untuk kurir (opsional)</FieldLabel>
              <Input id="note" aria-invalid={invalid(errors.note)} {...register("note")} />
              <FieldError>{errors.note?.message}</FieldError>
            </Field>
            <div className="flex justify-end">
              <Button type="submit" disabled={pending || !formState.isDirty}>
                {pending && <Spinner />}
                Simpan
              </Button>
            </div>
          </FieldGroup>
        </CardContent>
      </Card>
    </form>
  );
}
