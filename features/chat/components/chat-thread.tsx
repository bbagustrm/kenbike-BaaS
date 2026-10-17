"use client";

import { FileTextIcon, PaperclipIcon, SendHorizontalIcon, XIcon } from "lucide-react";
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

import { loadOlderMessages, markConversationRead, sendChatMessage } from "../actions";
import {
  type Attachment,
  ATTACHMENT_TYPES,
  attachmentPath,
  CHAT_BUCKET,
  type ChatMessage,
  MAX_ATTACHMENTS,
  MAX_MESSAGE_LENGTH,
  toChatMessage,
  validateAttachmentFile,
} from "../schemas";
import { useAttachmentUrls } from "./use-attachment-urls";

type ChatThreadProps = {
  conversationId: string;
  /** Sisi yang sedang melihat: pesannya tampil di kanan. */
  viewer: "admin" | "customer";
  initialMessages: ChatMessage[];
  initialHasMore: boolean;
  /** Nama yang ditampilkan untuk pesan pembeli (sisi admin). */
  customerName?: string | null;
  className?: string;
};

/** Thread chat realtime + composer (teks & lampiran). Dipakai admin & pembeli. */
export function ChatThread({
  conversationId,
  viewer,
  initialMessages,
  initialHasMore,
  customerName,
  className,
}: ChatThreadProps) {
  const [messages, setMessages] = useState(initialMessages);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  const add = useCallback((incoming: ChatMessage) => {
    setMessages((prev) =>
      prev.some((m) => m.id === incoming.id)
        ? prev
        : [...prev, incoming].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    );
  }, []);

  const markRead = useEffectEvent(() => {
    if (document.visibilityState === "visible") void markConversationRead(conversationId);
  });

  // Pesan baru (dari pihak lain atau tab lain) lewat Supabase Realtime; RLS menyaring penerima.
  useEffect(() => {
    markRead();
    const supabase = createClient();
    const channel = supabase
      .channel(`chat:${conversationId}:${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const message = toChatMessage(payload.new as Parameters<typeof toChatMessage>[0]);
          add(message);
          if (message.senderRole !== viewer) markRead();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, viewer, add]);

  // Tetap di bawah saat pesan baru masuk, kecuali pengguna sedang membaca pesan lama.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function loadOlder() {
    const first = messages[0];
    if (!first || loadingOlder) return;
    setLoadingOlder(true);
    const el = scrollRef.current;
    const prevHeight = el?.scrollHeight ?? 0;
    const result = await loadOlderMessages(conversationId, first.createdAt);
    stickToBottom.current = false;
    setMessages((prev) => [
      ...result.messages.filter((m) => !prev.some((p) => p.id === m.id)),
      ...prev,
    ]);
    setHasMore(result.hasMore);
    setLoadingOlder(false);
    // Pertahankan posisi baca setelah pesan lama disisipkan di atas.
    requestAnimationFrame(() => {
      if (el) el.scrollTop = el.scrollHeight - prevHeight;
    });
  }

  const paths = useMemo(
    () => messages.flatMap((m) => m.attachments.map((a) => a.path)),
    [messages],
  );
  const urls = useAttachmentUrls(paths);

  return (
    <div className={cn("flex min-h-0 flex-col rounded-xl border bg-card", className)}>
      <div
        ref={scrollRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4"
        role="log"
        aria-live="polite"
        aria-label="Pesan"
      >
        {hasMore && (
          <div className="text-center">
            <Button variant="ghost" size="sm" onClick={loadOlder} disabled={loadingOlder}>
              {loadingOlder && <Spinner />}
              Muat pesan sebelumnya
            </Button>
          </div>
        )}
        {messages.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">Belum ada pesan.</p>
        )}
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            viewer={viewer}
            customerName={customerName}
            urls={urls}
          />
        ))}
      </div>
      <Composer
        conversationId={conversationId}
        onSent={(message) => {
          stickToBottom.current = true;
          add(message);
        }}
      />
    </div>
  );
}

function MessageBubble({
  message,
  viewer,
  customerName,
  urls,
}: {
  message: ChatMessage;
  viewer: "admin" | "customer";
  customerName?: string | null;
  urls: Record<string, string>;
}) {
  if (message.senderRole === "system") {
    return (
      <div className="mx-auto max-w-md rounded-lg bg-muted px-3 py-2 text-center text-xs text-muted-foreground">
        <p className="whitespace-pre-line">{message.body}</p>
        <p className="mt-1 opacity-70">{formatDateTime(message.createdAt)}</p>
      </div>
    );
  }

  const mine = message.senderRole === viewer;
  const name =
    message.senderRole === "admin"
      ? viewer === "admin"
        ? "Admin"
        : "KenBike"
      : (customerName ?? "Pembeli");

  return (
    <div className={cn("flex flex-col gap-1", mine ? "items-end" : "items-start")}>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {!mine && <span className="font-medium text-foreground">{name}</span>}
        {message.senderRole === "admin" && (
          <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
            Admin
          </Badge>
        )}
        <time dateTime={message.createdAt}>{formatDateTime(message.createdAt)}</time>
      </div>
      <div
        className={cn(
          "max-w-[85%] space-y-2 rounded-2xl px-3 py-2 text-sm sm:max-w-[70%]",
          mine ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-muted",
        )}
      >
        {message.body && <p className="break-words whitespace-pre-line">{message.body}</p>}
        {message.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {message.attachments.map((a) => (
              <AttachmentPreview key={a.path} attachment={a} url={urls[a.path]} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AttachmentPreview({ attachment, url }: { attachment: Attachment; url?: string }) {
  if (url === undefined) {
    return <div className="size-24 animate-pulse rounded-lg bg-background/40" />;
  }
  if (url === "") {
    return (
      <span className="flex items-center gap-1.5 rounded-lg bg-background/60 px-2 py-1.5 text-xs text-muted-foreground">
        <FileTextIcon className="size-4 shrink-0" />
        <span className="max-w-40 truncate">{attachment.name}</span> · tidak tersedia
      </span>
    );
  }
  if (attachment.type === "application/pdf") {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 rounded-lg bg-background/80 px-2 py-1.5 text-xs text-foreground underline-offset-4 hover:underline"
      >
        <FileTextIcon className="size-4 shrink-0" />
        <span className="max-w-40 truncate">{attachment.name}</span>
      </a>
    );
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="block">
      {/* Signed URL bucket privat: tidak lewat next/image (remotePatterns hanya bucket publik). */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={attachment.name}
        className="size-24 rounded-lg object-cover sm:size-32"
        loading="lazy"
      />
    </a>
  );
}

function Composer({
  conversationId,
  onSent,
}: {
  conversationId: string;
  onSent: (message: ChatMessage) => void;
}) {
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [pending, startTransition] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);

  function pickFiles(list: FileList | null) {
    if (!list) return;
    const picked = [...files, ...Array.from(list)];
    const invalid = picked.map(validateAttachmentFile).find(Boolean);
    if (invalid) return void toast.error(invalid);
    if (picked.length > MAX_ATTACHMENTS) {
      return void toast.error(`Maksimal ${MAX_ATTACHMENTS} lampiran per pesan.`);
    }
    setFiles(picked);
  }

  function send() {
    const text = body.trim();
    if ((!text && files.length === 0) || pending) return;
    startTransition(async () => {
      const supabase = createClient();
      const attachments: Attachment[] = [];
      for (const file of files) {
        const ext = ATTACHMENT_TYPES[file.type as keyof typeof ATTACHMENT_TYPES];
        const path = attachmentPath(conversationId, crypto.randomUUID(), ext);
        const { error } = await supabase.storage
          .from(CHAT_BUCKET)
          .upload(path, file, { contentType: file.type, upsert: false });
        if (error) return void toast.error(`Gagal mengunggah ${file.name}.`);
        attachments.push({ path, name: file.name.slice(0, 200), type: file.type, size: file.size });
      }

      const result = await sendChatMessage(conversationId, { body: text, attachments });
      if (result.status === "error") return void toast.error(result.message);
      setBody("");
      setFiles([]);
      onSent(result.message);
    });
  }

  return (
    <form
      className="space-y-2 border-t p-3"
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
    >
      {files.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {files.map((file, i) => (
            <li
              key={`${file.name}-${i}`}
              className="flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs"
            >
              <span className="max-w-40 truncate">{file.name}</span>
              <button
                type="button"
                aria-label={`Hapus ${file.name}`}
                onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                className="rounded-sm opacity-70 hover:opacity-100"
              >
                <XIcon className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-end gap-2">
        <input
          ref={fileInput}
          type="file"
          multiple
          accept={Object.keys(ATTACHMENT_TYPES).join(",")}
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            pickFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Lampirkan file"
          disabled={pending}
          onClick={() => fileInput.current?.click()}
        >
          <PaperclipIcon />
        </Button>
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Tulis pesan…"
          title="Enter untuk kirim, Shift+Enter untuk baris baru"
          aria-label="Tulis pesan"
          maxLength={MAX_MESSAGE_LENGTH}
          rows={1}
          className="max-h-40 min-h-9 flex-1 resize-none"
        />
        <Button
          type="submit"
          size="icon"
          aria-label="Kirim"
          disabled={pending || (!body.trim() && files.length === 0)}
        >
          {pending ? <Spinner /> : <SendHorizontalIcon />}
        </Button>
      </div>
    </form>
  );
}
