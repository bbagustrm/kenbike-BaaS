import "server-only";

import { createClient } from "@/lib/supabase/server";

export type AdminCategory = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  sortOrder: number;
  productCount: number;
};

/** Data admin selalu segar (tanpa cache) dan dibaca dengan session admin (RLS). */
export async function listAdminCategories(): Promise<AdminCategory[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug, parent_id, sort_order, products(count)")
    .order("sort_order")
    .order("name");
  if (error) throw new Error(`listAdminCategories: ${error.message}`);

  return data.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    parentId: c.parent_id,
    sortOrder: c.sort_order,
    productCount: c.products[0]?.count ?? 0,
  }));
}

/** Urutan tampilan pohon: induk diikuti anak-anaknya. */
export function asTree(categories: AdminCategory[]): (AdminCategory & { depth: number })[] {
  const roots = categories.filter((c) => !c.parentId);
  return roots.flatMap((root) => [
    { ...root, depth: 0 },
    ...categories.filter((c) => c.parentId === root.id).map((child) => ({ ...child, depth: 1 })),
  ]);
}
