import { afterEach, describe, expect, it, vi } from "vitest";

import { log, redact } from "./log";

describe("redact", () => {
  it("menyamarkan kunci sensitif secara rekursif", () => {
    expect(
      redact({
        order_id: "KB-1-1",
        signature_key: "abc",
        customer: { email: "a@b.c", name: "Budi" },
        va_numbers: [{ bank: "bca", va_number: "123" }],
      }),
    ).toEqual({
      order_id: "KB-1-1",
      signature_key: "[redacted]",
      customer: { email: "[redacted]", name: "Budi" },
      va_numbers: "[redacted]",
    });
  });
});

describe("log", () => {
  afterEach(() => vi.restoreAllMocks());

  it("menulis satu baris JSON tanpa data sensitif", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    log("error", "webhook.midtrans", { orderId: "KB-1", token: "rahasia" });
    const line = JSON.parse(spy.mock.calls[0]![0] as string);
    expect(line).toMatchObject({ level: "error", event: "webhook.midtrans", orderId: "KB-1" });
    expect(line.token).toBe("[redacted]");
  });
});
