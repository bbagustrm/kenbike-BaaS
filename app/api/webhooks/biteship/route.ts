import { timingSafeEqual } from "node:crypto";

import { applyBiteshipEvent, type BiteshipEvent } from "@/features/fulfillment/biteship";
import { biteshipWebhookEnv } from "@/lib/env/server";

/**
 * Webhook Biteship (event order.status / order.waybill_id / order.price).
 * Keamanan: header kustom yang diatur di dashboard Biteship
 * ("Headers Signature Key" = WEBHOOK_HEADER, "Headers Signature Secret" =
 * BITESHIP_WEBHOOK_SECRET). Alternatif: query `?secret=`.
 */
const WEBHOOK_HEADER = "x-kenbike-webhook-secret";

function authorized(request: Request): boolean | "unconfigured" {
  let secret: string;
  try {
    secret = biteshipWebhookEnv().BITESHIP_WEBHOOK_SECRET;
  } catch {
    return "unconfigured";
  }
  const expected = Buffer.from(secret);
  const given = Buffer.from(
    request.headers.get(WEBHOOK_HEADER) ?? new URL(request.url).searchParams.get("secret") ?? "",
  );
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function POST(request: Request) {
  const event = (await request.json().catch(() => null)) as BiteshipEvent | null;

  // Uji koneksi dari dashboard Biteship (tanpa order) → cukup 200, tanpa efek.
  if (!event?.order_id) return Response.json({ ok: true });

  const auth = authorized(request);
  if (auth === "unconfigured") {
    console.error("[webhook:biteship] BITESHIP_WEBHOOK_SECRET belum diisi");
    return Response.json({ error: "webhook not configured" }, { status: 503 });
  }
  if (!auth) return Response.json({ error: "unauthorized" }, { status: 401 });

  try {
    const outcome = await applyBiteshipEvent(event);
    return Response.json({ ok: true, outcome });
  } catch (error) {
    console.error("[webhook:biteship]", event.order_id, error);
    return Response.json({ error: "temporary failure" }, { status: 500 });
  }
}
