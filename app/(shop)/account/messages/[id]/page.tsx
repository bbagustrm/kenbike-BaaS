import { ChevronLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChatThread } from "@/features/chat";
import { getConversation, listMessages } from "@/features/chat/queries";
import { orderDisplayStatus, StatusBadge } from "@/features/orders";
import { RefundPanel } from "@/features/refunds";
import { getRefund } from "@/features/refunds/queries";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Percakapan", robots: { index: false } };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function ConversationPage({ params }: PageProps<"/account/messages/[id]">) {
  return (
    <div className="space-y-4">
      <Link
        href="/account/messages"
        className={buttonVariants({ variant: "ghost", size: "sm", className: "-ml-2" })}
      >
        <ChevronLeftIcon />
        Semua pesan
      </Link>
      <Suspense fallback={<Skeleton className="h-[32rem] w-full" />}>
        {params.then(({ id }) => (
          <Conversation id={id} />
        ))}
      </Suspense>
    </div>
  );
}

async function Conversation({ id }: { id: string }) {
  await requireUser(`/account/messages/${id}`);
  if (!UUID.test(id)) notFound();
  const conversation = await getConversation(id);
  if (!conversation) notFound();
  const order = conversation.order;
  const [thread, refund] = await Promise.all([
    listMessages(id),
    order ? getRefund(order.id) : null,
  ]);

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold">{conversation.subject}</h2>
          {conversation.status === "closed" && <Badge variant="secondary">Selesai</Badge>}
        </div>
        {order && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Link
              href={`/account/orders/${encodeURIComponent(order.orderNumber)}`}
              className="font-mono underline-offset-4 hover:underline"
            >
              {order.orderNumber}
            </Link>
            <StatusBadge {...orderDisplayStatus(order.paymentStatus, order.shippingStatus)} />
          </div>
        )}
        {conversation.status === "closed" && (
          <p className="text-sm text-muted-foreground">
            Percakapan ini sudah ditandai selesai. Kirim pesan untuk membukanya lagi.
          </p>
        )}
      </div>
      {order && refund && refund.status !== "completed" && (
        <RefundPanel orderId={order.id} refund={refund} />
      )}
      <ChatThread
        key={conversation.id}
        conversationId={conversation.id}
        viewer="customer"
        initialMessages={thread.messages}
        initialHasMore={thread.hasMore}
        className="h-[calc(100dvh-22rem)] min-h-96"
      />
    </div>
  );
}
