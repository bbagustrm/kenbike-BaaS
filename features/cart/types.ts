/** Isi keranjang minimal: harga & nama selalu diambil ulang dari server. */
export type CartItem = { variantId: string; quantity: number };

/** Baris keranjang yang sudah dilengkapi data produk terbaru. */
export type CartLine = CartItem & {
  productName: string;
  slug: string;
  /** mis. "Merah / M"; kosong bila produk tanpa opsi. */
  variantLabel: string;
  sku: string;
  price: number;
  imagePath: string | null;
  /** Stok tersedia saat ini (0 = habis / tidak dijual lagi). */
  available: number;
  preorderDays: number | null;
};

export type CartResult = {
  status: "success" | "error";
  message?: string;
  /** Isi keranjang terbaru (user login); tidak ada bila gagal sebelum membaca DB. */
  lines?: CartLine[];
};
