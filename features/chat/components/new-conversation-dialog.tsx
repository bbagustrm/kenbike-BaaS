"use client";

import { MessageSquarePlusIcon } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";

import { startConversation } from "../actions";
import { MAX_MESSAGE_LENGTH } from "../schemas";

/** Pembeli: mulai chat umum (mis. tanya stok/ukuran). Sukses → diarahkan ke percakapan. */
export function NewConversationDialog({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const id = useId();
  const [open, setOpen] = useState(defaultOpen);
  const [pending, startTransition] = useTransition();

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!pending) setOpen(next);
      }}
    >
      <DialogTrigger render={<Button />}>
        <MessageSquarePlusIcon />
        Pesan baru
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            startTransition(async () => {
              // Sukses → redirect di server; yang kembali ke sini hanya error.
              const result = await startConversation({
                subject: String(data.get("subject") ?? ""),
                body: String(data.get("body") ?? ""),
              });
              if (result?.status === "error") toast.error(result.message);
            });
          }}
        >
          <DialogHeader>
            <DialogTitle>Kirim pesan ke KenBike</DialogTitle>
            <DialogDescription>
              Tanya stok, ukuran sepeda, atau hal lain. Untuk pertanyaan soal pesanan, buka chat
              dari detail pesanannya.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup className="gap-3">
            <Field>
              <FieldLabel htmlFor={`${id}-subject`}>Topik</FieldLabel>
              <Input
                id={`${id}-subject`}
                name="subject"
                required
                minLength={3}
                maxLength={120}
                placeholder="mis. Ukuran frame untuk tinggi 170 cm"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${id}-body`}>Pesan</FieldLabel>
              <Textarea
                id={`${id}-body`}
                name="body"
                required
                rows={4}
                maxLength={MAX_MESSAGE_LENGTH}
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Spinner />}
              Kirim
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
