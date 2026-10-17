export type Category = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  sortOrder: number;
};

/** Rata-rata bintang & jumlah ulasan (count 0 = belum ada ulasan). */
export type RatingSummary = { avg: number; count: number };

export type ProductCardData = {
  id: string;
  slug: string;
  name: string;
  categoryName: string | null;
  priceMin: number;
  priceMax: number;
  imagePath: string | null;
  /** Estimasi hari kirim bila produk pre-order, selain itu null. */
  preorderDays: number | null;
  rating: RatingSummary;
};

export type ProductOption = {
  id: string;
  name: string;
  values: { id: string; value: string }[];
};

export type ProductVariant = {
  id: string;
  sku: string;
  price: number;
  weightGram: number;
  dimensionsCm: readonly [number, number, number];
  optionValueIds: string[];
};

export type ProductImage = {
  id: string;
  path: string;
  alt: string | null;
  variantId: string | null;
};

export type ProductDetail = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  /** Estimasi hari kirim bila produk pre-order, selain itu null. */
  preorderDays: number | null;
  breadcrumb: Category[];
  options: ProductOption[];
  variants: ProductVariant[];
  images: ProductImage[];
  rating: RatingSummary;
};
