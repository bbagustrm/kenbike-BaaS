import { createHash, timingSafeEqual } from "node:crypto";

/** SHA512(order_id + status_code + gross_amount + ServerKey), hex. */
export function midtransSignature(
  payload: { order_id: string; status_code: string; gross_amount: string },
  serverKey: string,
): string {
  return createHash("sha512")
    .update(payload.order_id + payload.status_code + payload.gross_amount + serverKey)
    .digest("hex");
}

/** Verifikasi signature_key notifikasi Midtrans (perbandingan timing-safe). */
export function verifyMidtransSignature(
  payload: { order_id: string; status_code: string; gross_amount: string; signature_key?: string },
  serverKey: string,
): boolean {
  if (!payload.signature_key) return false;
  const expected = Buffer.from(midtransSignature(payload, serverKey), "utf8");
  const actual = Buffer.from(payload.signature_key, "utf8");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
