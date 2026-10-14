"use client";

import { FileTextIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

import { useDownload } from "../download";

/** Tombol unduh invoice PDF. `admin` memakai endpoint admin (pesanan siapa pun). */
export function InvoiceButton({
  orderNumber,
  admin = false,
  size = "default",
}: {
  orderNumber: string;
  admin?: boolean;
  size?: "default" | "sm";
}) {
  const { pending, download } = useDownload();
  const base = admin ? "/api/admin/orders" : "/api/orders";
  return (
    <Button
      variant="outline"
      size={size}
      disabled={pending}
      onClick={() =>
        download(`${base}/${encodeURIComponent(orderNumber)}/invoice`, `Invoice-${orderNumber}.pdf`)
      }
    >
      {pending ? <Spinner /> : <FileTextIcon />}
      Unduh invoice
    </Button>
  );
}
