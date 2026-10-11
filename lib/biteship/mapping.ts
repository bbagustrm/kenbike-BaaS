import type { Database } from "@/types/database.types";

import type { Area, BiteshipArea, BiteshipPricing, ShippingRate } from "./types";

type ShippingStatus = Database["public"]["Enums"]["shipping_status"];

export function toArea(area: BiteshipArea): Area {
  return {
    id: area.id,
    label: area.name,
    district: area.administrative_division_level_3_name,
    city: area.administrative_division_level_2_name,
    province: area.administrative_division_level_1_name,
    postalCode: String(area.postal_code).padStart(5, "0"),
  };
}

const UNIT: Record<string, string> = { days: "hari", hours: "jam", day: "hari", hour: "jam" };

/** "2 - 3 days" → "2 - 3 hari"; "1 - 1 days" → "1 hari". */
export function formatDuration(pricing: BiteshipPricing): string {
  const range = pricing.shipment_duration_range?.trim();
  const unit = pricing.shipment_duration_unit?.trim().toLowerCase();
  if (!range || !unit) return pricing.duration;
  const [from, to] = range.split("-").map((s) => s.trim());
  const span = to && to !== from ? `${from}–${to}` : from;
  return `${span} ${UNIT[unit] ?? unit}`;
}

/** Normalisasi & urutkan opsi ongkir: termurah dulu, lalu nama kurir. */
export function toShippingRates(pricing: readonly BiteshipPricing[]): ShippingRate[] {
  return pricing
    .filter((p) => Number.isFinite(p.price) && p.price >= 0)
    .map((p) => ({
      courierCode: p.courier_code,
      courierName: p.courier_name,
      serviceCode: p.courier_service_code,
      serviceName: p.courier_service_name,
      description: p.description ?? "",
      duration: formatDuration(p),
      price: Math.round(p.price),
    }))
    .sort((a, b) => a.price - b.price || a.courierName.localeCompare(b.courierName));
}

const STATUS_MAP: Record<string, ShippingStatus> = {
  confirmed: "processing",
  scheduled: "processing",
  allocated: "processing",
  picking_up: "processing",
  courier_not_found: "processing",
  picked: "shipped",
  dropping_off: "shipped",
  on_hold: "shipped",
  delivered: "delivered",
  return_in_transit: "returned",
  returned: "returned",
  cancelled: "cancelled",
  rejected: "cancelled",
  disposed: "cancelled",
};

/** Status order Biteship → enum `shipping_status`; null bila status tidak dikenal. */
export function mapBiteshipStatus(status: string): ShippingStatus | null {
  return STATUS_MAP[status.trim().toLowerCase()] ?? null;
}
