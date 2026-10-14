"use client";

import { LandmarkIcon } from "lucide-react";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";

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
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

import { saveRefundAccount } from "../actions";
import type { RefundAccount } from "../schemas";

/** Isi / ubah rekening tujuan refund (pembeli pemilik order atau admin). */
export function RefundAccountDialog({
  orderId,
  initial,
}: {
  orderId: string;
  initial: RefundAccount | null;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!pending) setOpen(next);
      }}
    >
      <DialogTrigger render={<Button variant={initial ? "outline" : "default"} size="sm" />}>
        <LandmarkIcon />
        {initial ? "Ubah rekening" : "Isi data rekening"}
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <form
          key={String(open)}
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            startTransition(async () => {
              const result = await saveRefundAccount(orderId, {
                bankName: String(data.get("bankName") ?? ""),
                accountNumber: String(data.get("accountNumber") ?? ""),
                accountHolder: String(data.get("accountHolder") ?? ""),
              });
              if (result.status === "error") {
                toast.error(result.message);
                return;
              }
              toast.success(result.message);
              setOpen(false);
            });
          }}
        >
          <DialogHeader>
            <DialogTitle>Rekening tujuan refund</DialogTitle>
            <DialogDescription>
              Dana dikembalikan penuh lewat transfer ke rekening ini. Pastikan nama pemilik sesuai.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup className="gap-3">
            <Field>
              <FieldLabel htmlFor={`${id}-bank`}>Bank / e-wallet</FieldLabel>
              <Input
                id={`${id}-bank`}
                name="bankName"
                required
                maxLength={50}
                placeholder="mis. BCA, Mandiri, DANA"
                defaultValue={initial?.bankName}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${id}-number`}>Nomor rekening</FieldLabel>
              <Input
                id={`${id}-number`}
                name="accountNumber"
                required
                inputMode="numeric"
                maxLength={40}
                defaultValue={initial?.accountNumber}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${id}-holder`}>Nama pemilik rekening</FieldLabel>
              <Input
                id={`${id}-holder`}
                name="accountHolder"
                required
                maxLength={100}
                autoComplete="name"
                defaultValue={initial?.accountHolder}
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Spinner />}
              Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
