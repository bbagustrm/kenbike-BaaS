import { ExternalLinkIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminPageHeader } from "@/features/admin";
import { ImageManager } from "@/features/admin/products/components/image-manager";
import { ProductForm } from "@/features/admin/products/components/product-form";
import { StockPanel } from "@/features/admin/products/components/stock-panel";
import { getAdminProduct, listCategoryOptions } from "@/features/admin/products/queries";

export const metadata: Metadata = { title: "Ubah produk · Admin" };

export default async function EditProductPage({ params }: PageProps<"/admin/products/[id]">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const [product, categories] = await Promise.all([getAdminProduct(id), listCategoryOptions()]);
  if (!product) notFound();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        backHref="/admin/products"
        backLabel="Kembali ke daftar produk"
        title={product.form.name}
        description={product.form.isActive ? "Tampil di toko" : "Nonaktif — tidak tampil di toko"}
        actions={
          product.form.isActive && (
            <Link
              href={`/products/${product.slug}`}
              target="_blank"
              className={buttonVariants({ variant: "outline" })}
            >
              <ExternalLinkIcon />
              Lihat di toko
            </Link>
          )
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Foto</CardTitle>
          <CardDescription>
            Atur foto produk dan foto khusus varian (mis. per warna).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ImageManager
            productId={product.id}
            productName={product.form.name}
            images={product.images}
            variants={product.stock}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Stok</CardTitle>
          <CardDescription>Setiap perubahan stok tercatat beserta alasannya.</CardDescription>
        </CardHeader>
        <CardContent>
          <StockPanel stock={product.stock} />
        </CardContent>
      </Card>

      {/* key: reset form ke data terbaru setelah disimpan / di-refresh. */}
      <ProductForm
        key={JSON.stringify(product.form)}
        productId={product.id}
        initial={product.form}
        categories={categories}
      />
    </div>
  );
}
