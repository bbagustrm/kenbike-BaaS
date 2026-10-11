/**
 * Bentuk embed PostgREST nilai opsi sebuah varian:
 * `product_variant_options (value:product_option_values (value, sort_order, option:product_options (sort_order)))`.
 */
export type VariantOptionRow = {
  value: { value: string; sort_order: number; option: { sort_order: number } | null } | null;
};

/** Nilai opsi varian, urut sesuai urutan opsi produk (Warna lalu Ukuran, dst.). */
export function sortedOptionValues(rows: readonly VariantOptionRow[]) {
  return rows
    .flatMap((row) => (row.value ? [row.value] : []))
    .sort((a, b) => (a.option?.sort_order ?? 0) - (b.option?.sort_order ?? 0));
}

/** Label varian, mis. "Merah / M"; `fallback` bila produk tanpa opsi. */
export function variantLabelFromRows(rows: readonly VariantOptionRow[], fallback = ""): string {
  return (
    sortedOptionValues(rows)
      .map((v) => v.value)
      .join(" / ") || fallback
  );
}

/** Pembanding urutan varian berdasarkan urutan nilai opsinya. */
export function compareOptionRank(
  a: readonly VariantOptionRow[],
  b: readonly VariantOptionRow[],
): number {
  const ra = sortedOptionValues(a);
  const rb = sortedOptionValues(b);
  return ra.reduce((acc, v, i) => acc || v.sort_order - (rb[i]?.sort_order ?? 0), 0);
}
