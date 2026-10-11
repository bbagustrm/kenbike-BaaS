"use server";

import { refresh, updateTag } from "next/cache";

import type { ActionState } from "@/lib/action-state";
import { dbErrorMessage } from "@/lib/db-errors";
import { createClient } from "@/lib/supabase/server";
import { formDataToObject, validationError } from "@/lib/validation";

import { assertAdminAction } from "../guard";
import { categorySchema } from "./schemas";

function invalidateCatalog() {
  updateTag("categories");
  // Nama kategori ikut tampil di kartu & breadcrumb produk.
  updateTag("products");
  // Tabel admin tidak di-cache: render ulang halaman saat ini.
  refresh();
}

export async function saveCategory(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const denied = await assertAdminAction();
  if (denied) return denied;

  const values = formDataToObject(formData);
  const parsed = categorySchema.safeParse(values);
  if (!parsed.success) return validationError(parsed.error, values);
  const { id, name, slug, parentId, sortOrder } = parsed.data;

  const supabase = await createClient();

  // Hierarki dua tingkat: induk harus kategori utama, dan kategori yang punya
  // sub-kategori tidak boleh dijadikan sub-kategori.
  if (parentId) {
    const fail = (message: string): ActionState => ({
      status: "error",
      fieldErrors: { parentId: [message] },
      values,
    });
    if (parentId === id) return fail("Kategori tidak bisa menjadi induk dirinya sendiri");

    const { data: parent } = await supabase
      .from("categories")
      .select("parent_id")
      .eq("id", parentId)
      .maybeSingle();
    if (!parent || parent.parent_id) return fail("Induk harus kategori utama");

    if (id) {
      const { count } = await supabase
        .from("categories")
        .select("id", { count: "exact", head: true })
        .eq("parent_id", id);
      if (count) return fail("Kategori ini punya sub-kategori, jadi harus tetap kategori utama");
    }
  }

  const row = { name, slug, parent_id: parentId ?? null, sort_order: sortOrder };
  const { error } = id
    ? await supabase.from("categories").update(row).eq("id", id)
    : await supabase.from("categories").insert(row);

  if (error) {
    const message = dbErrorMessage(error);
    return error.code === "23505"
      ? { status: "error", fieldErrors: { slug: [message] }, values }
      : { status: "error", message, values };
  }

  invalidateCatalog();
  return { status: "success", message: id ? "Kategori diperbarui." : "Kategori ditambahkan." };
}

export async function deleteCategory(id: string): Promise<ActionState> {
  const denied = await assertAdminAction();
  if (denied) return denied;

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("categories")
    .delete({ count: "exact" })
    .eq("id", id);
  if (error) {
    return {
      status: "error",
      message:
        error.code === "23503"
          ? "Kategori masih dipakai produk atau sub-kategori. Pindahkan dulu isinya."
          : dbErrorMessage(error),
    };
  }
  if (!count) return { status: "error", message: "Kategori tidak ditemukan." };

  invalidateCatalog();
  return { status: "success", message: "Kategori dihapus." };
}
