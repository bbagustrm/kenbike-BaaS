import { MessagesSquareIcon } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ConversationsLiveRefresh,
  MyConversationList,
  NewConversationDialog,
} from "@/features/chat";
import { listMyConversations } from "@/features/chat/queries";
import { requireUser } from "@/lib/auth/session";
import { firstParam } from "@/lib/search";

export const metadata: Metadata = { title: "Pesan", robots: { index: false } };

export default function MessagesPage({ searchParams }: PageProps<"/account/messages">) {
  return (
    <Suspense fallback={<MessagesSkeleton />}>
      {searchParams.then((sp) => (
        <Messages startNew={firstParam(sp.new) === "1"} />
      ))}
    </Suspense>
  );
}

async function Messages({ startNew }: { startNew: boolean }) {
  await requireUser(`/account/messages${startNew ? "?new=1" : ""}`);
  const conversations = await listMyConversations();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Chat dengan tim KenBike. Kami membalas pada hari kerja secepatnya.
        </p>
        <NewConversationDialog defaultOpen={startNew} />
      </div>
      {conversations.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MessagesSquareIcon />
            </EmptyMedia>
            <EmptyTitle>Belum ada pesan</EmptyTitle>
            <EmptyDescription>
              Tanya stok atau ukuran sepeda lewat &ldquo;Pesan baru&rdquo;, atau buka chat dari
              detail pesanan.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <MyConversationList conversations={conversations} />
      )}
      <ConversationsLiveRefresh />
    </div>
  );
}

function MessagesSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true">
      <Skeleton className="h-9 w-full" />
      {Array.from({ length: 3 }, (_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}
