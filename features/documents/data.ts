import type { AdminOrderDetail } from "@/features/admin/orders/queries";
import type { AddressSnapshot, OrderDetail } from "@/features/orders/queries";
import type { Database } from "@/types/database.types";

type PaymentStatus = Database["public"]["Enums"]["payment_status"];

/** Data satu pesanan dalam bentuk yang dipakai invoice & resi (tanpa query). */
export type DocumentOrder = {
  orderNumber: string;
  createdAt: string;
  paidAt: string | null;
  paymentStatus: PaymentStatus;
  paymentMethod: string | null;
  customer: { name: string | null; email: string | null };
  address: AddressSnapshot;
  courier: { code: string; service: string };
  waybillId: string | null;
  note: string | null;
  items: {
    name: string;
    variantLabel: string | null;
    sku: string | null;
    quantity: number;
    price: number;
    weightGram: number | null;
  }[];
  subtotal: number;
  shippingCost: number;
  total: number;
};

/** Invoice hanya untuk pesanan yang sudah dibayar (termasuk yang kemudian dibatalkan/di-refund). */
export function canDownloadInvoice(status: PaymentStatus): boolean {
  return status === "paid" || status === "refund_pending" || status === "refunded";
}

/** Resi hanya untuk pesanan dibayar yang pengirimannya belum dibatalkan/diretur. */
export function canDownloadLabel(
  status: PaymentStatus,
  shipping: Database["public"]["Enums"]["shipping_status"] | null,
): boolean {
  return status === "paid" && shipping !== "cancelled" && shipping !== "returned";
}

/** "bank_transfer" + "BCA" → "Transfer bank · BCA". */
export function paymentMethodLabel(type: string | null, channel: string | null): string | null {
  const TYPES: Record<string, string> = {
    bank_transfer: "Transfer bank (VA)",
    echannel: "Mandiri Bill",
    credit_card: "Kartu kredit/debit",
    gopay: "GoPay",
    shopeepay: "ShopeePay",
    qris: "QRIS",
    cstore: "Gerai retail",
    akulaku: "Akulaku",
    kredivo: "Kredivo",
  };
  const name = type ? (TYPES[type] ?? type.replaceAll("_", " ")) : null;
  const via = channel?.toUpperCase();
  if (name && via && via !== name.toUpperCase()) return `${name} · ${via}`;
  return name ?? via ?? null;
}

const SUCCESS = new Set(["settlement", "capture", "refund"]);

export function fromCustomerOrder(
  order: OrderDetail,
  customer: { name: string | null; email: string | null },
): DocumentOrder {
  return {
    orderNumber: order.orderNumber,
    createdAt: order.createdAt,
    paidAt: order.paidAt,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.payment
      ? paymentMethodLabel(order.payment.type, order.payment.channel)
      : null,
    customer,
    address: order.address,
    courier: order.courier,
    waybillId: order.shipment?.waybillId ?? null,
    note: order.note,
    items: order.items.map((i) => ({
      name: i.name,
      variantLabel: i.variantLabel,
      sku: null,
      quantity: i.quantity,
      price: i.price,
      weightGram: null,
    })),
    subtotal: order.subtotal,
    shippingCost: order.shippingCost,
    total: order.total,
  };
}

export function fromAdminOrder(order: AdminOrderDetail): DocumentOrder {
  const paid = order.payments.findLast((p) => SUCCESS.has(p.status)) ?? order.payments.at(-1);
  return {
    orderNumber: order.orderNumber,
    createdAt: order.createdAt,
    paidAt: order.paidAt,
    paymentStatus: order.paymentStatus,
    paymentMethod: paid ? paymentMethodLabel(paid.type, paid.channel) : null,
    customer: { name: order.customer.name, email: order.customer.email },
    address: order.address,
    courier: order.courier,
    waybillId: order.shipment?.waybillId ?? null,
    note: order.customerNote,
    items: order.items.map((i) => ({
      name: i.name,
      variantLabel: i.variantLabel,
      sku: i.sku,
      quantity: i.quantity,
      price: i.price,
      weightGram: i.weightGram,
    })),
    subtotal: order.subtotal,
    shippingCost: order.shippingCost,
    total: order.total,
  };
}

/** Total berat (gram) bila diketahui. */
export function totalWeightGram(order: DocumentOrder): number | null {
  let total = 0;
  for (const item of order.items) {
    if (item.weightGram === null) return null;
    total += item.weightGram * item.quantity;
  }
  return total;
}

/** "Jl. X, Kec. Y, Kota Z, Provinsi 12345" dari snapshot alamat. */
export function formatAddress(a: AddressSnapshot): string {
  return `${a.address_line}, ${[a.district, a.city, a.province].filter(Boolean).join(", ")} ${a.postal_code}`;
}

/** Nama file aman: "Invoice-KB-20261014-0001.pdf". */
export function documentFileName(kind: "Invoice" | "Resi", orderNumber: string): string {
  return `${kind}-${orderNumber.replace(/[^A-Z0-9-]/gi, "")}.pdf`;
}
