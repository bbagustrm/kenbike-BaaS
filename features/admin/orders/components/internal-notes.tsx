"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/format";

import { addInternalNote } from "../actions";

type Note = { id: string; note: string; adminName: string | null; createdAt: string };

/** Catatan internal admin (tidak terlihat pembeli, tidak bisa diubah). */
export function InternalNotes({ orderId, notes }: { orderId: string; notes: Note[] }) {
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await addInternalNote(orderId, text);
      if (result.status === "error") {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      setText("");
    });
  };

  return (
    <div className="space-y-4">
      {notes.length === 0 ? (
        <p className="text-sm text-muted-foreground">Belum ada catatan.</p>
      ) : (
        <ul className="space-y-3">
          {notes.map((n) => (
            <li key={n.id} className="rounded-lg bg-muted/50 p-3 text-sm">
              <p className="whitespace-pre-wrap">{n.note}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {n.adminName ?? "Admin"} · {formatDateTime(n.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={submit} className="space-y-2">
        <Textarea
          aria-label="Catatan baru"
          placeholder="mis. Sudah refund via dashboard Midtrans, ID refund …"
          rows={3}
          maxLength={2000}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <Button type="submit" size="sm" disabled={pending || !text.trim()}>
          {pending && <Spinner />}
          Tambah catatan
        </Button>
      </form>
    </div>
  );
}
