import "server-only";

import { type DocumentProps, renderToBuffer } from "@react-pdf/renderer";
import { toBuffer as barcodePng } from "bwip-js/node";
import { createElement, type ReactElement } from "react";

import { getStoreInfo } from "@/lib/store-info";

import type { DocumentOrder } from "./data";
import type { LabelSize } from "./label-size";
import { InvoicePdf } from "./pdf/invoice-pdf";
import { LabelPdf } from "./pdf/label-pdf";

/** Komponen kita membungkus <Document>; tipe renderToBuffer meminta elemen Document langsung. */
const asDocument = (element: ReactElement) => element as ReactElement<DocumentProps>;

export async function renderInvoicePdf(order: DocumentOrder): Promise<Buffer> {
  const store = await getStoreInfo();
  return renderToBuffer(asDocument(createElement(InvoicePdf, { order, store })));
}

export async function renderLabelPdf(order: DocumentOrder, size: LabelSize): Promise<Buffer> {
  const [store, barcode] = await Promise.all([
    getStoreInfo(),
    barcodePng({
      bcid: "code128",
      text: order.waybillId ?? order.orderNumber,
      scale: 3,
      height: 12,
      includetext: false,
    }),
  ]);
  return renderToBuffer(asDocument(createElement(LabelPdf, { order, store, size, barcode })));
}

/** Respons unduhan PDF; tidak di-cache (berisi data pribadi). */
export function pdfResponse(pdf: Buffer, fileName: string): Response {
  return new Response(new Uint8Array(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${fileName}"`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
