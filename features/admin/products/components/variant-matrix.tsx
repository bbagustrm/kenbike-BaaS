"use client";

import { WandSparklesIcon } from "lucide-react";
import { useState } from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

import type { ProductFormValues } from "../schemas";
import { comboLabel, skuBaseFromSlug, suggestSku } from "../variant-matrix";

const BULK_FIELDS = [
  { key: "price", label: "Harga semua varian (Rp)", step: 1000 },
  { key: "stock", label: "Stok semua varian", step: 1 },
] as const;

type BulkKey = (typeof BULK_FIELDS)[number]["key"];

/**
 * Matriks varian. Baris dibuat otomatis dari kombinasi opsi (lihat
 * ProductForm); admin mengisi SKU, harga, stok, dan status aktif.
 */
export function VariantMatrix() {
  const { control, register, setValue, getValues, formState } = useFormContext<ProductFormValues>();
  const variants = useWatch({ control, name: "variants" }) ?? [];
  const options = useWatch({ control, name: "options" }) ?? [];
  const slug = useWatch({ control, name: "slug" }) ?? "";
  const [bulk, setBulk] = useState<Partial<Record<BulkKey, string>>>({});

  const applyBulk = () => {
    for (const { key } of BULK_FIELDS) {
      const raw = bulk[key];
      if (raw === undefined || raw === "") continue;
      const value = Number(raw);
      if (!Number.isFinite(value)) continue;
      getValues("variants").forEach((_, i) =>
        setValue(`variants.${i}.${key}`, value, { shouldValidate: true, shouldDirty: true }),
      );
    }
    setBulk({});
  };

  const fillSkus = () => {
    const base = skuBaseFromSlug(slug);
    const validOptions = options.filter((o) => o.name.trim() && o.values.length > 0);
    getValues("variants").forEach((row, i) => {
      if (!row.id) {
        setValue(`variants.${i}.sku`, suggestSku(base, validOptions, row.options), {
          shouldValidate: true,
          shouldDirty: true,
        });
      }
    });
  };

  const variantsError =
    formState.errors.variants?.message ?? formState.errors.variants?.root?.message;
  const errorOf = (i: number, key: string) =>
    (formState.errors.variants?.[i] as Record<string, { message?: string }> | undefined)?.[key]
      ?.message;

  return (
    <div className="space-y-4">
      {variants.length > 1 && (
        <div className="flex flex-wrap items-end gap-x-4 gap-y-3 rounded-lg bg-muted/50 p-4">
          {BULK_FIELDS.map((f) => (
            <label
              key={f.key}
              className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground"
            >
              {f.label}
              <Input
                type="number"
                min={0}
                step={f.step}
                className="w-40 bg-background"
                value={bulk[f.key] ?? ""}
                onChange={(e) => setBulk((b) => ({ ...b, [f.key]: e.target.value }))}
              />
            </label>
          ))}
          <Button type="button" variant="outline" onClick={applyBulk}>
            Terapkan ke semua
          </Button>
          <Button type="button" variant="ghost" onClick={fillSkus} className="ml-auto">
            <WandSparklesIcon />
            Isi SKU varian baru
          </Button>
        </div>
      )}

      {variantsError && <p className="text-sm text-destructive">{variantsError}</p>}

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Varian</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Harga (Rp)</TableHead>
              <TableHead>Stok</TableHead>
              <TableHead>Aktif</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {variants.map((row, i) => {
              const label = comboLabel(options, row.options);
              return (
                <TableRow
                  key={`${row.id ?? "new"}-${label}`}
                  className={cn(!row.isActive && "opacity-60")}
                >
                  <TableCell className="font-medium whitespace-nowrap">{label}</TableCell>
                  <TableCell>
                    <CellInput
                      label={`SKU ${label}`}
                      error={errorOf(i, "sku")}
                      className="w-44 font-mono"
                      {...register(`variants.${i}.sku`)}
                    />
                  </TableCell>
                  <TableCell>
                    <CellInput
                      type="number"
                      min={0}
                      step={1000}
                      label={`Harga ${label}`}
                      error={errorOf(i, "price")}
                      className="w-36"
                      {...register(`variants.${i}.price`, { valueAsNumber: true })}
                    />
                  </TableCell>
                  <TableCell>
                    <CellInput
                      type="number"
                      min={0}
                      label={`Stok ${label}`}
                      error={errorOf(i, "stock")}
                      className="w-24"
                      {...register(`variants.${i}.stock`, { valueAsNumber: true })}
                    />
                  </TableCell>
                  <TableCell>
                    <Controller
                      control={control}
                      name={`variants.${i}.isActive`}
                      render={({ field }) => (
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          aria-label={`Aktifkan ${label}`}
                        />
                      )}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">
        Stok = jumlah fisik di gudang. Perubahan stok varian lama dicatat sebagai penyesuaian (lihat
        panel Stok). Varian yang pernah dipesan tidak dihapus saat dibuang dari matriks — otomatis
        dinonaktifkan agar riwayat pesanan tetap utuh.
      </p>
    </div>
  );
}

function CellInput({
  label,
  error,
  className,
  ...props
}: React.ComponentProps<typeof Input> & { label: string; error?: string }) {
  return (
    <div className="space-y-1">
      <Input
        aria-label={label}
        aria-invalid={error ? true : undefined}
        title={error}
        className={cn("h-8", className)}
        {...props}
      />
      {error && <p className="max-w-44 text-xs text-destructive">{error}</p>}
    </div>
  );
}
