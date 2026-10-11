import { describe, expect, it } from "vitest";

import { storeSettingsSchema } from "@/features/admin/settings/schemas";

import { addressFormSchema } from "./schemas";

const area = {
  id: "IDNP6",
  label: "Coblong, Bandung, Jawa Barat. 40132",
  district: "Coblong",
  city: "Bandung",
  province: "Jawa Barat",
  postalCode: "40132",
};

describe("addressFormSchema", () => {
  const input = {
    label: "",
    recipientName: "Budi",
    phone: "0812 3456 7890",
    addressLine: "Jl. Dago No. 1",
    area,
    note: "  ",
    isDefault: false,
  };

  it("label & catatan opsional: kosong → null", () => {
    expect(addressFormSchema.parse(input)).toMatchObject({ label: null, note: null });
  });

  // Form client mengirim hasil parse (output) ke Server Action yang mem-parse ulang.
  it("idempoten: hasil parse lolos parse ulang di server", () => {
    const once = addressFormSchema.parse(input);
    expect(addressFormSchema.parse(once)).toEqual(once);
  });

  it("area wajib dipilih", () => {
    expect(addressFormSchema.safeParse({ ...input, area: null }).success).toBe(false);
  });
});

describe("storeSettingsSchema", () => {
  it("idempoten dengan catatan kosong", () => {
    const once = storeSettingsSchema.parse({
      storeName: "KenBike",
      contactName: "Admin",
      phone: "081200000000",
      addressLine: "Jl. Contoh No. 1",
      area,
      note: "",
    });
    expect(once.note).toBeNull();
    expect(storeSettingsSchema.parse(once)).toEqual(once);
  });
});
