"use client";

import { MessageCircleIcon, ReplyIcon } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

import { postComment } from "../actions";
import { fetchProductComments } from "../fetch";
import {
  type CommentCursor,
  type CommentReply,
  MAX_COMMENT_LENGTH,
  type ProductComment,
} from "../types";
import { LoginPromptDialog } from "./login-prompt-dialog";

type ListState = {
  comments: ProductComment[];
  next: CommentCursor | null;
  status: "loading" | "idle" | "done" | "error";
};

/**
 * Isi section Komentar. Dirender hanya saat panel accordion dibuka, jadi
 * komentar baru diambil saat itu (5 per muat, infinite scroll).
 */
export function ProductComments({
  productId,
  productPath,
}: {
  productId: string;
  productPath: string;
}) {
  const [state, setState] = useState<ListState>({ comments: [], next: null, status: "loading" });
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const loadingMore = useRef(false);

  // Status login hanya untuk UI (form vs ajakan masuk); server tetap memeriksa.
  useEffect(() => {
    let cancelled = false;
    createClient()
      .auth.getSession()
      .then(({ data }) => !cancelled && setSignedIn(Boolean(data.session)));
    return () => {
      cancelled = true;
    };
  }, []);

  // Halaman pertama.
  useEffect(() => {
    let cancelled = false;
    fetchProductComments(productId, null)
      .then((page) => {
        if (cancelled) return;
        setState({ comments: page.comments, next: page.next, status: page.next ? "idle" : "done" });
      })
      .catch(() => !cancelled && setState((s) => ({ ...s, status: "error" })));
    return () => {
      cancelled = true;
    };
  }, [productId]);

  // Infinite scroll: muat 5 berikutnya saat penanda di bawah daftar terlihat.
  useEffect(() => {
    const el = sentinel.current;
    if (!el || state.status !== "idle" || !state.next) return;
    const cursor = state.next;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || loadingMore.current) return;
        loadingMore.current = true;
        setState((s) => ({ ...s, status: "loading" }));
        fetchProductComments(productId, cursor)
          .then((page) =>
            setState((s) => ({
              comments: [
                ...s.comments,
                ...page.comments.filter((c) => !s.comments.some((x) => x.id === c.id)),
              ],
              next: page.next,
              status: page.next ? "idle" : "done",
            })),
          )
          .catch(() => setState((s) => ({ ...s, status: "error" })))
          .finally(() => {
            loadingMore.current = false;
          });
      },
      { rootMargin: "300px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [state.status, state.next, productId]);

  // Hanya bila pasti tamu; saat status belum diketahui, server yang menolak (needsLogin).
  const requireLogin = () => {
    if (signedIn !== false) return false;
    setLoginOpen(true);
    return true;
  };

  return (
    <div className="space-y-6">
      <CommentComposer
        productId={productId}
        placeholder="Tanya soal produk ini…"
        onFocusGuest={requireLogin}
        onNeedsLogin={() => setLoginOpen(true)}
        onPosted={(comment) =>
          setState((s) => ({ ...s, comments: [{ ...comment, replies: [] }, ...s.comments] }))
        }
      />

      {state.status !== "loading" && state.comments.length === 0 && state.status !== "error" && (
        <div className="flex flex-col items-center gap-2 py-4 text-center text-muted-foreground">
          <MessageCircleIcon className="size-8" aria-hidden="true" />
          <p>Belum ada komentar. Jadilah yang pertama bertanya!</p>
        </div>
      )}

      <ul className="divide-y">
        {state.comments.map((comment) => (
          <li key={comment.id} className="space-y-3 py-4 first:pt-0">
            <CommentBody comment={comment} />
            {comment.replies.length > 0 && (
              <ul className="ml-4 space-y-3 border-l-2 pl-3 sm:ml-6">
                {comment.replies.map((reply) => (
                  <li key={reply.id}>
                    <CommentBody comment={reply} />
                  </li>
                ))}
              </ul>
            )}
            {replyTo === comment.id ? (
              <div className="ml-4 sm:ml-6">
                <CommentComposer
                  productId={productId}
                  parentId={comment.id}
                  placeholder={`Balas ${comment.authorName}…`}
                  autoFocus
                  onCancel={() => setReplyTo(null)}
                  onFocusGuest={requireLogin}
                  onNeedsLogin={() => setLoginOpen(true)}
                  onPosted={(reply) => {
                    setReplyTo(null);
                    setState((s) => ({
                      ...s,
                      comments: s.comments.map((c) =>
                        c.id === comment.id ? { ...c, replies: [...c.replies, reply] } : c,
                      ),
                    }));
                  }}
                />
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="-ml-2 h-7 text-muted-foreground"
                onClick={() => {
                  if (!requireLogin()) setReplyTo(comment.id);
                }}
              >
                <ReplyIcon />
                Balas
              </Button>
            )}
          </li>
        ))}
      </ul>

      {state.status === "error" && (
        <p className="text-sm text-muted-foreground">
          Gagal memuat komentar. Tutup lalu buka lagi.
        </p>
      )}
      <div ref={sentinel} aria-hidden="true" className="h-px" />
      {state.status === "loading" && (
        <div className="flex justify-center py-2">
          <Spinner />
        </div>
      )}

      <LoginPromptDialog
        open={loginOpen}
        onOpenChange={setLoginOpen}
        next={`${productPath}#komentar`}
      />
    </div>
  );
}

function CommentBody({ comment }: { comment: CommentReply }) {
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium">{comment.authorName}</span>
        {comment.authorIsAdmin && (
          <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
            Admin
          </Badge>
        )}
        {comment.createdAt && (
          <time dateTime={comment.createdAt} className="text-xs text-muted-foreground">
            {formatDateTime(comment.createdAt)}
          </time>
        )}
      </div>
      <p
        className={cn(
          "text-sm break-words whitespace-pre-line",
          comment.authorIsAdmin && "text-foreground",
        )}
      >
        {comment.body}
      </p>
    </div>
  );
}

function CommentComposer({
  productId,
  parentId,
  placeholder,
  autoFocus,
  onCancel,
  onFocusGuest,
  onNeedsLogin,
  onPosted,
}: {
  productId: string;
  parentId?: string;
  placeholder: string;
  autoFocus?: boolean;
  onCancel?: () => void;
  /** Tamu menyentuh kolom → tampilkan ajakan masuk (true = sudah ditangani). */
  onFocusGuest: () => boolean;
  onNeedsLogin: () => void;
  onPosted: (comment: CommentReply) => void;
}) {
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!body.trim() || pending) return;
    startTransition(async () => {
      const result = await postComment(productId, body, parentId);
      if (result.status === "error") {
        if (result.needsLogin) onNeedsLogin();
        else toast.error(result.message);
        return;
      }
      setBody("");
      onPosted(result.comment);
    });
  }

  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onFocus={(e) => {
          if (onFocusGuest()) e.currentTarget.blur();
        }}
        placeholder={placeholder}
        aria-label={placeholder}
        maxLength={MAX_COMMENT_LENGTH}
        rows={parentId ? 2 : 3}
        autoFocus={autoFocus}
        disabled={pending}
      />
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={pending}>
            Batal
          </Button>
        )}
        <Button type="submit" size="sm" disabled={pending || !body.trim()}>
          {pending && <Spinner />}
          {parentId ? "Balas" : "Kirim komentar"}
        </Button>
      </div>
    </form>
  );
}
