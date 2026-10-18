"use client";

import { ChevronDownIcon, ChevronRightIcon, PencilIcon } from "lucide-react";
import Link from "next/link";
import { Fragment, useState, useTransition } from "react";
import { toast } from "sonner";

import { Price } from "@/components/shared/price";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button, buttonVariants } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProductImage } from "@/components/shared/product-image";

import { setProductActive } from "../actions";
import type { AdminProductRow } from "../queries";
import { DeleteProductsButton } from "./delete-products-button";
import { VariantStockRows } from "./variant-stock-rows";

const COLUMN_COUNT = 9;

export function ProductTable({ rows }: { rows: AdminProductRow[] }) {
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // Pilihan hanya untuk baris di halaman ini; id yang sudah tidak tampil diabaikan.
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const selectedRows = rows.filter((row) => selected.has(row.id));
  const allSelected = rows.length > 0 && selectedRows.length === rows.length;
  const toggleSelected = (id: string, checked: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });

  return (
    <div className="space-y-3">
      {selectedRows.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/40 px-3 py-2">
          <span className="text-sm">{selectedRows.length} produk dipilih</span>
          <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
            Batal pilih
          </Button>
          <div className="ml-auto">
            <DeleteProductsButton
              size="sm"
              products={selectedRows.map((row) => ({ id: row.id, name: row.name }))}
              onDeleted={() => setSelected(new Set())}
            />
          </div>
        </div>
      )}
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  aria-label="Pilih semua produk di halaman ini"
                  checked={allSelected}
                  indeterminate={selectedRows.length > 0 && !allSelected}
                  onCheckedChange={(checked) =>
                    setSelected(checked ? new Set(rows.map((row) => row.id)) : new Set())
                  }
                />
              </TableHead>
              <TableHead className="w-14">
                <span className="sr-only">Foto</span>
              </TableHead>
              <TableHead>Produk</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead className="text-right">Harga</TableHead>
              <TableHead className="text-right">Varian</TableHead>
              <TableHead className="text-right">Stok tersedia</TableHead>
              <TableHead>Aktif</TableHead>
              <TableHead className="w-20">
                <span className="sr-only">Aksi</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const open = expanded.has(row.id);
              return (
                <Fragment key={row.id}>
                  <TableRow data-state={open || selected.has(row.id) ? "selected" : undefined}>
                    <TableCell>
                      <Checkbox
                        aria-label={`Pilih ${row.name}`}
                        checked={selected.has(row.id)}
                        onCheckedChange={(checked) => toggleSelected(row.id, checked)}
                      />
                    </TableCell>
                    <TableCell>
                      <ProductImage
                        path={row.imagePath}
                        alt={row.name}
                        sizes="48px"
                        className="size-10"
                      />
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/admin/products/${row.id}`}
                        className="font-medium hover:underline"
                      >
                        {row.name}
                      </Link>
                      <p className="font-mono text-xs text-muted-foreground">{row.slug}</p>
                    </TableCell>
                    <TableCell className="text-sm">{row.categoryName ?? "—"}</TableCell>
                    <TableCell className="text-right text-sm whitespace-nowrap">
                      {row.priceMin === null ? (
                        "—"
                      ) : (
                        <Price
                          min={row.priceMin}
                          max={row.priceMax ?? row.priceMin}
                          className="font-normal"
                        />
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{row.variantCount}</TableCell>
                    <TableCell className="text-right">
                      <span className="tabular-nums">{row.stockAvailable}</span>
                      {row.lowStock && (
                        <Badge variant="destructive" className="ml-2">
                          Menipis
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <ActiveSwitch id={row.id} name={row.name} active={row.isActive} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/admin/products/${row.id}`}
                          className={buttonVariants({ variant: "ghost", size: "icon" })}
                          aria-label={`Ubah ${row.name}`}
                          title="Ubah produk"
                        >
                          <PencilIcon />
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-expanded={open}
                          aria-controls={`variants-${row.id}`}
                          aria-label={`${open ? "Tutup" : "Lihat"} varian & stok ${row.name}`}
                          title={open ? "Tutup varian" : "Lihat varian & ubah stok"}
                          onClick={() => toggle(row.id)}
                        >
                          {open ? <ChevronDownIcon /> : <ChevronRightIcon />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {open && (
                    <TableRow id={`variants-${row.id}`} className="bg-muted/30 hover:bg-muted/30">
                      <TableCell colSpan={COLUMN_COUNT} className="p-3">
                        <VariantStockRows variants={row.variants} />
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function ActiveSwitch({ id, name, active }: { id: string; name: string; active: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <Switch
      checked={active}
      disabled={pending}
      aria-label={`Tampilkan ${name} di toko`}
      onCheckedChange={(checked) =>
        startTransition(async () => {
          const result = await setProductActive(id, checked);
          if (result.status === "error") toast.error(result.message);
          else toast.success(result.message);
        })
      }
    />
  );
}
