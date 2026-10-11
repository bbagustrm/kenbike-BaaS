import type { ProductOption, ProductVariant } from "./types";

/** optionId → optionValueId yang dipilih. */
export type Selection = Record<string, string>;

export type ValueState = "available" | "sold-out" | "unavailable";

/** Pilihan opsi yang menghasilkan varian tertentu. */
export function selectionForVariant(options: ProductOption[], variant: ProductVariant): Selection {
  const selection: Selection = {};
  for (const option of options) {
    const value = option.values.find((v) => variant.optionValueIds.includes(v.id));
    if (value) selection[option.id] = value.id;
  }
  return selection;
}

/** Pilihan awal: nilai-nilai opsi dari varian pertama (varian sudah urut harga). */
export function initialSelection(options: ProductOption[], variants: ProductVariant[]): Selection {
  const first = variants[0];
  return first ? selectionForVariant(options, first) : {};
}

/** Label varian sesuai urutan opsi, mis. "Merah / M". */
export function variantLabel(options: ProductOption[], variant: ProductVariant): string {
  return options
    .map((o) => o.values.find((v) => variant.optionValueIds.includes(v.id))?.value)
    .filter(Boolean)
    .join(" / ");
}

/** Varian yang cocok dengan pilihan lengkap; null jika belum lengkap / tidak ada. */
export function findVariant(
  options: ProductOption[],
  variants: ProductVariant[],
  selection: Selection,
): ProductVariant | null {
  if (options.length === 0) return variants[0] ?? null;
  const chosen = options.map((o) => selection[o.id]);
  if (chosen.some((id) => !id)) return null;
  return variants.find((v) => chosen.every((id) => v.optionValueIds.includes(id!))) ?? null;
}

/**
 * Status sebuah nilai opsi bila dipilih bersama pilihan opsi lain saat ini:
 * - unavailable: kombinasi tidak dijual
 * - sold-out: kombinasi ada tetapi stoknya habis
 */
export function valueState(
  options: ProductOption[],
  variants: ProductVariant[],
  selection: Selection,
  optionId: string,
  valueId: string,
  availability: Record<string, number> | null,
): ValueState {
  const required = options
    .map((o) => (o.id === optionId ? valueId : selection[o.id]))
    .filter((id): id is string => Boolean(id));
  const matches = variants.filter((v) => required.every((id) => v.optionValueIds.includes(id)));
  if (matches.length === 0) return "unavailable";
  if (availability && matches.every((v) => (availability[v.id] ?? 0) <= 0)) return "sold-out";
  return "available";
}
