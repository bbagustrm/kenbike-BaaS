"use client";

import { toast } from "sonner";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { changeUserCart, getGuestCartLines, getUserCart, syncGuestCart } from "./actions";
import { addItem, MAX_PER_ITEM, setItemQuantity } from "./items";
import type { CartItem, CartLine, CartResult } from "./types";

type CartState = {
  /** Keranjang tamu — satu-satunya bagian yang disimpan di localStorage. */
  guestItems: CartItem[];
  /** localStorage sudah dibaca (badge baru tampil setelahnya → tanpa hydration mismatch). */
  hydrated: boolean;
  /** undefined = belum tahu, null = tamu, string = id user login. */
  userId: string | null | undefined;
  /** Baris lengkap (harga, nama, stok); null = belum dimuat. */
  lines: CartLine[] | null;
  pending: boolean;
  drawerOpen: boolean;
};

export const useCartStore = create<CartState>()(
  persist(
    (): CartState => ({
      guestItems: [],
      hydrated: false,
      userId: undefined,
      lines: null,
      pending: false,
      drawerOpen: false,
    }),
    {
      name: "kenbike-cart",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ guestItems: s.guestItems }),
      // Versi lama/rusak → mulai dari keranjang kosong.
      migrate: () => ({ guestItems: [] }),
      // Dibaca manual setelah mount (CartSync) agar render server = render pertama client.
      skipHydration: true,
    },
  ),
);

const set = useCartStore.setState;
const get = useCartStore.getState;

/** Abaikan respons lama bila ada permintaan yang lebih baru (mis. klik cepat). */
let requestId = 0;

async function run(task: () => Promise<CartResult>): Promise<CartResult> {
  const id = ++requestId;
  set({ pending: true });
  try {
    const result = await task();
    if (id === requestId) {
      if (result.lines) set({ lines: result.lines });
      set({ pending: false });
    }
    return result;
  } catch {
    if (id === requestId) set({ pending: false });
    return { status: "error", message: "Gagal memuat keranjang. Coba lagi." };
  }
}

const refreshGuest = (items: CartItem[]) =>
  run(() =>
    items.length > 0 ? getGuestCartLines(items) : Promise.resolve({ status: "success", lines: [] }),
  );

/**
 * Dipanggil saat session diketahui / berubah (lihat CartSync).
 * Login + keranjang tamu berisi → merge_guest_cart: cart akun yang sudah
 * berisi dipertahankan, bila kosong isi keranjang tamu dipindahkan. Keranjang
 * tamu lalu dikosongkan, jadi setelah logout keranjang mulai dari kosong.
 */
export async function syncCartSession(userId: string | null) {
  set({ userId, lines: null });
  if (!userId) {
    await refreshGuest(get().guestItems);
    return;
  }

  const guest = get().guestItems;
  if (guest.length === 0) {
    await run(getUserCart);
    return;
  }

  const result = await run(() => syncGuestCart(guest));
  if (result.status === "error") {
    toast.error(result.message);
    return;
  }
  set({ guestItems: [] });
  if ("outcome" in result && result.outcome === "kept") {
    toast.info("Keranjang di akunmu yang dipakai", {
      description: "Barang yang kamu pilih sebelum masuk tidak ditambahkan.",
    });
  } else {
    toast.success("Keranjang dipindahkan ke akunmu");
  }
}

/** Tambah ke keranjang dari halaman produk. */
export async function addToCart(variantId: string, quantity: number): Promise<CartResult> {
  if (get().userId) {
    const result = await run(() => changeUserCart({ variantId, quantity }, "add"));
    if (result.status === "success" && result.message) toast.info(result.message);
    return result;
  }
  const next = addItem(get().guestItems, variantId, quantity);
  if (next === get().guestItems) {
    return { status: "error", message: "Keranjang sudah penuh." };
  }
  set({ guestItems: next });
  const result = await refreshGuest(next);
  if (result.status === "error") return result;

  // Sama seperti cart DB: jumlah dibatasi stok tersedia.
  const line = result.lines?.find((l) => l.variantId === variantId);
  if (!line || line.available <= 0) {
    await setCartQuantity(variantId, 0);
    return { status: "error", message: "Stok varian ini sedang habis." };
  }
  if (line.quantity > line.available) {
    await setCartQuantity(variantId, line.available);
    toast.info(`Stok tersisa ${line.available} unit.`);
  } else if (line.quantity >= MAX_PER_ITEM) {
    toast.info(`Maksimal ${MAX_PER_ITEM} unit per varian.`);
  }
  return result;
}

/** Ubah jumlah dari keranjang; 0 = hapus. */
export async function setCartQuantity(variantId: string, quantity: number): Promise<CartResult> {
  if (get().userId) {
    const result = await run(() => changeUserCart({ variantId, quantity }, "set"));
    if (result.status === "error") toast.error(result.message);
    else if (result.message) toast.info(result.message);
    return result;
  }
  const next = setItemQuantity(get().guestItems, variantId, quantity);
  set({
    guestItems: next,
    // Perbarui tampilan langsung; data lengkap menyusul dari server.
    lines:
      get().lines?.flatMap((l) => {
        const item = next.find((i) => i.variantId === l.variantId);
        return item ? [{ ...l, quantity: item.quantity }] : [];
      }) ?? null,
  });
  return refreshGuest(next);
}

export const removeFromCart = (variantId: string) => setCartQuantity(variantId, 0);

export const setCartDrawerOpen = (open: boolean) => set({ drawerOpen: open });
