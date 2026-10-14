import "server-only";

import { firstParam } from "@/lib/search";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

type Role = Database["public"]["Enums"]["user_role"];

export const USERS_PAGE_SIZE = 20;

export type AdminUserParams = { q?: string; role?: Role; page: number };

export function parseAdminUserParams(
  raw: Record<string, string | string[] | undefined>,
): AdminUserParams {
  const role = firstParam(raw.role);
  return {
    q: firstParam(raw.q)?.trim().slice(0, 100) || undefined,
    role: role === "admin" || role === "customer" ? role : undefined,
    page: Math.max(1, Math.min(500, Number.parseInt(firstParam(raw.page) ?? "1", 10) || 1)),
  };
}

export type AdminUser = {
  id: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  role: Role;
  createdAt: string;
  lastSignInAt: string | null;
  orderCount: number;
};

/** Pengguna + email (auth.users) lewat RPC admin_list_users (admin saja). */
export async function listAdminUsers(params: AdminUserParams) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_list_users", {
    p_query: params.q,
    p_role: params.role,
    p_limit: USERS_PAGE_SIZE,
    p_offset: (params.page - 1) * USERS_PAGE_SIZE,
  });
  if (error) throw new Error(`admin_list_users: ${error.message}`);

  const total = data[0]?.total_count ?? 0;
  const users: AdminUser[] = data.map((u) => ({
    id: u.id,
    email: u.email,
    fullName: u.full_name,
    phone: u.phone,
    role: u.role,
    createdAt: u.created_at,
    lastSignInAt: u.last_sign_in_at,
    orderCount: u.order_count,
  }));
  return { users, total, pageCount: Math.ceil(total / USERS_PAGE_SIZE) };
}
