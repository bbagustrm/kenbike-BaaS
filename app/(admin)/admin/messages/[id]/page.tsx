import { ChevronLeftIcon, ExternalLinkIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  ChatThread,
  ConversationStatusButton,
  ConversationsLiveRefresh,
  inboxQuery,
  InboxList,
  parseInboxParams,
} from "@/features/chat";
import {
  getConversation,
  getCustomerEmail,
  listInbox,
  listMessages,
} from "@/features/chat/queries";
import { orderDisplayStatus, StatusBadge } from "@/features/orders";
import { REFUND_STATUS_LABEL, RefundPanel } from "@/features/refunds";
import { getRefund } from "@/features/refunds/queries";
import { formatRupiah } from "@/lib/format";

export const metadata: Metadata = { title: "Percakapan · Admin" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function AdminConversationPage({
  params,
  searchParams,
}: PageProps<"/admin/messages/[id]">) {
  const [{ id }, raw] = await Promise.all([params, searchParams]);
  if (!UUID.test(id)) notFound();
  const inboxParams = parseInboxParams(raw);

  const conversation = await getConversation(id);
  if (!conversation) notFound();

  const [inbox, thread, email, refund] = await Promise.all([
    listInbox(inboxParams),
    listMessages(id),
    getCustomerEmail(conversation.customerId),
    conversation.order ? getRefund(conversation.order.id) : null,
  ]);
  const order = conversation.order;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[24rem_1fr]">
      <div className="hidden lg:block">
        <InboxList
          items={inbox.items}
          params={inboxParams}
          next={inbox.next}
          activeId={conversation.id}
        />
      </div>

      <div className="space-y-4">
        <Link
          href={`/admin/messages${inboxQuery(inboxParams)}`}
          className={buttonVariants({ variant: "ghost", size: "sm", className: "-ml-2" })}
        >
          <ChevronLeftIcon />
          Semua pesan
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border p-4">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-lg font-semibold">{conversation.subject}</h1>
              {conversation.status === "closed" && <Badge variant="secondary">Selesai</Badge>}
            </div>
            <p className="text-sm">
              {conversation.customerName ?? "Pembeli"}
              {email && <span className="text-muted-foreground"> · {email}</span>}
              {conversation.customerPhone && (
                <span className="text-muted-foreground"> · {conversation.customerPhone}</span>
              )}
            </p>
            {order && (
              <div className="flex flex-wrap items-center gap-2 pt-1 text-sm">
                <Link
                  href={`/admin/orders/${encodeURIComponent(order.orderNumber)}`}
                  className="inline-flex items-center gap-1 font-mono underline-offset-4 hover:underline"
                >
                  {order.orderNumber}
                  <ExternalLinkIcon className="size-3.5" />
                </Link>
                <StatusBadge {...orderDisplayStatus(order.paymentStatus, order.shippingStatus)} />
                <span className="text-muted-foreground">{formatRupiah(order.total)}</span>
                {refund && (
                  <Badge variant="outline">Refund: {REFUND_STATUS_LABEL[refund.status]}</Badge>
                )}
              </div>
            )}
          </div>
          <ConversationStatusButton conversationId={conversation.id} status={conversation.status} />
        </div>

        {order && refund && refund.status !== "completed" && (
          <RefundPanel orderId={order.id} refund={refund} admin />
        )}

        <ChatThread
          key={conversation.id}
          conversationId={conversation.id}
          viewer="admin"
          initialMessages={thread.messages}
          initialHasMore={thread.hasMore}
          customerName={conversation.customerName}
          className="h-[calc(100dvh-20rem)] min-h-96"
        />
      </div>
      <ConversationsLiveRefresh />
    </div>
  );
}
