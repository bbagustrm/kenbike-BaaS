import type { VariantFormValues } from "./schemas";

/** Baris opsi dari DB (embed `product_options (… values:product_option_values (…))`). */
export type DbOption = {
  name: string;
  sort_order: number;
  values: { id: string; value: string; sort_order: number }[];
};

/** Baris varian dari DB dengan id nilai opsinya. */
export type DbVariant = {
  id: string;
  sku: string;
  price: number;
  is_active: boolean;
  created_at: string;
  option_values: { option_value_id: string }[];
};

const bySort = <T extends { sort_order: number }>(a: T, b: T) => a.sort_order - b.sort_order;

/** Opsi & nilainya sesuai urutan yang diatur admin. */
export function sortOptions(options: readonly DbOption[]) {
  return [...options]
    .sort(bySort)
    .map((o) => ({ name: o.name, values: [...o.values].sort(bySort) }));
}

type SortedOption = ReturnType<typeof sortOptions>[number];

/** Kombinasi opsi sebuah varian, mis. { Warna: "Merah", Ukuran: "M" }. */
export function comboOf(options: readonly SortedOption[], valueIds: readonly string[]) {
  const combo: Record<string, string> = {};
  for (const option of options) {
    const value = option.values.find((v) => valueIds.includes(v.id));
    if (value) combo[option.name] = value.value;
  }
  return combo;
}

/** Label varian, mis. "Merah / M"; "Default" untuk produk tanpa opsi. */
export function labelOf(options: readonly SortedOption[], valueIds: readonly string[]) {
  const combo = comboOf(options, valueIds);
  return (
    options
      .map((o) => combo[o.name])
      .filter(Boolean)
      .join(" / ") || "Default"
  );
}

/**
 * Baris matriks varian untuk form: satu baris per kombinasi (varian aktif
 * didahulukan bila ada kombinasi ganda), varian dengan mapping opsi tidak
 * lengkap (opsinya sudah dihapus) dilewati, urut sesuai urutan nilai opsi.
 * `quantityOf` mengisi stok fisik saat ini (juga sebagai `stockOriginal`).
 */
export function toFormVariants(
  options: readonly SortedOption[],
  variants: readonly DbVariant[],
  quantityOf: (variantId: string) => number,
): VariantFormValues[] {
  const seen = new Set<string>();
  const rows = [...variants]
    .sort(
      (a, b) =>
        Number(b.is_active) - Number(a.is_active) || a.created_at.localeCompare(b.created_at),
    )
    .flatMap((v) => {
      const combo = comboOf(
        options,
        v.option_values.map((ov) => ov.option_value_id),
      );
      const key = options.map((o) => combo[o.name] ?? "").join("|");
      if (Object.keys(combo).length !== options.length || seen.has(key)) return [];
      seen.add(key);
      const quantity = quantityOf(v.id);
      return [
        {
          id: v.id,
          options: combo,
          sku: v.sku,
          price: v.price,
          stock: quantity,
          stockOriginal: quantity,
          isActive: v.is_active,
        },
      ];
    });

  const rank = (combo: Record<string, string>) =>
    options.map((o) => o.values.findIndex((v) => v.value === combo[o.name]));
  return rows.sort((a, b) => {
    const rb = rank(b.options);
    return rank(a.options).reduce((acc, x, i) => acc || x - (rb[i] ?? 0), 0);
  });
}
