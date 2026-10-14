import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import { formatDate } from "@/lib/format";
import type { StoreInfo } from "@/lib/store-info";

import { type DocumentOrder, formatAddress, totalWeightGram } from "../data";
import { labelFontSize, type LabelSize } from "../label-size";
import "./setup";

const PT_PER_MM = 72 / 25.4;
const mm = (value: number) => value * PT_PER_MM;

/** Barang yang muat di label lembaran (tinggi tetap); sisanya diringkas. */
const maxItems = (heightMm: number) => Math.max(1, Math.floor((heightMm - 88) / 4.5));

function itemLine(item: DocumentOrder["items"][number]) {
  return `${item.quantity}× ${item.name}${item.variantLabel ? ` (${item.variantLabel})` : ""}`;
}

export function LabelPdf({
  order,
  store,
  size,
  barcode,
}: {
  order: DocumentOrder;
  store: StoreInfo;
  size: LabelSize;
  barcode: Buffer;
}) {
  const font = labelFontSize(size);
  const narrow = size.width < 70;
  const s = styles(font);
  const a = order.address;
  const weight = totalWeightGram(order);
  const fixed = size.height !== null;
  const items = fixed ? order.items.slice(0, maxItems(size.height!)) : order.items;
  /** Label tinggi tetap: batasi teks panjang agar semuanya muat di satu halaman. */
  const clamp = (lines: number) =>
    fixed ? { maxLines: lines, textOverflow: "ellipsis" as const } : {};
  const hidden = order.items.length - items.length;
  const code = order.waybillId ?? order.orderNumber;

  return (
    <Document title={`Resi ${order.orderNumber}`} author={store.name} creator={store.name}>
      {/* Tanpa height → react-pdf menyesuaikan tinggi halaman dengan isi (kertas roll). */}
      <Page
        size={size.height === null ? { width: mm(size.width) } : [mm(size.width), mm(size.height)]}
        style={s.page}
      >
        <View style={[s.between, s.rule]}>
          <Text style={s.courier}>
            {order.courier.code.toUpperCase()} {order.courier.service.toUpperCase()}
          </Text>
          <Text style={s.small}>{store.name}</Text>
        </View>

        <View style={[s.rule, { alignItems: "center" }]}>
          {/* Image react-pdf bukan <img> HTML — tidak punya atribut alt. */}
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src={{ data: barcode, format: "png" }} style={s.barcode} />
          <Text style={s.code}>{code}</Text>
          {!order.waybillId && <Text style={s.small}>Nomor resi kurir belum tersedia</Text>}
        </View>

        <View style={[narrow ? undefined : s.row, s.rule]}>
          <View style={narrow ? undefined : { flex: 3, paddingRight: mm(2) }}>
            <Text style={s.label}>Penerima</Text>
            <Text style={s.strong}>{a.recipient_name}</Text>
            <Text style={s.strong}>{a.phone}</Text>
            <Text style={clamp(3)}>{formatAddress(a)}</Text>
            {a.note && <Text style={[s.small, clamp(1)]}>Patokan: {a.note}</Text>}
          </View>
          <View style={narrow ? { marginTop: mm(1.5) } : { flex: 2 }}>
            <Text style={s.label}>Pengirim</Text>
            <Text style={s.bold}>{store.name}</Text>
            {store.phone && <Text>{store.phone}</Text>}
            {store.address && <Text style={[s.small, clamp(3)]}>{store.address}</Text>}
          </View>
        </View>

        <View style={[s.between, s.rule, { flexWrap: "wrap", columnGap: mm(2) }]}>
          <Text>No. {order.orderNumber}</Text>
          <Text>
            {weight !== null ? `${(weight / 1000).toLocaleString("id-ID")} kg · ` : ""}
            {formatDate(order.paidAt ?? order.createdAt)}
          </Text>
        </View>

        <View>
          <Text style={s.label}>Isi paket</Text>
          {items.map((item, i) => (
            <Text key={i} style={clamp(1)}>
              {itemLine(item)}
            </Text>
          ))}
          {hidden > 0 && <Text style={s.small}>+{hidden} barang lainnya</Text>}
          {order.note && (
            <Text style={[s.small, { marginTop: mm(1) }, clamp(1)]}>Catatan: {order.note}</Text>
          )}
        </View>
      </Page>
    </Document>
  );
}

function styles(font: number) {
  return StyleSheet.create({
    page: {
      padding: mm(4),
      fontSize: font,
      fontFamily: "Helvetica",
      lineHeight: 1.3,
      color: "#000",
    },
    row: { flexDirection: "row" },
    between: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    rule: {
      borderBottomWidth: 1,
      borderColor: "#000",
      borderStyle: "dashed",
      paddingBottom: mm(1.5),
      marginBottom: mm(1.5),
    },
    courier: { fontFamily: "Helvetica-Bold", fontSize: font + 4 },
    barcode: { height: mm(14), width: "100%", objectFit: "contain" },
    code: { fontFamily: "Helvetica-Bold", fontSize: font + 2, letterSpacing: 1, marginTop: 2 },
    label: { fontSize: font - 1, textTransform: "uppercase", marginBottom: 1 },
    bold: { fontFamily: "Helvetica-Bold" },
    strong: { fontFamily: "Helvetica-Bold", fontSize: font + 1 },
    small: { fontSize: font - 1 },
  });
}
