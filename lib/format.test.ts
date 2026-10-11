import { describe, expect, it } from "vitest";

import { formatDate, formatDateTime, formatRupiah } from "./format";

// Intl memakai spasi tak terputus (U+00A0) antara "Rp" dan angka.
const normalize = (s: string) => s.replace(/ /g, " ");

describe("formatRupiah", () => {
  it("memformat tanpa desimal dengan pemisah ribuan titik", () => {
    expect(normalize(formatRupiah(1250000))).toBe("Rp 1.250.000");
  });

  it("memformat nol", () => {
    expect(normalize(formatRupiah(0))).toBe("Rp 0");
  });
});

describe("formatDate", () => {
  it("memakai zona waktu Asia/Jakarta", () => {
    // 2026-10-10T20:00Z = 11 Okt 2026 03:00 WIB
    expect(formatDate("2026-10-10T20:00:00Z")).toBe("11 Okt 2026");
    expect(formatDateTime("2026-10-10T20:00:00Z")).toContain("03.00");
  });
});
