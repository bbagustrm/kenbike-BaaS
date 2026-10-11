import type { RateItem } from "@/lib/biteship/types";

/** Baris keranjang + data paket varian (berat & dimensi per unit). */
export type ShippableLine = {
  name: string;
  price: number;
  quantity: number;
  weightGram: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
};

/** Barang untuk Rates API Biteship (berat per unit dalam gram, dimensi dalam cm). */
export function toRateItems(lines: readonly ShippableLine[]): RateItem[] {
  return lines
    .filter((l) => l.quantity > 0)
    .map((l) => ({
      name: l.name.slice(0, 100),
      value: Math.max(0, Math.round(l.price)),
      quantity: l.quantity,
      weight: Math.max(1, Math.round(l.weightGram)),
      length: Math.max(1, Math.round(l.lengthCm)),
      width: Math.max(1, Math.round(l.widthCm)),
      height: Math.max(1, Math.round(l.heightCm)),
    }));
}
