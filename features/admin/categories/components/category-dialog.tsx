"use client";

import { useActionState, useEffect, useEffectEvent, useState } from "react";
import { toast } from "sonner";

import { FormAlert } from "@/components/shared/form-alert";
import { FormField } from "@/components/shared/form-field";
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
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { type ActionState, initialActionState } from "@/lib/action-state";
import { slugify } from "@/lib/slug";

import { saveCategory } from "../actions";
import type { AdminCategory } from "../queries";

type CategoryDialogProps = {
  category?: AdminCategory;
  /** Kandidat induk: kategori utama selain kategori ini. */
  parents: Pick<AdminCategory, "id" | "name">[];
  trigger: React.ReactElement;
  triggerLabel: React.ReactNode;
};

export function CategoryDialog({ category, parents, trigger, triggerLabel }: CategoryDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger}>{triggerLabel}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{category ? "Ubah kategori" : "Tambah kategori"}</DialogTitle>
          <DialogDescription>
            Kategori utama bisa punya sub-kategori (mis. Sepeda → MTB).
          </DialogDescription>
        </DialogHeader>
        {/* Dirender ulang setiap dialog dibuka agar state form kembali bersih. */}
        {open && (
          <CategoryForm category={category} parents={parents} onSaved={() => setOpen(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function CategoryForm({
  category,
  parents,
  onSaved,
}: Pick<CategoryDialogProps, "category" | "parents"> & { onSaved: () => void }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    saveCategory,
    initialActionState,
  );
  const [name, setName] = useState(state.values?.name ?? category?.name ?? "");
  const [slug, setSlug] = useState(state.values?.slug ?? category?.slug ?? "");
  // Slug mengikuti nama sampai admin mengubah slug secara manual.
  const [slugTouched, setSlugTouched] = useState(Boolean(category));

  const handleSuccess = useEffectEvent((message?: string) => {
    toast.success(message);
    onSaved();
  });
  useEffect(() => {
    if (state.status === "success") handleSuccess(state.message);
  }, [state]);

  return (
    <form action={action} noValidate>
      <FieldGroup>
        <FormAlert
          state={state.status === "error" && !state.fieldErrors ? state : initialActionState}
        />
        {category && <input type="hidden" name="id" value={category.id} />}
        <FormField
          name="name"
          label="Nama"
          required
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!slugTouched) setSlug(slugify(e.target.value));
          }}
          errors={state.fieldErrors?.name}
        />
        <FormField
          name="slug"
          label="Slug"
          description="Dipakai di URL, mis. /products?category=mtb"
          required
          value={slug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(e.target.value);
          }}
          errors={state.fieldErrors?.slug}
        />
        <Field data-invalid={state.fieldErrors?.parentId ? true : undefined}>
          <FieldLabel htmlFor="parentId">Induk</FieldLabel>
          <NativeSelect
            id="parentId"
            name="parentId"
            defaultValue={state.values?.parentId ?? category?.parentId ?? ""}
          >
            <NativeSelectOption value="">— Kategori utama —</NativeSelectOption>
            {parents.map((p) => (
              <NativeSelectOption key={p.id} value={p.id}>
                {p.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <FieldError>{state.fieldErrors?.parentId?.[0]}</FieldError>
        </Field>
        <FormField
          name="sortOrder"
          label="Urutan"
          type="number"
          min={0}
          defaultValue={state.values?.sortOrder ?? String(category?.sortOrder ?? 0)}
          description="Angka kecil tampil lebih dulu."
          errors={state.fieldErrors?.sortOrder}
        />
        <DialogFooter>
          <Button type="submit" disabled={pending}>
            {pending && <Spinner />}
            Simpan
          </Button>
        </DialogFooter>
      </FieldGroup>
    </form>
  );
}
