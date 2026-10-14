import { customerInvoice } from "@/features/documents/handlers";

/** PDF invoice (A4) untuk pembeli — hanya pesanan miliknya yang sudah dibayar. */
export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/orders/[orderNumber]/invoice">,
) {
  const { orderNumber } = await ctx.params;
  return customerInvoice(decodeURIComponent(orderNumber));
}
