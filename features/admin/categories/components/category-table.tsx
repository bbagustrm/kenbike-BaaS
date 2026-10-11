"use client";

import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { deleteCategory } from "../actions";
import { CategoryDialog } from "./category-dialog";
import type { AdminCategory } from "../queries";

export function AddCategoryButton({ parents }: { parents: Pick<AdminCategory, "id" | "name">[] }) {
  return (
    <CategoryDialog
      parents={parents}
      trigger={<Button />}
      triggerLabel={
        <>
          <PlusIcon />
          Tambah kategori
        </>
      }
    />
  );
}

export function CategoryTable({ rows }: { rows: (AdminCategory & { depth: number })[] }) {
  const roots = rows.filter((r) => r.depth === 0);

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nama</TableHead>
            <TableHead>Slug</TableHead>
            <TableHead className="text-right">Produk</TableHead>
            <TableHead className="text-right">Urutan</TableHead>
            <TableHead className="w-24">
              <span className="sr-only">Aksi</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className={row.depth ? "pl-8" : "font-medium"}>
                {row.depth > 0 && <span className="mr-1 text-muted-foreground">↳</span>}
                {row.name}
              </TableCell>
              <TableCell>
                <Badge variant="secondary" className="font-mono">
                  {row.slug}
                </Badge>
              </TableCell>
              <TableCell className="text-right tabular-nums">{row.productCount}</TableCell>
              <TableCell className="text-right tabular-nums">{row.sortOrder}</TableCell>
              <TableCell>
                <div className="flex justify-end gap-1">
                  <CategoryDialog
                    category={row}
                    parents={roots.filter((r) => r.id !== row.id)}
                    trigger={<Button variant="ghost" size="icon" aria-label={`Ubah ${row.name}`} />}
                    triggerLabel={<PencilIcon />}
                  />
                  <ConfirmDialog
                    trigger={
                      <Button variant="ghost" size="icon" aria-label={`Hapus ${row.name}`} />
                    }
                    triggerLabel={<Trash2Icon />}
                    title={`Hapus kategori "${row.name}"?`}
                    description="Kategori yang masih punya produk atau sub-kategori tidak bisa dihapus."
                    confirmLabel="Hapus"
                    destructive
                    onConfirm={() => deleteCategory(row.id)}
                  />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
