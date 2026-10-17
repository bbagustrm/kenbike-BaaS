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
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import type { ActionState } from "@/lib/action-state";

import { CANCEL_REASONS, type RefundAccount } from "../schemas";

const OTHER = "__other";

type CancelOrderDialogProps = {
  orderId: string;
  total: string;
  /** Admin boleh memilih tidak mengembalikan stok (barang rusak). */
  admin?: boolean;
  action: (
    orderId: string,
    input: { reason: string; restock: boolean; account?: RefundAccount },
  ) => Promise<ActionState>;
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

  function submit(form: HTMLFormElement) {
    const data = new FormData(form);
    // Pembeli wajib mengisi rekening tujuan refund; admin tidak (diisi pembeli/dari chat).
    const account = admin
      ? undefined
      : {
          bankName: String(data.get("bankName") ?? ""),
          accountNumber: String(data.get("accountNumber") ?? ""),
          accountHolder: String(data.get("accountHolder") ?? ""),
        };
    startTransition(async () => {
      const result = await action(orderId, { reason, restock, account });
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
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <form
          key={String(open)}
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            submit(event.currentTarget);
          }}
        >
          <DialogHeader>
            <DialogTitle>{admin ? "Batalkan pesanan & refund?" : "Batalkan pesanan?"}</DialogTitle>
            <DialogDescription>
              Pengiriman dibatalkan dan dana {total} dikembalikan penuh lewat transfer manual ke
              rekening {admin ? "pembeli" : "kamu"}.
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

          {!admin && (
            <FieldGroup className="gap-3">
              <p className="text-sm font-medium">Rekening tujuan refund</p>
              <Field>
                <FieldLabel htmlFor={`${id}-bank`}>Bank / e-wallet</FieldLabel>
                <Input
                  id={`${id}-bank`}
                  name="bankName"
                  required
                  maxLength={50}
                  placeholder="mis. BCA, Mandiri, DANA"
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
                />
                <FieldDescription>
                  Pastikan benar; dana ditransfer ke rekening ini.
                </FieldDescription>
              </Field>
            </FieldGroup>
          )}

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
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              Kembali
            </Button>
            <Button type="submit" variant="destructive" disabled={pending || reason.length < 3}>
              {pending && <Spinner />}
              {admin ? "Batalkan & refund" : "Batalkan pesanan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
