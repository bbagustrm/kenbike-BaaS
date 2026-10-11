"use client";

import { CheckIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";

import { adjustStock } from "../actions";
import { LOW_STOCK_THRESHOLD } from "../constants";
import type { AdminProductRowVariant } from "../queries";

/** Varian satu produk di daftar produk: harga, stok, dan ubah stok fisik langsung. */
export function VariantStockRows({ variants }: { variants: AdminProductRowVariant[] }) {
  return (
    <div className="overflow-hidden rounded-md border bg-background">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Varian</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead className="text-right">Harga</TableHead>
            <TableHead className="text-right">Dipesan</TableHead>
            <TableHead className="text-right">Tersedia</TableHead>
            <TableHead>Stok fisik</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {variants.map((v) => (
            <TableRow key={v.variantId} className={cn(!v.isActive && "opacity-60")}>
              <TableCell className="font-medium whitespace-nowrap">
                {v.label}
                {!v.isActive && (
                  <Badge variant="outline" className="ml-2">
                    Nonaktif
                  </Badge>
                )}
              </TableCell>
              <TableCell className="font-mono text-xs">{v.sku}</TableCell>
              <TableCell className="text-right whitespace-nowrap tabular-nums">
                {formatRupiah(v.price)}
              </TableCell>
              <TableCell className="text-right tabular-nums">{v.reserved}</TableCell>
              <TableCell className="text-right whitespace-nowrap tabular-nums">
                {v.available}
                {v.isActive && v.available <= LOW_STOCK_THRESHOLD && (
                  <Badge variant="destructive" className="ml-2">
                    {v.available === 0 ? "Habis" : "Menipis"}
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                {/* key: reset isian ke angka terbaru setelah disimpan. */}
                <StockInput key={v.quantity} variant={v} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="border-t px-3 py-2 text-xs text-muted-foreground">
        Ubah stok fisik lalu tekan Enter atau tombol centang. Perubahan tercatat di riwayat stok
        produk. Dipesan = ditahan untuk pesanan yang belum dibayar.
      </p>
    </div>
  );
}

function StockInput({ variant }: { variant: AdminProductRowVariant }) {
  const [value, setValue] = useState(String(variant.quantity));
  const [pending, startTransition] = useTransition();
  const next = Number(value);
  const valid = value.trim() !== "" && Number.isInteger(next) && next >= 0;
  const changed = valid && next !== variant.quantity;

  const save = () => {
    if (!changed) return;
    startTransition(async () => {
      // Disimpan sebagai selisih dari angka yang terlihat, agar penjualan yang
      // terjadi sementara itu tidak tertimpa.
      const result = await adjustStock({
        variantId: variant.variantId,
        delta: next - variant.quantity,
        reason: "Diubah dari daftar produk",
      });
      if (result.status === "error") toast.error(result.message);
      else toast.success(`${variant.label}: ${result.message}`);
    });
  };

  return (
    <form
      className="flex items-center gap-1"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <Input
        type="number"
        min={0}
        inputMode="numeric"
        aria-label={`Stok fisik ${variant.label}`}
        aria-invalid={!valid ? true : undefined}
        className="h-8 w-24"
        value={value}
        disabled={pending}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setValue(String(variant.quantity));
        }}
      />
      <Button
        type="submit"
        size="icon-sm"
        variant={changed ? "default" : "ghost"}
        disabled={!changed || pending}
        aria-label={`Simpan stok ${variant.label}`}
      >
        {pending ? <Spinner /> : <CheckIcon />}
      </Button>
    </form>
  );
}
