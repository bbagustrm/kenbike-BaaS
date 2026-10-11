"use client";

import { PencilIcon } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";

import { Price } from "@/components/shared/price";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProductImage } from "@/features/catalog";

import { setProductActive } from "../actions";
import type { AdminProductRow } from "../queries";

export function ProductTable({ rows }: { rows: AdminProductRow[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-14">
              <span className="sr-only">Foto</span>
            </TableHead>
            <TableHead>Produk</TableHead>
            <TableHead>Kategori</TableHead>
            <TableHead className="text-right">Harga</TableHead>
            <TableHead className="text-right">Varian</TableHead>
            <TableHead className="text-right">Stok tersedia</TableHead>
            <TableHead>Aktif</TableHead>
            <TableHead className="w-12">
              <span className="sr-only">Aksi</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                <ProductImage
                  path={row.imagePath}
                  alt={row.name}
                  sizes="48px"
                  className="size-10"
                />
              </TableCell>
              <TableCell>
                <Link href={`/admin/products/${row.id}`} className="font-medium hover:underline">
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
                <Link
                  href={`/admin/products/${row.id}`}
                  className={buttonVariants({ variant: "ghost", size: "icon" })}
                  aria-label={`Ubah ${row.name}`}
                >
                  <PencilIcon />
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
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
