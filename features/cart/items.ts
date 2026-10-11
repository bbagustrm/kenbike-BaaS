import type { CartItem, CartLine } from "./types";

/** Maks. jumlah per varian dalam satu keranjang. */
export const MAX_PER_ITEM = 10;
/** Maks. jenis varian dalam keranjang (sama dengan batas merge_guest_cart). */
export const MAX_CART_LINES = 50;

const clamp = (n: number) => Math.min(Math.max(Math.trunc(n), 1), MAX_PER_ITEM);

/** Tambah varian (atau tambah jumlahnya bila sudah ada). Jumlah dibatasi 1..MAX_PER_ITEM. */
export function addItem(items: CartItem[], variantId: string, quantity: number): CartItem[] {
  if (!Number.isFinite(quantity) || quantity < 1) return items;
  const existing = items.find((i) => i.variantId === variantId);
  if (existing) {
    return items.map((i) =>
      i.variantId === variantId ? { ...i, quantity: clamp(i.quantity + quantity) } : i,
    );
  }
  if (items.length >= MAX_CART_LINES) return items;
  return [...items, { variantId, quantity: clamp(quantity) }];
}

/** Ubah jumlah varian; 0 atau kurang menghapusnya. */
export function setItemQuantity(
  items: CartItem[],
  variantId: string,
  quantity: number,
): CartItem[] {
  if (!Number.isFinite(quantity) || quantity < 1) return removeItem(items, variantId);
  return items.map((i) => (i.variantId === variantId ? { ...i, quantity: clamp(quantity) } : i));
}

export function removeItem(items: CartItem[], variantId: string): CartItem[] {
  return items.filter((i) => i.variantId !== variantId);
}

/** Total unit di keranjang (untuk badge). */
export function countItems(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.quantity, 0);
}

/** Baris yang bisa dibeli: stok cukup untuk jumlah yang diminta. */
export function isPurchasable(line: CartLine): boolean {
  return line.available >= line.quantity;
}

/** Subtotal hanya dari baris yang bisa dibeli. */
export function subtotal(lines: CartLine[]): number {
  return lines.filter(isPurchasable).reduce((sum, l) => sum + l.price * l.quantity, 0);
}
