/** Area hasil Maps API Biteship (`GET /v1/maps/areas`). */
export type BiteshipArea = {
  id: string;
  name: string;
  country_code: string;
  administrative_division_level_1_name: string;
  administrative_division_level_2_name: string;
  administrative_division_level_3_name: string;
  postal_code: number;
};

/** Area yang sudah dinormalisasi untuk form alamat. */
export type Area = {
  id: string;
  /** mis. "Kebayoran Baru, Jakarta Selatan, DKI Jakarta. 12110" */
  label: string;
  district: string;
  city: string;
  province: string;
  postalCode: string;
};

/** Barang untuk cek ongkir (satuan Biteship: gram & cm, nilai dalam IDR). */
export type RateItem = {
  name: string;
  value: number;
  quantity: number;
  weight: number;
  length: number;
  width: number;
  height: number;
};

/** Satu opsi dari `pricing` Rates API (field yang dipakai saja). */
export type BiteshipPricing = {
  courier_name: string;
  courier_code: string;
  courier_service_name: string;
  courier_service_code: string;
  description?: string;
  duration: string;
  shipment_duration_range?: string;
  shipment_duration_unit?: string;
  price: number;
};

/** Opsi ongkir yang ditampilkan ke pembeli. */
export type ShippingRate = {
  courierCode: string;
  courierName: string;
  serviceCode: string;
  serviceName: string;
  description: string;
  /** mis. "1 - 2 hari" */
  duration: string;
  price: number;
};
