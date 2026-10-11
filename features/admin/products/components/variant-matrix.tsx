"use client";

import { WandSparklesIcon } from "lucide-react";
import { useState } from "react";
import { Controller, type FieldPath, useFormContext, useWatch } from "react-hook-form";

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

const NUMBER_FIELDS = [
  { key: "price", label: "Harga (Rp)", step: 1000, width: "w-32" },
  { key: "weightGram", label: "Berat (g)", step: 50, width: "w-24" },
  { key: "lengthCm", label: "P (cm)", step: 1, width: "w-20" },
  { key: "widthCm", label: "L (cm)", step: 1, width: "w-20" },
  { key: "heightCm", label: "T (cm)", step: 1, width: "w-20" },
] as const;

type NumberKey = (typeof NUMBER_FIELDS)[number]["key"];

/**
 * Matriks varian. Baris dibuat otomatis dari kombinasi opsi (lihat
 * ProductForm); di sini admin mengisi SKU, harga, berat, dan dimensi.
 */
export function VariantMatrix() {
  const { control, register, setValue, getValues, formState } = useFormContext<ProductFormValues>();
  const variants = useWatch({ control, name: "variants" }) ?? [];
  const options = useWatch({ control, name: "options" }) ?? [];
  const slug = useWatch({ control, name: "slug" }) ?? "";
  const [bulk, setBulk] = useState<Partial<Record<NumberKey, string>>>({});

  const applyBulk = () => {
    for (const { key } of NUMBER_FIELDS) {
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
      <div className="flex flex-wrap items-end gap-2 rounded-lg bg-muted/50 p-3">
        {NUMBER_FIELDS.map((f) => (
          <label key={f.key} className="space-y-1 text-xs text-muted-foreground">
            {f.label}
            <Input
              type="number"
              min={0}
              step={f.step}
              className={cn("bg-background", f.width)}
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

      {variantsError && <p className="text-sm text-destructive">{variantsError}</p>}

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Varian</TableHead>
              <TableHead>SKU</TableHead>
              {NUMBER_FIELDS.map((f) => (
                <TableHead key={f.key}>{f.label}</TableHead>
              ))}
              <TableHead>Stok awal</TableHead>
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
                      className="w-40 font-mono"
                      {...register(`variants.${i}.sku`)}
                    />
                  </TableCell>
                  {NUMBER_FIELDS.map((f) => (
                    <TableCell key={f.key}>
                      <CellInput
                        type="number"
                        min={0}
                        step={f.step}
                        label={`${f.label} ${label}`}
                        error={errorOf(i, f.key)}
                        className={f.width}
                        {...register(`variants.${i}.${f.key}` as FieldPath<ProductFormValues>, {
                          valueAsNumber: true,
                        })}
                      />
                    </TableCell>
                  ))}
                  <TableCell>
                    {row.id ? (
                      <span className="text-xs text-muted-foreground">lihat panel stok</span>
                    ) : (
                      <CellInput
                        type="number"
                        min={0}
                        label={`Stok awal ${label}`}
                        error={errorOf(i, "initialStock")}
                        className="w-20"
                        {...register(`variants.${i}.initialStock`, { valueAsNumber: true })}
                      />
                    )}
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
        Varian yang sudah pernah dipesan tidak dihapus saat dibuang dari matriks — otomatis
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
      {error && <p className="max-w-40 text-xs text-destructive">{error}</p>}
    </div>
  );
}
