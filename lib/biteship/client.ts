import "server-only";

import { biteshipEnv } from "@/lib/env/server";
import { log } from "@/lib/log";

import { toArea, toShippingRates } from "./mapping";
import type { Area, BiteshipArea, BiteshipPricing, RateItem, ShippingRate } from "./types";

const BASE_URL = "https://api.biteship.com";
const TIMEOUT_MS = 10_000;

/** Error Biteship dengan pesan yang aman ditampilkan ke pengguna. */
export class BiteshipError extends Error {
  constructor(
    message: string,
    readonly code?: number,
  ) {
    super(message);
    this.name = "BiteshipError";
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        authorization: biteshipEnv().BITESHIP_API_KEY,
        "content-type": "application/json",
        ...init.headers,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    const timeout = error instanceof DOMException && error.name === "TimeoutError";
    throw new BiteshipError(
      timeout
        ? "Layanan pengiriman tidak merespons. Coba lagi."
        : "Gagal menghubungi layanan pengiriman.",
    );
  }

  const body = (await res.json().catch(() => null)) as
    ({ success?: boolean; error?: string; code?: number } & T) | null;
  if (!res.ok || !body || body.success === false) {
    // Detail dari Biteship dicatat di server, pesan ke pengguna tetap umum.
    log("error", "biteship.request_failed", {
      path: path.split("?")[0],
      status: res.status,
      code: body?.code,
      error: body?.error,
    });
    throw new BiteshipError("Layanan pengiriman sedang bermasalah. Coba lagi.", body?.code);
  }
  return body;
}

/** Cari kecamatan/kota/kode pos untuk autocomplete alamat (Maps API). */
export async function searchAreas(input: string): Promise<Area[]> {
  const params = new URLSearchParams({ countries: "ID", input, type: "single" });
  const data = await request<{ areas?: BiteshipArea[] }>(`/v1/maps/areas?${params}`);
  return (data.areas ?? []).filter((a) => a.country_code === "ID").map(toArea);
}

/** Opsi ongkir dari area asal ke area tujuan untuk barang yang diberikan. */
export async function getRates(input: {
  originAreaId: string;
  destinationAreaId: string;
  items: RateItem[];
  couriers?: string;
}): Promise<ShippingRate[]> {
  const data = await request<{ pricing?: BiteshipPricing[] }>("/v1/rates/couriers", {
    method: "POST",
    body: JSON.stringify({
      origin_area_id: input.originAreaId,
      destination_area_id: input.destinationAreaId,
      couriers: input.couriers ?? biteshipEnv().BITESHIP_COURIERS,
      items: input.items,
    }),
  });
  return toShippingRates(data.pricing ?? []);
}

export type CreateBiteshipOrderInput = {
  referenceId: string;
  shipper: { name: string; phone: string };
  origin: { contactName: string; phone: string; address: string; areaId: string; note?: string };
  destination: {
    contactName: string;
    phone: string;
    address: string;
    areaId: string;
    note?: string;
  };
  courierCompany: string;
  courierType: string;
  items: RateItem[];
};

/** Buat order pengiriman (kurir dijadwalkan pickup). */
export async function createOrder(input: CreateBiteshipOrderInput): Promise<{
  id: string;
  status: string;
  waybillId: string | null;
  trackingId: string | null;
  trackingUrl: string | null;
}> {
  const data = await request<{
    id: string;
    status: string;
    courier?: { waybill_id?: string | null; tracking_id?: string | null; link?: string | null };
  }>("/v1/orders", {
    method: "POST",
    body: JSON.stringify({
      reference_id: input.referenceId,
      shipper_contact_name: input.shipper.name,
      shipper_contact_phone: input.shipper.phone,
      origin_contact_name: input.origin.contactName,
      origin_contact_phone: input.origin.phone,
      origin_address: input.origin.address,
      origin_note: input.origin.note,
      origin_area_id: input.origin.areaId,
      destination_contact_name: input.destination.contactName,
      destination_contact_phone: input.destination.phone,
      destination_address: input.destination.address,
      destination_note: input.destination.note,
      destination_area_id: input.destination.areaId,
      courier_company: input.courierCompany,
      courier_type: input.courierType,
      delivery_type: "now",
      items: input.items,
    }),
  });
  return {
    id: data.id,
    status: data.status,
    waybillId: data.courier?.waybill_id ?? null,
    trackingId: data.courier?.tracking_id ?? null,
    trackingUrl: data.courier?.link ?? null,
  };
}

/** Batalkan order pengiriman (hanya bisa sebelum kurir mengambil paket). */
export async function cancelOrder(biteshipOrderId: string, reason: string): Promise<void> {
  await request(`/v1/orders/${encodeURIComponent(biteshipOrderId)}`, {
    method: "DELETE",
    body: JSON.stringify({ cancellation_reason: reason.slice(0, 200) }),
  });
}
