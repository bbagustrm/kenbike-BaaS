import type { Metadata } from "next";

import { AdminPageHeader } from "@/features/admin";
import { ProductForm } from "@/features/admin/products/components/product-form";
import { listCategoryOptions } from "@/features/admin/products/queries";

export const metadata: Metadata = { title: "Tambah produk · Admin" };

export default async function NewProductPage() {
  const categories = await listCategoryOptions();
  return (
    <div className="space-y-6">
      <AdminPageHeader
        backHref="/admin/products"
        backLabel="Kembali ke daftar produk"
        title="Tambah produk"
        description="Isi informasi, foto, pengemasan, dan varian produk."
      />
      <ProductForm productId={null} categories={categories} />
    </div>
  );
}
