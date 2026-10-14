/**
 * Ukuran kertas resi (thermal). Label lembaran punya tinggi tetap; kertas roll
 * (58/80 mm, `height: null`) tingginya mengikuti isi agar kertas tidak terbuang.
 */
export type LabelSize = { width: number; height: number | null };

export const LABEL_PRESETS = {
  "100x150": { label: "Label 100 × 150 mm", width: 100, height: 150 },
  "100x100": { label: "Label 100 × 100 mm", width: 100, height: 100 },
  "80": { label: "Roll 80 mm", width: 80, height: null },
  "58": { label: "Roll 58 mm", width: 58, height: null },
} as const satisfies Record<string, { label: string } & LabelSize>;

export type LabelPreset = keyof typeof LABEL_PRESETS;

export const DEFAULT_LABEL_PRESET: LabelPreset = "100x150";

export const LABEL_LIMITS = {
  width: { min: 50, max: 120 },
  height: { min: 50, max: 300 },
} as const;

export function isLabelPreset(value: unknown): value is LabelPreset {
  return typeof value === "string" && Object.hasOwn(LABEL_PRESETS, value);
}

function clampMm(value: string | null, { min, max }: { min: number; max: number }) {
  if (value === null || !/^\d{2,3}$/.test(value)) return null;
  return Math.min(max, Math.max(min, Number(value)));
}

/**
 * `?size=100x150` (preset) atau `?w=75&h=120` (kustom, mm; tanpa `h` = roll).
 * Nilai di luar batas dijepit; nilai tidak valid jatuh ke preset default.
 */
export function parseLabelSize(params: URLSearchParams): LabelSize {
  const size = params.get("size");
  if (isLabelPreset(size)) {
    const { width, height } = LABEL_PRESETS[size];
    return { width, height };
  }
  const width = clampMm(params.get("w"), LABEL_LIMITS.width);
  if (width !== null) return { width, height: clampMm(params.get("h"), LABEL_LIMITS.height) };
  const { width: w, height: h } = LABEL_PRESETS[DEFAULT_LABEL_PRESET];
  return { width: w, height: h };
}

/** Query string untuk tautan unduh resi. */
export function labelSizeQuery(size: LabelPreset | { width: number; height: number | null }) {
  if (typeof size === "string") return `size=${size}`;
  return size.height === null ? `w=${size.width}` : `w=${size.width}&h=${size.height}`;
}

/** Ukuran huruf dasar (pt) menurut lebar kertas; label pendek (< 130 mm) satu tingkat lebih kecil. */
export function labelFontSize({ width, height }: LabelSize): number {
  const base = width >= 90 ? 9 : width >= 70 ? 8 : 7;
  return height !== null && height < 130 ? Math.max(6, base - 1) : base;
}
