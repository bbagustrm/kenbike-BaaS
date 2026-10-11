"use client";

import { PlusIcon, Trash2Icon, XIcon } from "lucide-react";
import { useState } from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { MAX_OPTIONS, MAX_VALUES_PER_OPTION, type ProductFormValues } from "../schemas";

/** Builder opsi varian (mis. Warna, Ukuran) beserta nilai-nilainya. */
export function OptionsEditor() {
  const { control, register, formState } = useFormContext<ProductFormValues>();
  const { fields, append, remove } = useFieldArray({ control, name: "options" });

  return (
    <div className="space-y-4">
      {fields.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Produk tanpa opsi memakai satu varian &quot;Default&quot;. Tambahkan opsi jika produk
          punya pilihan warna, ukuran, dan sebagainya.
        </p>
      )}

      {fields.map((field, index) => {
        const nameError = formState.errors.options?.[index]?.name?.message;
        return (
          <div key={field.id} className="space-y-3 rounded-lg border p-4">
            <div className="flex items-end gap-2">
              <Field className="flex-1" data-invalid={nameError ? true : undefined}>
                <FieldLabel htmlFor={`option-${index}-name`}>Nama opsi</FieldLabel>
                <Input
                  id={`option-${index}-name`}
                  placeholder="mis. Warna"
                  aria-invalid={nameError ? true : undefined}
                  {...register(`options.${index}.name`)}
                />
              </Field>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Hapus opsi"
                onClick={() => remove(index)}
              >
                <Trash2Icon />
              </Button>
            </div>
            <FieldError>{nameError}</FieldError>
            <OptionValues index={index} />
          </div>
        );
      })}

      {fields.length < MAX_OPTIONS && (
        <Button type="button" variant="outline" onClick={() => append({ name: "", values: [] })}>
          <PlusIcon />
          Tambah opsi
        </Button>
      )}
    </div>
  );
}

function OptionValues({ index }: { index: number }) {
  const { control, setValue, formState } = useFormContext<ProductFormValues>();
  const values = useWatch({ control, name: `options.${index}.values` }) ?? [];
  const [draft, setDraft] = useState("");
  const error = formState.errors.options?.[index]?.values;
  const message = error?.message ?? error?.root?.message;

  const commit = () => {
    const next = draft
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean)
      .filter((v) => !values.some((existing) => existing.toLowerCase() === v.toLowerCase()));
    if (next.length > 0) {
      setValue(`options.${index}.values`, [...values, ...next].slice(0, MAX_VALUES_PER_OPTION), {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
    setDraft("");
  };

  return (
    <Field data-invalid={message ? true : undefined}>
      <FieldLabel htmlFor={`option-${index}-values`}>Nilai</FieldLabel>
      <div className="flex flex-wrap gap-2">
        {values.map((value) => (
          <Badge key={value} variant="secondary" className="gap-1 pr-1">
            {value}
            <button
              type="button"
              className="rounded-sm p-0.5 hover:bg-muted-foreground/20"
              aria-label={`Hapus nilai ${value}`}
              onClick={() =>
                setValue(
                  `options.${index}.values`,
                  values.filter((v) => v !== value),
                  { shouldValidate: true, shouldDirty: true },
                )
              }
            >
              <XIcon className="size-3" />
            </button>
          </Badge>
        ))}
      </div>
      <Input
        id={`option-${index}-values`}
        placeholder="Ketik nilai lalu Enter (pisahkan dengan koma untuk banyak sekaligus)"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            commit();
          }
        }}
        onBlur={commit}
      />
      <FieldError>{message}</FieldError>
    </Field>
  );
}
