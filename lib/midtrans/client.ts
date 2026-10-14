import "server-only";

import { midtransEnv } from "@/lib/env/server";
import { log } from "@/lib/log";

import { midtransTime } from "./mapping";
import type { MidtransTransaction, SnapCustomer, SnapItem } from "./types";

const TIMEOUT_MS = 15_000;

function config() {
  const { MIDTRANS_SERVER_KEY, MIDTRANS_IS_PRODUCTION } = midtransEnv();
  return {
    auth: `Basic ${Buffer.from(`${MIDTRANS_SERVER_KEY}:`).toString("base64")}`,
    snapUrl: MIDTRANS_IS_PRODUCTION
      ? "https://app.midtrans.com/snap/v1/transactions"
      : "https://app.sandbox.midtrans.com/snap/v1/transactions",
    apiUrl: MIDTRANS_IS_PRODUCTION
      ? "https://api.midtrans.com"
      : "https://api.sandbox.midtrans.com",
  };
}

/** Error Midtrans dengan pesan aman untuk pengguna; detail dicatat di server. */
export class MidtransError extends Error {
  constructor(message = "Layanan pembayaran sedang bermasalah. Coba lagi.") {
    super(message);
    this.name = "MidtransError";
  }
}

async function request(url: string, init: RequestInit): Promise<Record<string, unknown>> {
  const { auth } = config();
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: {
        authorization: auth,
        accept: "application/json",
        "content-type": "application/json",
        ...init.headers,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    log("error", "midtrans.unreachable", { path: new URL(url).pathname, message: String(error) });
    throw new MidtransError("Layanan pembayaran tidak merespons. Coba lagi.");
  }
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (res.status >= 500) {
    log("error", "midtrans.server_error", { path: new URL(url).pathname, status: res.status });
    throw new MidtransError();
  }
  return { ...body, httpStatus: res.status };
}

/** Buat transaksi Snap; kembalikan token untuk snap.pay(). */
export async function createSnapTransaction(input: {
  gatewayOrderId: string;
  grossAmount: number;
  items: SnapItem[];
  customer: SnapCustomer;
  expiry: { start: Date; durationMinutes: number };
  finishUrl: string;
}): Promise<{ token: string; redirectUrl: string }> {
  const body = await request(config().snapUrl, {
    method: "POST",
    body: JSON.stringify({
      transaction_details: { order_id: input.gatewayOrderId, gross_amount: input.grossAmount },
      item_details: input.items,
      customer_details: {
        first_name: input.customer.firstName.slice(0, 50),
        email: input.customer.email,
        phone: input.customer.phone,
      },
      expiry: {
        start_time: midtransTime(input.expiry.start),
        unit: "minutes",
        duration: input.expiry.durationMinutes,
      },
      callbacks: { finish: input.finishUrl },
    }),
  });
  if (typeof body.token !== "string") {
    log("error", "midtrans.snap_rejected", {
      status: body.httpStatus,
      errors: body.error_messages,
    });
    throw new MidtransError();
  }
  return { token: body.token, redirectUrl: String(body.redirect_url ?? "") };
}

/**
 * Batalkan transaksi. `not_found` = pembeli belum memilih metode di Snap
 * (transaksi belum ada di Midtrans) — aman diabaikan.
 */
export async function cancelTransaction(
  gatewayOrderId: string,
): Promise<"cancelled" | "not_found" | "not_cancellable"> {
  const body = await request(`${config().apiUrl}/v2/${encodeURIComponent(gatewayOrderId)}/cancel`, {
    method: "POST",
  });
  const code = String(body.status_code ?? body.httpStatus);
  if (code === "200") return "cancelled";
  if (code === "404") return "not_found";
  // 412: status tidak bisa dibatalkan (mis. sudah settlement/expire).
  log("warn", "midtrans.cancel_rejected", { gatewayOrderId, code, message: body.status_message });
  return "not_cancellable";
}

/** Status transaksi terkini dari Midtrans; null bila transaksi belum ada. */
export async function getTransactionStatus(
  gatewayOrderId: string,
): Promise<MidtransTransaction | null> {
  const body = await request(`${config().apiUrl}/v2/${encodeURIComponent(gatewayOrderId)}/status`, {
    method: "GET",
  });
  if (String(body.status_code) === "404") return null;
  return body as unknown as MidtransTransaction;
}
