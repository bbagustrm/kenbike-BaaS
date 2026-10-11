import type { OptionFormValues, VariantFormValues } from "./schemas";

type Defaults = Pick<
  VariantFormValues,
  "price" | "weightGram" | "lengthCm" | "widthCm" | "heightCm"
>;

/** Semua kombinasi nilai opsi; satu kombinasi kosong jika tanpa opsi. */
export function combinations(options: OptionFormValues[]): Record<string, string>[] {
  return options.reduce<Record<string, string>[]>(
    (acc, option) =>
      acc.flatMap((combo) => option.values.map((value) => ({ ...combo, [option.name]: value }))),
    [{}],
  );
}

/** Kunci baris berdasarkan nilai (bukan nama opsi) agar mengganti nama opsi tidak menghapus data. */
export function comboKey(options: OptionFormValues[], combo: Record<string, string>): string {
  return options.map((o) => (combo[o.name] ?? "").toLowerCase()).join("|");
}

/** Label varian, mis. "Merah / M". */
export function comboLabel(options: OptionFormValues[], combo: Record<string, string>): string {
  return (
    options
      .map((o) => combo[o.name])
      .filter(Boolean)
      .join(" / ") || "Default"
  );
}

function skuPart(value: string) {
  return (
    value
      .normalize("NFD")
      .replace(/[^A-Za-z0-9]/g, "")
      .toUpperCase()
      .slice(0, 6) || "X"
  );
}

export function suggestSku(
  base: string,
  options: OptionFormValues[],
  combo: Record<string, string>,
) {
  const parts = options
    .map((o) => combo[o.name])
    .filter((v): v is string => Boolean(v))
    .map(skuPart);
  return [base, ...parts].join("-").slice(0, 50);
}

/**
 * Susun ulang baris varian setelah opsi berubah. Baris dengan kombinasi nilai
 * yang sama dipertahankan (id, SKU, harga, dll.); baris baru mewarisi angka
 * dari baris pertama yang ada (atau `defaults`) dan mendapat saran SKU.
 * Opsi tanpa nama atau tanpa nilai diabaikan sampai lengkap.
 */
export function buildVariantRows(
  rawOptions: OptionFormValues[],
  current: VariantFormValues[],
  skuBase: string,
  defaults: Defaults,
): VariantFormValues[] {
  const options = rawOptions.filter((o) => o.name.trim() && o.values.length > 0);
  const previousOptions = rawOptionsOf(current);
  const byKey = new Map(current.map((row) => [comboKey(previousOptions, row.options), row]));
  const template = current[0] ?? null;
  const used = new Set<VariantFormValues>();
  // Tambah opsi pertama ke produk tanpa opsi: varian "Default" dipakai sekali.
  let defaultRow = previousOptions.length === 0 && current.length === 1 ? current[0] : undefined;

  return combinations(options).map((combo) => {
    let existing = byKey.get(comboKey(options, combo));
    if (existing && used.has(existing)) existing = undefined;
    if (!existing && defaultRow) {
      existing = defaultRow;
      defaultRow = undefined;
    }

    if (existing) {
      used.add(existing);
      return { ...existing, options: combo };
    }
    return {
      options: combo,
      sku: suggestSku(skuBase, options, combo),
      price: template?.price ?? defaults.price,
      weightGram: template?.weightGram ?? defaults.weightGram,
      lengthCm: template?.lengthCm ?? defaults.lengthCm,
      widthCm: template?.widthCm ?? defaults.widthCm,
      heightCm: template?.heightCm ?? defaults.heightCm,
      isActive: true,
      initialStock: 0,
    };
  });
}

/** Urutan opsi pada baris lama, direkonstruksi dari kunci `options` baris. */
function rawOptionsOf(rows: VariantFormValues[]): OptionFormValues[] {
  const names = rows[0] ? Object.keys(rows[0].options) : [];
  return names.map((name) => ({ name, values: [] }));
}

/** Basis SKU dari slug: huruf pertama tiap kata, mis. "polygon-xtrada-5" → "KB-PX5". */
export function skuBaseFromSlug(slug: string): string {
  const initials = slug
    .split("-")
    .filter(Boolean)
    .map((word) => word[0]!.toUpperCase())
    .join("")
    .slice(0, 10);
  return initials ? `KB-${initials}` : "KB";
}
