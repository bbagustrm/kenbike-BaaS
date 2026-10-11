import "server-only";

import { biteshipEnv } from "@/lib/env/server";

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
    console.error("[biteship]", path, res.status, body?.code, body?.error);
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
