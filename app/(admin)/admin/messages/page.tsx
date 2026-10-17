import { MessagesSquareIcon } from "lucide-react";
import type { Metadata } from "next";

import { AdminPageHeader } from "@/features/admin";
import {
  ConversationsLiveRefresh,
  InboxFilters,
  InboxList,
  parseInboxParams,
} from "@/features/chat";
import { listInbox } from "@/features/chat/queries";

export const metadata: Metadata = { title: "Pesan · Admin" };

export default async function AdminMessagesPage({ searchParams }: PageProps<"/admin/messages">) {
  const params = parseInboxParams(await searchParams);
  const { items, next } = await listInbox(params);

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Pesan" description="Chat pembeli: pertanyaan umum & per pesanan." />
      <InboxFilters params={params} />
      <div className="grid items-start gap-6 lg:grid-cols-[24rem_1fr]">
        <InboxList items={items} params={params} next={next} />
        <div className="hidden h-80 flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-sm text-muted-foreground lg:flex">
          <MessagesSquareIcon className="size-8" aria-hidden="true" />
          Pilih percakapan untuk membaca & membalas.
        </div>
      </div>
      <ConversationsLiveRefresh />
    </div>
  );
}
