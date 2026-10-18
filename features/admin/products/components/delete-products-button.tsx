"use client";

import { Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";

import { deleteProducts } from "../actions";

type DeleteProductsButtonProps = {
  products: { id: string; name: string }[];
  /** Setelah berhasil pindah ke halaman ini (dipakai dari halaman ubah produk). */
  redirectTo?: string;
  onDeleted?: () => void;
  size?: "sm" | "default";
};

/** Hapus permanen satu/banyak produk dengan konfirmasi. */
export function DeleteProductsButton({
  products,
  redirectTo,
  onDeleted,
  size = "default",
}: DeleteProductsButtonProps) {
  const router = useRouter();
  const count = products.length;
  const single = count === 1 ? products[0] : undefined;

  return (
    <ConfirmDialog
      trigger={<Button variant="destructive" size={size} disabled={count === 0} />}
      triggerLabel={
        <>
          <Trash2Icon />
          {redirectTo ? "Hapus produk" : `Hapus (${count})`}
        </>
      }
      title={single ? `Hapus "${single.name}"?` : `Hapus ${count} produk?`}
      description={
        <>
          Produk, varian, foto, dan komentarnya dihapus <strong>permanen</strong> dan tidak bisa
          dikembalikan. Ulasan pembeli dan riwayat pesanan lama tetap tersimpan. Produk yang masih
          ada di pesanan berjalan tidak bisa dihapus — nonaktifkan saja bila hanya ingin
          menyembunyikannya.
        </>
      }
      confirmLabel="Hapus permanen"
      destructive
      onConfirm={async () => {
        const result = await deleteProducts(
          products.map((p) => p.id),
          { refreshPage: !redirectTo },
        );
        if (result.status === "success") {
          onDeleted?.();
          if (redirectTo) router.replace(redirectTo);
        }
        return result;
      }}
    />
  );
}
