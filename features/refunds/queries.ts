import "server-only";

import { createClient } from "@/lib/supabase/server";

import { REFUND_PROOF_BUCKET, type RefundStatus } from "./schemas";

export type Refund = {
  amount: number;
  status: RefundStatus;
  reason: string;
  requestedBy: "customer" | "admin";
  account: { bankName: string; accountNumber: string; accountHolder: string } | null;
  proofUrl: string | null;
  proofIsPdf: boolean;
  note: string | null;
  processedAt: string | null;
  createdAt: string;
};

/**
 * Refund sebuah order (RLS: pembeli pemilik & admin). Bukti transfer dibuka
 * lewat signed URL berumur pendek karena bucket-nya privat.
 */
export async function getRefund(orderId: string): Promise<Refund | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("refunds")
    .select(
      `amount, status, reason, requested_by, bank_name, account_number, account_holder,
       proof_path, note, processed_at, created_at`,
    )
    .eq("order_id", orderId)
    .maybeSingle();
  if (error) throw new Error(`getRefund: ${error.message}`);
  if (!data) return null;

  let proofUrl: string | null = null;
  if (data.proof_path) {
    const { data: signed } = await supabase.storage
      .from(REFUND_PROOF_BUCKET)
      .createSignedUrl(data.proof_path, 10 * 60);
    proofUrl = signed?.signedUrl ?? null;
  }

  return {
    amount: data.amount,
    status: data.status,
    reason: data.reason,
    requestedBy: data.requested_by,
    account:
      data.bank_name && data.account_number && data.account_holder
        ? {
            bankName: data.bank_name,
            accountNumber: data.account_number,
            accountHolder: data.account_holder,
          }
        : null,
    proofUrl,
    proofIsPdf: data.proof_path?.endsWith(".pdf") ?? false,
    note: data.note,
    processedAt: data.processed_at,
    createdAt: data.created_at,
  };
}
