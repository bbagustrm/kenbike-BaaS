import { describe, expect, it } from "vitest";

import { dbErrorMessage } from "./db-errors";

describe("dbErrorMessage", () => {
  it("memetakan pelanggaran unique berdasarkan nama constraint", () => {
    expect(
      dbErrorMessage({
        code: "23505",
        message: 'duplicate key value violates unique constraint "product_variants_sku_key"',
      }),
    ).toBe("SKU sudah dipakai produk/varian lain.");
  });

  it("memetakan foreign key restrict", () => {
    expect(dbErrorMessage({ code: "23503", message: "update or delete on table" })).toMatch(
      /masih dipakai/,
    );
  });

  it("memetakan stok negatif", () => {
    expect(
      dbErrorMessage({
        code: "23514",
        message: 'violates check constraint "product_variants_quantity_check"',
      }),
    ).toBe("Stok tidak boleh menjadi negatif.");
  });

  it("memetakan exception dari RPC", () => {
    expect(dbErrorMessage({ code: "23505", message: "duplicate_variant_combination" })).toMatch(
      /kombinasi opsi yang sama/,
    );
    expect(dbErrorMessage({ code: "22023", message: "variant_options_mismatch" })).toMatch(
      /tepat satu nilai/,
    );
    expect(dbErrorMessage({ code: "42501", message: "forbidden" })).toMatch(/akses/);
  });

  it("tidak membocorkan pesan asli yang tidak dikenal", () => {
    expect(dbErrorMessage({ code: "XX000", message: "internal: relation foo" })).toBe(
      "Terjadi kesalahan. Coba lagi.",
    );
  });
});
