import { describe, expect, it } from "vitest";

import {
  canAdvanceShipping,
  formatDuration,
  mapBiteshipStatus,
  toArea,
  toShippingRates,
} from "./mapping";
import type { BiteshipPricing } from "./types";

const pricing = (over: Partial<BiteshipPricing>): BiteshipPricing => ({
  courier_name: "JNE",
  courier_code: "jne",
  courier_service_name: "Reguler",
  courier_service_code: "reg",
  duration: "2 - 3 days",
  shipment_duration_range: "2 - 3",
  shipment_duration_unit: "days",
  price: 20000,
  ...over,
});

describe("toArea", () => {
  it("memetakan level administratif dan kode pos 5 digit", () => {
    expect(
      toArea({
        id: "IDNP6",
        name: "Kebayoran Baru, Jakarta Selatan, DKI Jakarta. 12110",
        country_code: "ID",
        administrative_division_level_1_name: "DKI Jakarta",
        administrative_division_level_2_name: "Jakarta Selatan",
        administrative_division_level_3_name: "Kebayoran Baru",
        postal_code: 12110,
      }),
    ).toEqual({
      id: "IDNP6",
      label: "Kebayoran Baru, Jakarta Selatan, DKI Jakarta. 12110",
      district: "Kebayoran Baru",
      city: "Jakarta Selatan",
      province: "DKI Jakarta",
      postalCode: "12110",
    });
  });
});

describe("formatDuration", () => {
  it("menerjemahkan satuan dan merapikan rentang", () => {
    expect(formatDuration(pricing({}))).toBe("2–3 hari");
    expect(formatDuration(pricing({ shipment_duration_range: "1 - 1" }))).toBe("1 hari");
    expect(
      formatDuration(
        pricing({ shipment_duration_range: "8 - 12", shipment_duration_unit: "hours" }),
      ),
    ).toBe("8–12 jam");
  });

  it("jatuh ke teks asli bila rentang tidak ada", () => {
    expect(formatDuration(pricing({ shipment_duration_range: undefined }))).toBe("2 - 3 days");
  });
});

describe("toShippingRates", () => {
  it("urut termurah dulu dan membuang harga tidak valid", () => {
    const rates = toShippingRates([
      pricing({ courier_name: "SiCepat", courier_code: "sicepat", price: 22000 }),
      pricing({ price: Number.NaN }),
      pricing({ courier_name: "AnterAja", courier_code: "anteraja", price: 22000 }),
      pricing({ price: 18000.4 }),
    ]);
    expect(rates.map((r) => `${r.courierCode}:${r.price}`)).toEqual([
      "jne:18000",
      "anteraja:22000",
      "sicepat:22000",
    ]);
  });
});

describe("mapBiteshipStatus", () => {
  it.each([
    ["confirmed", "processing"],
    ["allocated", "processing"],
    ["picking_up", "processing"],
    ["picked", "shipped"],
    ["dropping_off", "shipped"],
    ["on_hold", "shipped"],
    ["delivered", "delivered"],
    ["return_in_transit", "returned"],
    ["returned", "returned"],
    ["cancelled", "cancelled"],
    ["rejected", "cancelled"],
    ["Delivered", "delivered"],
  ])("%s → %s", (status, expected) => {
    expect(mapBiteshipStatus(status)).toBe(expected);
  });

  it("status tidak dikenal → null", () => {
    expect(mapBiteshipStatus("teleported")).toBeNull();
  });
});

describe("canAdvanceShipping", () => {
  it.each([
    [null, "processing", true],
    ["pending", "processing", true],
    ["processing", "shipped", true],
    ["shipped", "delivered", true],
    ["processing", "delivered", true],
    ["shipped", "processing", false],
    ["delivered", "shipped", false],
    ["delivered", "returned", false],
    ["shipped", "returned", true],
    ["pending", "returned", false],
    ["processing", "cancelled", true],
    ["shipped", "cancelled", false],
    ["cancelled", "processing", false],
    ["shipped", "shipped", false],
  ] as const)("%s → %s = %s", (from, to, expected) => {
    expect(canAdvanceShipping(from, to)).toBe(expected);
  });
});
