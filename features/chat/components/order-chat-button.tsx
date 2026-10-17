"use client";

import { MessageCircleIcon } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

import { openOrderConversation } from "../actions";

/** Pembeli: buka chat untuk pesanan ini (dibuat bila belum ada). */
export function OrderChatButton({ orderId }: { orderId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await openOrderConversation(orderId);
          if (result?.status === "error") toast.error(result.message);
        })
      }
    >
      {pending ? <Spinner /> : <MessageCircleIcon />}
      Tanya soal pesanan
    </Button>
  );
}
