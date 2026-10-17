"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import { assertAdminAction } from "@/features/admin/guard";
import type { ActionState } from "@/lib/action-state";
import { getCurrentUser } from "@/lib/auth/session";
import { dbErrorMessage } from "@/lib/db-errors";
import { RATE_LIMITED_MESSAGE, rateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

import { cancelPaidOrder } from "./cancel";
import {
  accountSchema,
  cancelSchema,
  completeSchema,
  isRefundProofPath,
  REFUND_PROOF_BUCKET,
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
  refresh();
  return result;
}

/** Pembeli: batalkan pesanan lunas miliknya (stok selalu dikembalikan). */
export async function customerCancelOrder(
  orderId: string,
  input: { reason: string },
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "Sesi kamu sudah habis. Silakan masuk lagi." };
  if (!uuid.safeParse(orderId).success) return INVALID;
  const parsed = cancelSchema.safeParse({ reason: input.reason, restock: true });
  if (!parsed.success) return firstIssue(parsed.error);
  if (!(await rateLimit("cancelOrder", user.id))) {
    return { status: "error", message: RATE_LIMITED_MESSAGE };
  }

  const result = await cancelPaidOrder({ orderId, ...parsed.data, actor: "customer" });
  refresh();
  return result.status === "success"
    ? {
        status: "success",
        message: "Pesanan dibatalkan. Isi data rekening agar dana bisa kami kembalikan.",
      }
    : result;
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
  const { error } = await supabase.rpc("complete_refund", {
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

  refresh();
  return { status: "success", message: "Refund ditandai selesai." };
}
