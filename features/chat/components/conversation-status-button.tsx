"use client";

import { CheckCheckIcon, RotateCcwIcon } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

import { setConversationStatus } from "../actions";
import type { ConversationStatus } from "../schemas";

/** Admin: tandai selesai / buka kembali percakapan. */
export function ConversationStatusButton({
  conversationId,
  status,
}: {
  conversationId: string;
  status: ConversationStatus;
}) {
  const [pending, startTransition] = useTransition();
  const next = status === "open" ? "closed" : "open";
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await setConversationStatus(conversationId, next);
          if (result.status === "error") toast.error(result.message);
          else toast.success(result.message);
        })
      }
    >
      {pending ? <Spinner /> : next === "closed" ? <CheckCheckIcon /> : <RotateCcwIcon />}
      {next === "closed" ? "Tandai selesai" : "Buka kembali"}
    </Button>
  );
}
