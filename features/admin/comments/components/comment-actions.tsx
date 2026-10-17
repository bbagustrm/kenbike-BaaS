"use client";

import { EyeIcon, EyeOffIcon, ReplyIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { MAX_COMMENT_LENGTH } from "@/features/comments/types";

import { adminReplyComment, deleteComment, setCommentHidden } from "../actions";

/** Sembunyikan/tampilkan + hapus untuk satu komentar atau balasan. */
export function CommentModeration({
  commentId,
  hidden,
  isReply = false,
}: {
  commentId: string;
  hidden: boolean;
  isReply?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex gap-1">
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await setCommentHidden(commentId, !hidden);
            if (result.status === "error") toast.error(result.message);
            else toast.success(result.message);
          })
        }
      >
        {pending ? <Spinner /> : hidden ? <EyeIcon /> : <EyeOffIcon />}
        {hidden ? "Tampilkan" : "Sembunyikan"}
      </Button>
      <ConfirmDialog
        trigger={<Button variant="ghost" size="sm" className="text-destructive" />}
        triggerLabel="Hapus"
        title={isReply ? "Hapus balasan ini?" : "Hapus komentar ini?"}
        description={
          isReply
            ? "Balasan dihapus permanen."
            : "Komentar beserta semua balasannya dihapus permanen. Pilih Sembunyikan bila hanya ingin menutupnya dari publik."
        }
        confirmLabel="Hapus"
        destructive
        onConfirm={() => deleteComment(commentId)}
      />
    </div>
  );
}

/** Form balasan admin (tampil dengan badge Admin di halaman produk). */
export function AdminReplyForm({ productId, commentId }: { productId: string; commentId: string }) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <ReplyIcon />
        Balas
      </Button>
    );
  }

  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const result = await adminReplyComment(productId, commentId, body);
          if (result.status === "error") return void toast.error(result.message);
          toast.success(result.message);
          setBody("");
          setOpen(false);
        });
      }}
    >
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        aria-label="Balasan admin"
        placeholder="Tulis jawaban…"
        maxLength={MAX_COMMENT_LENGTH}
        rows={2}
        autoFocus
        disabled={pending}
      />
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setOpen(false)}
          disabled={pending}
        >
          Batal
        </Button>
        <Button type="submit" size="sm" disabled={pending || !body.trim()}>
          {pending && <Spinner />}
          Kirim balasan
        </Button>
      </div>
    </form>
  );
}
