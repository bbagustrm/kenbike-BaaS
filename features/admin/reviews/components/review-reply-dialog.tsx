"use client";

import { MessageSquareReplyIcon } from "lucide-react";
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
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { MAX_REVIEW_LENGTH } from "@/features/reviews/schemas";

import { replyReview } from "../actions";

/** Balas / ubah balasan ulasan. Mengosongkan teks menghapus balasan. */
export function ReviewReplyDialog({
  reviewId,
  reviewerName,
  initial,
}: {
  reviewId: string;
  reviewerName: string;
  initial: string | null;
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
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <MessageSquareReplyIcon />
        {initial ? "Ubah balasan" : "Balas"}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form
          key={String(open)}
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const reply = String(new FormData(event.currentTarget).get("reply") ?? "");
            startTransition(async () => {
              const result = await replyReview(reviewId, reply);
              if (result.status === "error") return void toast.error(result.message);
              toast.success(result.message);
              setOpen(false);
            });
          }}
        >
          <DialogHeader>
            <DialogTitle>Balas ulasan {reviewerName}</DialogTitle>
            <DialogDescription>
              Balasan tampil di bawah ulasan dengan badge Admin. Kosongkan untuk menghapus balasan.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            id={`${id}-reply`}
            name="reply"
            aria-label="Balasan"
            rows={4}
            maxLength={MAX_REVIEW_LENGTH}
            defaultValue={initial ?? ""}
            placeholder="Terima kasih kak, selamat gowes! 🚴"
            autoFocus
          />
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
