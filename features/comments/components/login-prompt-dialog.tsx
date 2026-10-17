"use client";

import { LogInIcon } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** Tamu yang ingin berkomentar: ajak masuk lalu kembali ke produk. */
export function LoginPromptDialog({
  open,
  onOpenChange,
  next,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  next: string;
}) {
  const query = `?next=${encodeURIComponent(next)}`;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Masuk untuk berkomentar</DialogTitle>
          <DialogDescription>
            Punya pertanyaan soal produk ini? Masuk atau daftar dulu, lalu kamu akan kembali ke
            halaman ini.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Link href={`/register${query}`} className={buttonVariants({ variant: "outline" })}>
            Daftar
          </Link>
          <Link href={`/login${query}`} className={buttonVariants()}>
            <LogInIcon />
            Masuk
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
