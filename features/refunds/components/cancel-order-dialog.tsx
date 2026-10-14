"use client";

import { XCircleIcon } from "lucide-react";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import type { ActionState } from "@/lib/action-state";

import { CANCEL_REASONS } from "../schemas";

const OTHER = "__other";

type CancelOrderDialogProps = {
  orderId: string;
  total: string;
  /** Admin boleh memilih tidak mengembalikan stok (barang rusak). */
  admin?: boolean;
  action: (orderId: string, input: { reason: string; restock: boolean }) => Promise<ActionState>;
  size?: "sm" | "default";
};

/** Batalkan pesanan lunas → refund penuh. Dipakai admin & pembeli. */
export function CancelOrderDialog({
  orderId,
  total,
  admin = false,
  action,
  size = "default",
}: CancelOrderDialogProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState<string>(CANCEL_REASONS[0]);
  const [other, setOther] = useState("");
  const [restock, setRestock] = useState(true);
  const [pending, startTransition] = useTransition();

  const reason = choice === OTHER ? other.trim() : choice;

  function submit() {
    startTransition(async () => {
      const result = await action(orderId, { reason, restock });
      if (result.status === "error") {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      setOpen(false);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!pending) setOpen(next);
      }}
    >
      <DialogTrigger render={<Button variant="outline" size={size} className="text-destructive" />}>
        <XCircleIcon />
        {admin ? "Batalkan & refund" : "Batalkan pesanan"}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{admin ? "Batalkan pesanan & refund?" : "Batalkan pesanan?"}</DialogTitle>
          <DialogDescription>
            Pengiriman dibatalkan dan dana {total} dikembalikan penuh lewat transfer bank.
            {admin
              ? " Pembeli diminta mengisi data rekening."
              : " Setelah dibatalkan, isi data rekening agar refund bisa diproses."}
          </DialogDescription>
        </DialogHeader>

        <Field>
          <FieldLabel id={`${id}-reason`}>Alasan</FieldLabel>
          <RadioGroup
            aria-labelledby={`${id}-reason`}
            value={choice}
            onValueChange={(value) => setChoice(String(value))}
            className="gap-2"
          >
            {[...CANCEL_REASONS, OTHER].map((value) => (
              <label key={value} className="flex cursor-pointer items-center gap-2 text-sm">
                <RadioGroupItem value={value} />
                {value === OTHER ? "Lainnya" : value}
              </label>
            ))}
          </RadioGroup>
          {choice === OTHER && (
            <Textarea
              aria-label="Alasan lainnya"
              value={other}
              onChange={(e) => setOther(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Tulis alasan pembatalan"
              autoFocus
            />
          )}
        </Field>

        {admin && (
          <Field orientation="horizontal">
            <Checkbox
              id={`${id}-restock`}
              checked={restock}
              onCheckedChange={(checked) => setRestock(checked === true)}
            />
            <div>
              <FieldLabel htmlFor={`${id}-restock`}>Kembalikan stok</FieldLabel>
              <FieldDescription>
                Matikan bila barang rusak dan tidak bisa dijual lagi.
              </FieldDescription>
            </div>
          </Field>
        )}

        <DialogFooter>
          <Button variant="outline" disabled={pending} onClick={() => setOpen(false)}>
            Kembali
          </Button>
          <Button variant="destructive" disabled={pending || reason.length < 3} onClick={submit}>
            {pending && <Spinner />}
            {admin ? "Batalkan & refund" : "Batalkan pesanan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
