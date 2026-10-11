/** Item Snap (`item_details`). Jumlah price × quantity wajib = gross_amount. */
export type SnapItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

export type SnapCustomer = {
  firstName: string;
  email?: string;
  phone?: string;
};

/** Notifikasi/status transaksi Midtrans (field yang dipakai saja). */
export type MidtransTransaction = {
  order_id: string;
  status_code: string;
  gross_amount: string;
  transaction_status: string;
  fraud_status?: string;
  transaction_id?: string;
  payment_type?: string;
  signature_key?: string;
};
