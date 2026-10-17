"use server";

import { refresh } from "next/cache";
import { after } from "next/server";
import { z } from "zod";

import { assertAdminAction } from "@/features/admin/guard";
import { notifyOrderCancelled, notifyRefundCompleted } from "@/features/notifications/notify";
import type { ActionState } from "@/lib/action-state";
import { getCurrentUser } from "@/lib/auth/session";
import { dbErrorMessage } from "@/lib/db-errors";
import { RATE_LIMITED_MESSAGE, rateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

import { cancelPaidOrder } from "./cancel";
import { refundMessages } from "./messages";
import { postRefundMessage } from "./notify";
import {
  accountSchema,
  cancelSchema,
  completeSchema,
  isRefundProofPath,
  REFUND_PROOF_BUCKET,
  type RefundAccount,
} from "./schemas";

const uuid = z.uuid();
const INVALID: ActionState = { status: "error", message: "Pesanan tidak ditemukan." };

function firstIssue(error: z.ZodError): ActionState {
  return { status: "error", message: error.issues[0]?.message ?? "Data tidak valid." };
}

/** Admin: batalkan pesanan lunas + buat refund (opsional tanpa mengembalikan stok). */
export async function adminCancelOrder(
  orderId: string,
  input: { reason: string; restock: boolean },
): Promise<ActionState> {
  const denied = await assertAdminAction();
  if (denied) return denied;
  if (!uuid.safeParse(orderId).success) return INVALID;
  const parsed = cancelSchema.safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error);

  const result = await cancelPaidOrder({ orderId, ...parsed.data, actor: "admin" });
  if (result.status === "success") after(() => notifyOrderCancelled(orderId, true));
  if (result.status === "success" && result.amount !== undefined) {
    await postRefundMessage(
      orderId,
      refundMessages.cancelled({
        actor: "admin",
        reason: parsed.data.reason,
        amount: result.amount,
      }),
    );
  }
  refresh();
  return { status: result.status, message: result.message };
}

/** Pembeli: batalkan pesanan lunas miliknya (stok selalu dikembalikan). */
export async function customerCancelOrder(
  orderId: string,
  input: { reason: string; account?: RefundAccount },
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "Sesi kamu sudah habis. Silakan masuk lagi." };
  if (!uuid.safeParse(orderId).success) return INVALID;
  const parsed = cancelSchema.safeParse({ reason: input.reason, restock: true });
  if (!parsed.success) return firstIssue(parsed.error);
  // Rekening divalidasi sebelum membatalkan agar tidak ada pesanan batal tanpa rekening.
  const account = accountSchema.safeParse(input.account ?? {});
  if (!account.success) return firstIssue(account.error);
  if (!(await rateLimit("cancelOrder", user.id))) {
    return { status: "error", message: RATE_LIMITED_MESSAGE };
  }

  const result = await cancelPaidOrder({ orderId, ...parsed.data, actor: "customer" });
  if (result.status === "error") return result;

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_refund_account", {
    p_order_id: orderId,
    p_bank_name: account.data.bankName,
    p_account_number: account.data.accountNumber,
    p_account_holder: account.data.accountHolder,
  });
  if (result.amount !== undefined) {
    await postRefundMessage(
      orderId,
      refundMessages.cancelled({
        actor: "customer",
        reason: parsed.data.reason,
        amount: result.amount,
        account: error ? null : account.data,
      }),
    );
  }
  after(() => notifyOrderCancelled(orderId, false));
  refresh();
  if (error) {
    return {
      status: "success",
      message: "Pesanan dibatalkan, tapi rekening gagal disimpan. Isi ulang di panel Refund.",
    };
  }
  return {
    status: "success",
    message: "Pesanan dibatalkan. Refund akan kami transfer ke rekeningmu.",
  };
}

/** Simpan rekening tujuan refund (admin, atau pembeli pemilik order — dicek RPC). */
export async function saveRefundAccount(
  orderId: string,
  input: { bankName: string; accountNumber: string; accountHolder: string },
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "Sesi kamu sudah habis. Silakan masuk lagi." };
  if (!uuid.safeParse(orderId).success) return INVALID;
  if (user.role !== "admin" && !(await rateLimit("refundAccount", user.id))) {
    return { status: "error", message: RATE_LIMITED_MESSAGE };
  }
  const parsed = accountSchema.safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_refund_account", {
    p_order_id: orderId,
    p_bank_name: parsed.data.bankName,
    p_account_number: parsed.data.accountNumber,
    p_account_holder: parsed.data.accountHolder,
  });
  if (error) return { status: "error", message: dbErrorMessage(error) };
  await postRefundMessage(orderId, refundMessages.accountSaved(parsed.data));

  refresh();
  return { status: "success", message: "Data rekening disimpan." };
}

/**
 * Admin: tandai refund selesai. Bukti sudah diunggah browser ke Storage
 * (policy admin); di sini hanya path-nya yang divalidasi & dicatat.
 */
export async function completeRefund(
  orderId: string,
  input: { proofPath: string | null; note: string },
): Promise<ActionState> {
  const denied = await assertAdminAction();
  if (denied) return denied;
  if (!uuid.safeParse(orderId).success) return INVALID;
  const parsed = completeSchema.safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error);
  if (parsed.data.proofPath && !isRefundProofPath(orderId, parsed.data.proofPath)) {
    return { status: "error", message: "Bukti transfer tidak valid. Unggah ulang." };
  }

  const supabase = await createClient();
  const { data: refund, error } = await supabase.rpc("complete_refund", {
    p_order_id: orderId,
    p_proof_path: parsed.data.proofPath ?? "",
    p_note: parsed.data.note ?? "",
  });
  if (error) {
    if (parsed.data.proofPath) {
      await supabase.storage.from(REFUND_PROOF_BUCKET).remove([parsed.data.proofPath]);
    }
    return { status: "error", message: dbErrorMessage(error) };
  }
  await postRefundMessage(
    orderId,
    refundMessages.completed({
      amount: refund.amount,
      at: refund.processed_at ?? new Date().toISOString(),
      account:
        refund.bank_name && refund.account_number && refund.account_holder
          ? {
              bankName: refund.bank_name,
              accountNumber: refund.account_number,
              accountHolder: refund.account_holder,
            }
          : null,
    }),
  );

  after(() => notifyRefundCompleted(orderId));
  refresh();
  return { status: "success", message: "Refund ditandai selesai." };
}
