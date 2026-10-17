import { formatDateTime, formatRupiah } from "@/lib/format";

import type { RefundAccount } from "./schemas";

/** "1234567890" → "••••7890" (nomor lengkap hanya di panel Refund, tidak di chat). */
export function maskAccountNumber(number: string): string {
  return number.length <= 4 ? number : `••••${number.slice(-4)}`;
}

export function accountLine(account: RefundAccount): string {
  return `${account.bankName} ${maskAccountNumber(account.accountNumber)} a.n. ${account.accountHolder}`;
}

/** Isi pesan sistem di chat pesanan untuk setiap tahap refund. */
export const refundMessages = {
  cancelled(input: {
    actor: "customer" | "admin";
    reason: string;
    amount: number;
    account?: RefundAccount | null;
  }): string {
    const who = input.actor === "customer" ? "oleh pembeli" : "oleh admin KenBike";
    return [
      `Pesanan dibatalkan ${who}.`,
      `Alasan: ${input.reason}`,
      `Dana ${formatRupiah(input.amount)} akan dikembalikan penuh lewat transfer manual.`,
      input.account
        ? `Rekening tujuan: ${accountLine(input.account)}.`
        : "Mohon isi data rekening tujuan refund di panel Refund agar dana bisa kami transfer.",
    ].join("\n");
  },

  accountSaved(account: RefundAccount): string {
    return `Rekening tujuan refund diperbarui: ${accountLine(account)}.`;
  },

  completed(input: { amount: number; at: string; account: RefundAccount | null }): string {
    const to = input.account ? ` ke ${accountLine(input.account)}` : "";
    return [
      `Refund ${formatRupiah(input.amount)} sudah ditransfer${to} (${formatDateTime(input.at)}).`,
      "Bukti transfer bisa dilihat di panel Refund pada detail pesanan.",
    ].join("\n");
  },
};
