import { z } from "zod";

import type { Database } from "@/types/database.types";

export type MessageSender = Database["public"]["Enums"]["message_sender"];
export type ConversationStatus = Database["public"]["Enums"]["conversation_status"];

export const CHAT_BUCKET = "chat-attachments";
export const MAX_ATTACHMENTS = 5;
export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
export const MAX_MESSAGE_LENGTH = 4000;
export const MESSAGES_PAGE_SIZE = 40;

export const ATTACHMENT_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
} as const;

export type Attachment = { path: string; name: string; type: string; size: number };

export type ChatMessage = {
  id: string;
  senderRole: MessageSender;
  senderId: string | null;
  body: string;
  attachments: Attachment[];
  createdAt: string;
};

/** Path lampiran: `{conversationId}/{uuid}.{ext}` (policy Storage & RPC memeriksa folder). */
export function attachmentPath(conversationId: string, id: string, ext: string): string {
  return `${conversationId}/${id}.${ext}`;
}

/** Pesan error validasi file lampiran, atau null bila valid. */
export function validateAttachmentFile(file: { type: string; size: number }): string | null {
  if (!(file.type in ATTACHMENT_TYPES)) return "Lampiran harus gambar (JPG/PNG/WEBP) atau PDF.";
  if (file.size > MAX_ATTACHMENT_BYTES) return "Ukuran lampiran maksimal 5 MB.";
  return null;
}

const attachmentSchema = z.object({
  path: z.string().max(200),
  name: z.string().trim().min(1).max(200),
  type: z.enum(Object.keys(ATTACHMENT_TYPES) as [keyof typeof ATTACHMENT_TYPES]),
  size: z.number().int().min(1).max(MAX_ATTACHMENT_BYTES),
});

export const sendSchema = z
  .object({
    body: z
      .string()
      .trim()
      .max(MAX_MESSAGE_LENGTH, { error: `Pesan maksimal ${MAX_MESSAGE_LENGTH} karakter` }),
    attachments: z.array(attachmentSchema).max(MAX_ATTACHMENTS, {
      error: `Maksimal ${MAX_ATTACHMENTS} lampiran per pesan`,
    }),
  })
  .refine((v) => v.body.length > 0 || v.attachments.length > 0, {
    error: "Tulis pesan atau lampirkan file",
  });

export const startSchema = z.object({
  subject: z
    .string()
    .trim()
    .min(3, { error: "Tulis topik singkat (min. 3 karakter)" })
    .max(120, { error: "Topik maksimal 120 karakter" }),
  body: z.string().trim().min(1, { error: "Tulis pesanmu" }).max(MAX_MESSAGE_LENGTH),
});

/** Ubah kolom `attachments` (jsonb) menjadi daftar yang aman dipakai UI. */
export function parseAttachments(value: unknown): Attachment[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const parsed = attachmentSchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}

export function toChatMessage(row: {
  id: string;
  sender_role: MessageSender;
  sender_id: string | null;
  body: string;
  attachments: unknown;
  created_at: string;
}): ChatMessage {
  return {
    id: row.id,
    senderRole: row.sender_role,
    senderId: row.sender_id,
    body: row.body,
    attachments: parseAttachments(row.attachments),
    createdAt: row.created_at,
  };
}

/** Filter inbox admin (nilai = `?status=`). */
export const INBOX_FILTERS = {
  needs_reply: "Butuh balasan",
  open: "Terbuka",
  closed: "Selesai",
  all: "Semua",
} as const;
export type InboxFilter = keyof typeof INBOX_FILTERS;

export const INBOX_KINDS = { general: "Umum", order: "Pesanan" } as const;
export type InboxKind = keyof typeof INBOX_KINDS;
