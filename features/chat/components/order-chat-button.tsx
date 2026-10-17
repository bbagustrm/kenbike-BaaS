"use client";

import { MessageCircleIcon } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

import { adminOpenOrderConversation, openOrderConversation } from "../actions";

/** Buka chat untuk pesanan ini (dibuat bila belum ada). `admin` → inbox admin. */
export function OrderChatButton({
  orderId,
  admin = false,
  size = "default",
}: {
  orderId: string;
  admin?: boolean;
  size?: "default" | "sm";
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      size={size}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          // Sukses → redirect di server; yang kembali ke sini hanya error.
          const result = await (admin ? adminOpenOrderConversation : openOrderConversation)(
            orderId,
          );
          if (result?.status === "error") toast.error(result.message);
        })
      }
    >
      {pending ? <Spinner /> : <MessageCircleIcon />}
      {admin ? "Chat pembeli" : "Tanya soal pesanan"}
    </Button>
  );
}
