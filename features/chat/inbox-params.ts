import { firstParam } from "@/lib/search";

import type { InboxParams } from "./queries";
import { INBOX_FILTERS, INBOX_KINDS, type InboxFilter, type InboxKind } from "./schemas";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** `?status=&kind=&q=&before=<iso>_<uuid>` → parameter inbox. Default: butuh balasan. */
export function parseInboxParams(raw: Record<string, string | string[] | undefined>): InboxParams {
  const status = firstParam(raw.status);
  const kind = firstParam(raw.kind);
  const q = firstParam(raw.q)
    ?.replace(/[%_,()]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
  const [at, id] = (firstParam(raw.before) ?? "").split("_");
  return {
    filter: status && status in INBOX_FILTERS ? (status as InboxFilter) : "needs_reply",
    kind: kind && kind in INBOX_KINDS ? (kind as InboxKind) : undefined,
    q: q || undefined,
    before: at && id && UUID.test(id) && !Number.isNaN(Date.parse(at)) ? { at, id } : undefined,
  };
}

/** Query string untuk daftar/percakapan admin dengan filter yang sama. */
export function inboxQuery(params: InboxParams, before?: { at: string; id: string }): string {
  const sp = new URLSearchParams();
  if (params.filter !== "needs_reply") sp.set("status", params.filter);
  if (params.kind) sp.set("kind", params.kind);
  if (params.q) sp.set("q", params.q);
  if (before) sp.set("before", `${before.at}_${before.id}`);
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}
