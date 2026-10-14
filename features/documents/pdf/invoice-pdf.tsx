import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import { formatDateTime, formatRupiah } from "@/lib/format";
import type { StoreInfo } from "@/lib/store-info";

import { type DocumentOrder, formatAddress } from "../data";
import "./setup";

const INK = "#111827";
const MUTED = "#6b7280";
const LINE = "#e5e7eb";

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 9.5, color: INK, fontFamily: "Helvetica", lineHeight: 1.4 },
  row: { flexDirection: "row" },
  between: { flexDirection: "row", justifyContent: "space-between" },
  storeName: { fontSize: 18, fontFamily: "Helvetica-Bold", lineHeight: 1.2, marginBottom: 4 },
  title: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    textAlign: "right",
    letterSpacing: 2,
    lineHeight: 1.2,
    marginBottom: 2,
  },
  muted: { color: MUTED },
  bold: { fontFamily: "Helvetica-Bold" },
  label: { color: MUTED, fontSize: 8, textTransform: "uppercase", marginBottom: 2 },
  stamp: {
    marginTop: 6,
    alignSelf: "flex-end",
    borderWidth: 1.5,
    borderRadius: 3,
    paddingVertical: 2,
    paddingHorizontal: 8,
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    letterSpacing: 1,
  },
  section: { marginTop: 24 },
  col: { flex: 1, paddingRight: 16 },
  thead: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: INK,
    paddingBottom: 4,
    fontFamily: "Helvetica-Bold",
  },
  tr: { flexDirection: "row", borderBottomWidth: 0.5, borderColor: LINE, paddingVertical: 6 },
  cNo: { width: 22 },
  cItem: { flex: 1, paddingRight: 8 },
  cQty: { width: 36, textAlign: "right" },
  cPrice: { width: 80, textAlign: "right" },
  cSum: { width: 88, textAlign: "right" },
  totals: { marginTop: 10, marginLeft: "auto", width: 230 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  grand: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderColor: INK,
    marginTop: 4,
    paddingTop: 6,
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
  },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 40,
    right: 40,
    borderTopWidth: 0.5,
    borderColor: LINE,
    paddingTop: 8,
    fontSize: 8,
    color: MUTED,
    textAlign: "center",
  },
});

export function InvoicePdf({ order, store }: { order: DocumentOrder; store: StoreInfo }) {
  const refunded = order.paymentStatus === "refunded";
  const stampColor = refunded ? "#b45309" : "#15803d";
  const a = order.address;

  return (
    <Document
      title={`Invoice ${order.orderNumber}`}
      author={store.name}
      creator={store.name}
      language="id"
    >
      <Page size="A4" style={s.page}>
        <View style={s.between}>
          <View style={{ maxWidth: 280 }}>
            <Text style={s.storeName}>{store.name}</Text>
            {store.address && <Text style={s.muted}>{store.address}</Text>}
            {(store.phone || store.email) && (
              <Text style={s.muted}>{[store.phone, store.email].filter(Boolean).join(" · ")}</Text>
            )}
          </View>
          <View>
            <Text style={s.title}>INVOICE</Text>
            <Text style={{ textAlign: "right" }}>INV/{order.orderNumber}</Text>
            <Text style={[s.stamp, { color: stampColor, borderColor: stampColor }]}>
              {refunded ? "DANA DIKEMBALIKAN" : "LUNAS"}
            </Text>
          </View>
        </View>

        <View style={[s.row, s.section]}>
          <View style={s.col}>
            <Text style={s.label}>Ditagihkan kepada</Text>
            <Text style={s.bold}>{order.customer.name ?? a.recipient_name}</Text>
            {order.customer.email && <Text>{order.customer.email}</Text>}
          </View>
          <View style={s.col}>
            <Text style={s.label}>Dikirim kepada</Text>
            <Text style={s.bold}>{a.recipient_name}</Text>
            <Text>{a.phone}</Text>
            <Text>{formatAddress(a)}</Text>
          </View>
          <View style={{ width: 150 }}>
            <Text style={s.label}>Detail pesanan</Text>
            <Text>No. pesanan: {order.orderNumber}</Text>
            <Text>Tanggal: {formatDateTime(order.createdAt)}</Text>
            {order.paidAt && <Text>Dibayar: {formatDateTime(order.paidAt)}</Text>}
            {order.paymentMethod && <Text>Metode: {order.paymentMethod}</Text>}
            <Text>
              Kurir: {order.courier.code.toUpperCase()} {order.courier.service.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={s.section}>
          <View style={s.thead} fixed>
            <Text style={s.cNo}>No</Text>
            <Text style={s.cItem}>Produk</Text>
            <Text style={s.cQty}>Qty</Text>
            <Text style={s.cPrice}>Harga</Text>
            <Text style={s.cSum}>Subtotal</Text>
          </View>
          {order.items.map((item, i) => (
            <View key={i} style={s.tr} wrap={false}>
              <Text style={s.cNo}>{i + 1}</Text>
              <View style={s.cItem}>
                <Text>{item.name}</Text>
                {(item.variantLabel || item.sku) && (
                  <Text style={s.muted}>
                    {[item.variantLabel, item.sku && `SKU ${item.sku}`].filter(Boolean).join(" · ")}
                  </Text>
                )}
              </View>
              <Text style={s.cQty}>{item.quantity}</Text>
              <Text style={s.cPrice}>{formatRupiah(item.price)}</Text>
              <Text style={s.cSum}>{formatRupiah(item.price * item.quantity)}</Text>
            </View>
          ))}
        </View>

        <View style={s.totals} wrap={false}>
          <View style={s.totalRow}>
            <Text style={s.muted}>Subtotal produk</Text>
            <Text>{formatRupiah(order.subtotal)}</Text>
          </View>
          <View style={s.totalRow}>
            <Text style={s.muted}>Ongkos kirim</Text>
            <Text>{formatRupiah(order.shippingCost)}</Text>
          </View>
          <View style={s.grand}>
            <Text>Total</Text>
            <Text>{formatRupiah(order.total)}</Text>
          </View>
        </View>

        {order.note && (
          <View style={s.section} wrap={false}>
            <Text style={s.label}>Catatan pembeli</Text>
            <Text>{order.note}</Text>
          </View>
        )}

        <Text style={s.footer} fixed>
          Invoice ini dibuat otomatis oleh sistem {store.name} dan sah tanpa tanda tangan.
          {store.email || store.phone
            ? ` Pertanyaan: ${[store.email, store.phone].filter(Boolean).join(" / ")}.`
            : ""}
        </Text>
      </Page>
    </Document>
  );
}
