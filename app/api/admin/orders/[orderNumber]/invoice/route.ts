import { adminInvoice } from "@/features/documents/handlers";

/** PDF invoice (A4) — admin. */
export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/admin/orders/[orderNumber]/invoice">,
) {
  const { orderNumber } = await ctx.params;
  return adminInvoice(decodeURIComponent(orderNumber));
}
