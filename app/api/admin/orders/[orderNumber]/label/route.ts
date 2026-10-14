import { adminLabel } from "@/features/documents/handlers";

/** PDF resi thermal — admin. Ukuran: `?size=100x150|100x100|80|58` atau `?w=&h=` (mm). */
export async function GET(
  request: Request,
  ctx: RouteContext<"/api/admin/orders/[orderNumber]/label">,
) {
  const { orderNumber } = await ctx.params;
  return adminLabel(decodeURIComponent(orderNumber), new URL(request.url).searchParams);
}
