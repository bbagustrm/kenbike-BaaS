import type { Metadata } from "next";

import { AdminPageHeader } from "@/features/admin";
import {
  AddCategoryButton,
  CategoryTable,
} from "@/features/admin/categories/components/category-table";
import { asTree, listAdminCategories } from "@/features/admin/categories/queries";

export const metadata: Metadata = { title: "Kategori · Admin" };

export default async function AdminCategoriesPage() {
  const categories = await listAdminCategories();
  const parents = categories.filter((c) => !c.parentId);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Kategori"
        description={`${categories.length} kategori`}
        actions={<AddCategoryButton parents={parents} />}
      />
      <CategoryTable rows={asTree(categories)} />
    </div>
  );
}
