import "server-only";

import { getAdminOrder } from "@/features/admin/orders/queries";
import { getMyOrder } from "@/features/orders/queries";
import { getCurrentUser } from "@/lib/auth/session";
import { errorMessage, log } from "@/lib/log";
import { RATE_LIMITED_MESSAGE, rateLimit } from "@/lib/rate-limit";

import {
  canDownloadInvoice,
  canDownloadLabel,
  documentFileName,
  fromAdminOrder,
  fromCustomerOrder,
} from "./data";
import { parseLabelSize } from "./label-size";
import { pdfResponse, renderInvoicePdf, renderLabelPdf } from "./render";

const notFound = () => Response.json({ error: "Tidak ditemukan" }, { status: 404 });

/** Login + rate limit; `admin` = wajib admin (selain itu 404, sama seperti halaman admin). */
async function authorize(admin: boolean) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Silakan masuk terlebih dahulu" }, { status: 401 });
  if (admin && user.role !== "admin") return notFound();
  if (!(await rateLimit("documents", user.id))) {
    return Response.json({ error: RATE_LIMITED_MESSAGE }, { status: 429 });
  }
  return user;
}

async function render(kind: "Invoice" | "Resi", orderNumber: string, make: () => Promise<Buffer>) {
  try {
    return pdfResponse(await make(), documentFileName(kind, orderNumber));
  } catch (error) {
    log("error", "documents.render_failed", { kind, orderNumber, message: errorMessage(error) });
    return Response.json({ error: "Gagal membuat PDF. Coba lagi." }, { status: 500 });
  }
}

/** Invoice milik pembeli yang login (RLS memastikan kepemilikan). */
export async function customerInvoice(orderNumber: string): Promise<Response> {
  const user = await authorize(false);
  if (user instanceof Response) return user;
  const order = await getMyOrder(orderNumber);
  if (!order || !canDownloadInvoice(order.paymentStatus)) return notFound();
  const doc = fromCustomerOrder(order, { name: user.fullName, email: user.email });
  return render("Invoice", doc.orderNumber, () => renderInvoicePdf(doc));
}

export async function adminInvoice(orderNumber: string): Promise<Response> {
  const user = await authorize(true);
  if (user instanceof Response) return user;
  const order = await getAdminOrder(orderNumber);
  if (!order || !canDownloadInvoice(order.paymentStatus)) return notFound();
  const doc = fromAdminOrder(order);
  return render("Invoice", doc.orderNumber, () => renderInvoicePdf(doc));
}

export async function adminLabel(orderNumber: string, params: URLSearchParams): Promise<Response> {
  const user = await authorize(true);
  if (user instanceof Response) return user;
  const order = await getAdminOrder(orderNumber);
  if (!order || !canDownloadLabel(order.paymentStatus, order.shippingStatus)) return notFound();
  const doc = fromAdminOrder(order);
  return render("Resi", doc.orderNumber, () => renderLabelPdf(doc, parseLabelSize(params)));
}
