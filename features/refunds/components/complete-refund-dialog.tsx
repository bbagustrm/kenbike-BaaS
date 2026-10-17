"use client";

import { CheckCircle2Icon } from "lucide-react";
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
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";

import { completeRefund } from "../actions";
import { PROOF_TYPES, REFUND_PROOF_BUCKET, refundProofPath, validateProofFile } from "../schemas";

/**
 * Admin: tandai refund selesai. Bukti diunggah langsung dari browser ke bucket
 * privat (policy admin), lalu path-nya dicatat lewat Server Action.
 */
export function CompleteRefundDialog({
  orderId,
  hasAccount,
}: {
  orderId: string;
  hasAccount: boolean;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(form: HTMLFormElement) {
    const data = new FormData(form);
    const file = data.get("proof");
    const note = String(data.get("note") ?? "");
    const proof = file instanceof File && file.size > 0 ? file : null;

    if (proof) {
      const invalid = validateProofFile(proof);
      if (invalid) return void toast.error(invalid);
    } else if (!note.trim()) {
      return void toast.error("Unggah bukti transfer atau tulis catatan.");
    }

    startTransition(async () => {
      let proofPath: string | null = null;
      if (proof) {
        const ext = PROOF_TYPES[proof.type as keyof typeof PROOF_TYPES];
        proofPath = refundProofPath(orderId, crypto.randomUUID(), ext);
        const { error } = await createClient()
          .storage.from(REFUND_PROOF_BUCKET)
          .upload(proofPath, proof, { contentType: proof.type, upsert: false });
        if (error) return void toast.error(`Gagal mengunggah bukti: ${error.message}`);
      }

      const result = await completeRefund(orderId, { proofPath, note });
      if (result.status === "error") return void toast.error(result.message);
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
      <DialogTrigger
        render={
          <Button
            size="sm"
            disabled={!hasAccount}
            title={hasAccount ? undefined : "Rekening tujuan belum diisi"}
          />
        }
      >
        <CheckCircle2Icon />
        Selesaikan refund
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form
          key={String(open)}
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            submit(event.currentTarget);
          }}
        >
          <DialogHeader>
            <DialogTitle>Selesaikan refund</DialogTitle>
            <DialogDescription>
              Transfer dana ke rekening pembeli di luar sistem, lalu unggah bukti transfernya (atau
              tulis catatan).
            </DialogDescription>
          </DialogHeader>
          <FieldGroup className="gap-3">
            <Field>
              <FieldLabel htmlFor={`${id}-proof`}>Bukti transfer</FieldLabel>
              <Input
                id={`${id}-proof`}
                name="proof"
                type="file"
                accept={Object.keys(PROOF_TYPES).join(",")}
              />
              <FieldDescription>JPG, PNG, WEBP, atau PDF, maks. 5 MB.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor={`${id}-note`}>Catatan</FieldLabel>
              <Textarea
                id={`${id}-note`}
                name="note"
                rows={3}
                maxLength={1000}
                placeholder="mis. Transfer BCA 14 Okt, ref. 123456"
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Spinner />}
              Tandai selesai
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
