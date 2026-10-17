"use client";

import { StarIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

import { type ReviewableOrder, ReviewFormDialog } from "./review-form-dialog";

/** Tombol "Beri ulasan" di detail pesanan delivered yang belum diulas. */
export function ReviewOrderButton({ order, userId }: { order: ReviewableOrder; userId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <StarIcon />
        Beri ulasan
      </Button>
      <ReviewFormDialog order={order} userId={userId} open={open} onOpenChange={setOpen} />
    </>
  );
}
