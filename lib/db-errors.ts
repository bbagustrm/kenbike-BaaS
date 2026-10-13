/** Error PostgREST/Postgres minimal yang dibutuhkan untuk memetakan pesan. */
type DbError = { code?: string; message: string; details?: string | null };

const UNIQUE_MESSAGES: Record<string, string> = {
  categories_slug_key: "Slug kategori sudah dipakai.",
  products_slug_key: "Slug produk sudah dipakai.",
  product_variants_sku_key: "SKU sudah dipakai produk/varian lain.",
};

const RAISED_MESSAGES: Record<string, string> = {
  forbidden: "Kamu tidak punya akses untuk aksi ini.",
  product_requires_variant: "Produk wajib punya minimal satu varian.",
  option_requires_values: "Setiap opsi wajib punya minimal satu nilai.",
  variant_options_mismatch: "Setiap varian wajib punya tepat satu nilai untuk setiap opsi.",
  duplicate_variant_combination: "Ada dua varian aktif dengan kombinasi opsi yang sama.",
  invalid_initial_stock: "Stok awal tidak boleh negatif.",
  reason_required: "Alasan penyesuaian stok wajib diisi.",
  invalid_delta: "Jumlah penyesuaian tidak boleh nol.",
  variant_not_found: "Varian tidak ditemukan.",
  product_not_found: "Produk tidak ditemukan.",
  too_many_addresses: "Maksimal 20 alamat. Hapus alamat yang tidak dipakai dulu.",
  default_address_required: "Pilih alamat lain sebagai alamat utama terlebih dahulu.",
  cart_empty: "Keranjang masih kosong.",
  address_not_found: "Alamat tidak ditemukan.",
  insufficient_stock: "Stok salah satu barang tidak cukup. Ubah jumlah di keranjang.",
  invalid_courier: "Pilih layanan kurir terlebih dahulu.",
  invalid_shipping_cost: "Ongkir tidak valid. Pilih kurir lagi.",
  order_not_cancellable: "Pesanan ini sudah tidak bisa dibatalkan.",
};

/**
 * Ubah error DB menjadi pesan untuk pengguna. Pesan asli tidak diteruskan ke
 * client agar detail skema tidak bocor.
 */
export function dbErrorMessage(error: DbError, fallback = "Terjadi kesalahan. Coba lagi."): string {
  // Exception dari RPC kita (raise exception '<kode>') didahulukan karena
  // beberapa memakai SQLSTATE umum (mis. 23505 untuk kombinasi varian ganda).
  const raised = Object.keys(RAISED_MESSAGES).find(
    (key) => error.message === key || error.message.startsWith(`${key}:`),
  );
  if (raised) return RAISED_MESSAGES[raised]!;

  if (error.code === "23505") {
    const constraint = Object.keys(UNIQUE_MESSAGES).find((name) => error.message.includes(name));
    return constraint ? UNIQUE_MESSAGES[constraint]! : "Data yang sama sudah ada.";
  }
  if (error.code === "23503")
    return "Data ini masih dipakai data lain sehingga tidak bisa dihapus.";
  if (error.code === "23514") {
    return error.message.includes("quantity")
      ? "Stok tidak boleh menjadi negatif."
      : "Ada nilai yang tidak valid.";
  }
  if (error.code === "42501") return RAISED_MESSAGES.forbidden!;
  return fallback;
}
