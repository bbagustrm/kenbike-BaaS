"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
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
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

import { saveAddress } from "../actions";
import { type AddressFormInput, type AddressFormValues, addressFormSchema } from "../schemas";
import type { Address } from "../types";
import { AreaPicker } from "./area-picker";

type AddressFormDialogProps = {
  address?: Address;
  trigger: React.ReactElement;
  triggerLabel: React.ReactNode;
  /** Dipanggil setelah tersimpan (mis. lanjut ke checkout). */
  onSaved?: () => void;
};

export function AddressFormDialog({
  address,
  trigger,
  triggerLabel,
  onSaved,
}: AddressFormDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger}>{triggerLabel}</DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{address ? "Ubah alamat" : "Tambah alamat"}</DialogTitle>
          <DialogDescription>
            Alamat dipakai untuk menghitung ongkir dan pengiriman.
          </DialogDescription>
        </DialogHeader>
        {/* Dirender ulang setiap dialog dibuka agar state form kembali bersih. */}
        {open && (
          <AddressForm
            address={address}
            onSaved={() => {
              setOpen(false);
              onSaved?.();
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

const invalid = (error: unknown) => (error ? true : undefined);

function AddressForm({ address, onSaved }: { address?: Address; onSaved: () => void }) {
  const [pending, startTransition] = useTransition();
  const form = useForm<AddressFormInput, unknown, AddressFormValues>({
    resolver: zodResolver(addressFormSchema),
    defaultValues: {
      label: address?.label ?? "",
      recipientName: address?.recipientName ?? "",
      phone: address?.phone ?? "",
      addressLine: address?.addressLine ?? "",
      area: address?.area ?? null,
      note: address?.note ?? "",
      isDefault: address?.isDefault ?? false,
    },
    mode: "onTouched",
  });
  const { control, register, handleSubmit, formState } = form;
  const errors = formState.errors;

  const onSubmit = handleSubmit((values) =>
    startTransition(async () => {
      const result = await saveAddress(address?.id ?? null, values);
      if (result.status === "error") {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      onSaved();
    }),
  );

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={invalid(errors.recipientName)}>
            <FieldLabel htmlFor="recipientName">Nama penerima</FieldLabel>
            <Input
              id="recipientName"
              autoComplete="name"
              aria-invalid={invalid(errors.recipientName)}
              {...register("recipientName")}
            />
            <FieldError>{errors.recipientName?.message}</FieldError>
          </Field>
          <Field data-invalid={invalid(errors.phone)}>
            <FieldLabel htmlFor="phone">Nomor HP</FieldLabel>
            <Input
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="081234567890"
              aria-invalid={invalid(errors.phone)}
              {...register("phone")}
            />
            <FieldError>{errors.phone?.message}</FieldError>
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
            autoComplete="street-address"
            placeholder="Nama jalan, nomor rumah, RT/RW, patokan"
            aria-invalid={invalid(errors.addressLine)}
            {...register("addressLine")}
          />
          <FieldError>{errors.addressLine?.message}</FieldError>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={invalid(errors.label)}>
            <FieldLabel htmlFor="label">Label (opsional)</FieldLabel>
            <Input
              id="label"
              placeholder="Rumah, Kantor, …"
              aria-invalid={invalid(errors.label)}
              {...register("label")}
            />
            <FieldError>{errors.label?.message}</FieldError>
          </Field>
          <Field data-invalid={invalid(errors.note)}>
            <FieldLabel htmlFor="note">Catatan kurir (opsional)</FieldLabel>
            <Input
              id="note"
              placeholder="mis. Pagar hitam"
              aria-invalid={invalid(errors.note)}
              {...register("note")}
            />
            <FieldError>{errors.note?.message}</FieldError>
          </Field>
        </div>

        {!address?.isDefault && (
          <Field orientation="horizontal">
            <Controller
              control={control}
              name="isDefault"
              render={({ field }) => (
                <Switch id="isDefault" checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
            <div>
              <FieldLabel htmlFor="isDefault">Jadikan alamat utama</FieldLabel>
              <FieldDescription>Dipilih otomatis saat checkout.</FieldDescription>
            </div>
          </Field>
        )}

        <DialogFooter>
          <Button type="submit" disabled={pending}>
            {pending && <Spinner />}
            Simpan alamat
          </Button>
        </DialogFooter>
      </FieldGroup>
    </form>
  );
}
