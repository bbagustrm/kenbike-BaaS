"use client";

import { RotateCcwIcon } from "lucide-react";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { buyAgain } from "@/features/cart";

export function BuyAgainButton({ orderNumber }: { orderNumber: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() => startTransition(async () => void (await buyAgain(orderNumber)))}
    >
      {pending ? <Spinner /> : <RotateCcwIcon />}
      Beli lagi
    </Button>
  );
}
