"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import { adjustStock } from "../actions";
import { LOW_STOCK_THRESHOLD } from "../constants";
import type { AdminVariantStock } from "../queries";

export function StockPanel({ stock }: { stock: AdminVariantStock[] }) {
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Varian</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="text-right">Fisik</TableHead>
              <TableHead className="text-right">Dipesan</TableHead>
              <TableHead className="text-right">Tersedia</TableHead>
              <TableHead className="w-28">
                <span className="sr-only">Aksi</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stock.map((row) => (
              <TableRow key={row.variantId} className={row.isActive ? undefined : "opacity-60"}>
                <TableCell className="font-medium">
                  {row.label}
                  {!row.isActive && (
                    <Badge variant="outline" className="ml-2">
                      Nonaktif
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="font-mono text-xs">{row.sku}</TableCell>
                <TableCell className="text-right tabular-nums">{row.quantity}</TableCell>
                <TableCell className="text-right tabular-nums">{row.reserved}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.available}
                  {row.isActive && row.available <= LOW_STOCK_THRESHOLD && (
                    <Badge variant="destructive" className="ml-2">
                      {row.available === 0 ? "Habis" : "Menipis"}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <AdjustStockDialog row={row} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">
        <strong>Dipesan</strong> = ditahan untuk pesanan yang belum dibayar (maks. 24 jam). Tersedia
        = fisik − dipesan.
      </p>
    </div>
  );
}

function AdjustStockDialog({ row }: { row: AdminVariantStock }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"add" | "remove">("add");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [pending, startTransition] = useTransition();

  const reset = () => {
    setMode("add");
    setAmount("");
    setReason("");
    setErrors({});
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number.parseInt(amount, 10);
    if (!Number.isFinite(n) || n <= 0) {
      setErrors({ delta: ["Isi jumlah lebih dari 0"] });
      return;
    }
    startTransition(async () => {
      const result = await adjustStock({
        variantId: row.variantId,
        delta: mode === "add" ? n : -n,
        reason,
      });
      if (result.status === "error") {
        setErrors(result.fieldErrors ?? {});
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      setOpen(false);
      reset();
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger render={<Button variant="outline" size="sm" />}>Sesuaikan</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sesuaikan stok</DialogTitle>
          <DialogDescription>
            {row.label} · {row.sku} · stok fisik saat ini {row.quantity}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate>
          <FieldGroup>
            <ToggleGroup
              value={[mode]}
              onValueChange={(v) => v[0] && setMode(v[0] as "add" | "remove")}
              variant="outline"
              aria-label="Jenis penyesuaian"
            >
              <ToggleGroupItem value="add">Tambah</ToggleGroupItem>
              <ToggleGroupItem value="remove">Kurangi</ToggleGroupItem>
            </ToggleGroup>
            <Field data-invalid={errors.delta ? true : undefined}>
              <FieldLabel htmlFor={`amount-${row.variantId}`}>Jumlah</FieldLabel>
              <Input
                id={`amount-${row.variantId}`}
                type="number"
                min={1}
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                aria-invalid={errors.delta ? true : undefined}
              />
              <FieldError>{errors.delta?.[0]}</FieldError>
            </Field>
            <Field data-invalid={errors.reason ? true : undefined}>
              <FieldLabel htmlFor={`reason-${row.variantId}`}>Alasan</FieldLabel>
              <Input
                id={`reason-${row.variantId}`}
                placeholder="mis. Restock dari supplier, barang rusak"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                aria-invalid={errors.reason ? true : undefined}
              />
              <FieldError>{errors.reason?.[0]}</FieldError>
            </Field>
            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {pending && <Spinner />}
                Simpan
              </Button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
