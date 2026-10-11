"use client";

import { SlidersHorizontalIcon } from "lucide-react";
import Form from "next/form";

import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

import { type ProductListParams, SORT_OPTIONS } from "../search-params";
import type { Category } from "../types";

/**
 * Filter daftar produk sebagai form GET (next/form: navigasi client-side,
 * tetap berfungsi tanpa JavaScript), dan state-nya selalu ada di URL (bisa dibagikan/bookmark).
 * Mengubah urutan langsung mengirim form.
 */
export function CatalogFilters({
  params,
  categories,
}: {
  params: ProductListParams;
  categories: Category[];
}) {
  const roots = categories.filter((c) => !c.parentId);

  return (
    <Form
      action="/products"
      className="grid grid-cols-2 items-end gap-3 sm:gap-4 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]"
    >
      {params.q && <input type="hidden" name="q" value={params.q} />}
      <Field className="col-span-2 lg:col-span-1">
        <FieldLabel htmlFor="filter-category">Kategori</FieldLabel>
        <NativeSelect id="filter-category" name="category" defaultValue={params.category ?? ""}>
          <NativeSelectOption value="">Semua kategori</NativeSelectOption>
          {roots.map((root) => [
            <NativeSelectOption key={root.id} value={root.slug}>
              {root.name}
            </NativeSelectOption>,
            ...categories
              .filter((c) => c.parentId === root.id)
              .map((child) => (
                <NativeSelectOption key={child.id} value={child.slug}>
                  {"  "}
                  {child.name}
                </NativeSelectOption>
              )),
          ])}
        </NativeSelect>
      </Field>
      <Field>
        <FieldLabel htmlFor="filter-min">Harga min (Rp)</FieldLabel>
        <Input
          id="filter-min"
          name="min"
          type="number"
          inputMode="numeric"
          min={0}
          step={1000}
          defaultValue={params.min}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="filter-max">Harga maks (Rp)</FieldLabel>
        <Input
          id="filter-max"
          name="max"
          type="number"
          inputMode="numeric"
          min={0}
          step={1000}
          defaultValue={params.max}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="filter-sort">Urutkan</FieldLabel>
        <NativeSelect
          id="filter-sort"
          name="sort"
          defaultValue={params.sort}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
        >
          {Object.entries(SORT_OPTIONS).map(([value, label]) => (
            <NativeSelectOption key={value} value={value}>
              {label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </Field>
      <Button type="submit" variant="outline">
        <SlidersHorizontalIcon />
        Terapkan
      </Button>
    </Form>
  );
}
