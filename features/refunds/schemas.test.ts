import { describe, expect, it } from "vitest";

import {
  accountSchema,
  cancelSchema,
  completeSchema,
  isAccountOverdue,
  isCancellable,
  isRefundProofPath,
  refundProofPath,
  validateProofFile,
} from "./schemas";

const ORDER = "6f1c2a3b-1111-4222-8333-944455556666";
const FILE = "0a1b2c3d-aaaa-4bbb-8ccc-ddddeeeeffff";

describe("cancelSchema", () => {
  it("alasan wajib, restock default true", () => {
    expect(cancelSchema.safeParse({ reason: "  " }).success).toBe(false);
    expect(cancelSchema.parse({ reason: " Salah ukuran " })).toEqual({
      reason: "Salah ukuran",
      restock: true,
    });
  });
});

describe("accountSchema", () => {
  it("menormalkan nomor rekening & menolak non-angka", () => {
    expect(
      accountSchema.parse({ bankName: "BCA", accountNumber: "1234-5678 90", accountHolder: "Budi" })
        .accountNumber,
    ).toBe("1234567890");
    expect(
      accountSchema.safeParse({ bankName: "BCA", accountNumber: "12ab", accountHolder: "Budi" })
        .success,
    ).toBe(false);
  });
});

describe("completeSchema", () => {
  it("butuh bukti atau catatan", () => {
    expect(completeSchema.safeParse({ proofPath: null, note: "  " }).success).toBe(false);
    expect(completeSchema.parse({ proofPath: null, note: "Via Midtrans" }).note).toBe(
      "Via Midtrans",
    );
    expect(completeSchema.parse({ proofPath: "x", note: "" }).note).toBeNull();
  });
});

describe("bukti refund", () => {
  it("path harus di folder order", () => {
    const path = refundProofPath(ORDER, FILE, "png");
    expect(isRefundProofPath(ORDER, path)).toBe(true);
    expect(isRefundProofPath(ORDER, `lain/${FILE}.png`)).toBe(false);
    expect(isRefundProofPath(ORDER, `${ORDER}/../x.png`)).toBe(false);
  });

  it("validasi tipe & ukuran", () => {
    expect(validateProofFile({ type: "application/pdf", size: 1000 })).toBeNull();
    expect(validateProofFile({ type: "text/plain", size: 10 })).toMatch(/gambar/);
    expect(validateProofFile({ type: "image/png", size: 6 * 1024 * 1024 })).toMatch(/5 MB/);
  });
});

describe("isCancellable", () => {
  it("hanya lunas & belum diambil kurir", () => {
    expect(isCancellable("paid", null)).toBe(true);
    expect(isCancellable("paid", "processing")).toBe(true);
    expect(isCancellable("paid", "shipped")).toBe(false);
    expect(isCancellable("refund_pending", "cancelled")).toBe(false);
    expect(isCancellable("pending_payment", null)).toBe(false);
  });
});

describe("isAccountOverdue", () => {
  const now = Date.parse("2026-10-17T00:00:00Z");
  it("hanya menunggu rekening & lebih dari 2 hari", () => {
    expect(isAccountOverdue("awaiting_account", "2026-10-14T00:00:00Z", now)).toBe(true);
    expect(isAccountOverdue("awaiting_account", "2026-10-15T12:00:00Z", now)).toBe(false);
    expect(isAccountOverdue("pending_transfer", "2026-10-01T00:00:00Z", now)).toBe(false);
  });
});
