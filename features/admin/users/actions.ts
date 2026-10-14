"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import type { ActionState } from "@/lib/action-state";
import { dbErrorMessage } from "@/lib/db-errors";
import { createClient } from "@/lib/supabase/server";

import { assertAdminAction } from "../guard";

const schema = z.object({ userId: z.uuid(), role: z.enum(["admin", "customer"]) });

/** Ubah role lewat RPC admin_set_role (menolak menurunkan admin terakhir). */
export async function setUserRole(userId: string, role: string): Promise<ActionState> {
  const denied = await assertAdminAction();
  if (denied) return denied;
  const parsed = schema.safeParse({ userId, role });
  if (!parsed.success) return { status: "error", message: "Data tidak valid." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_role", {
    p_user_id: parsed.data.userId,
    p_role: parsed.data.role,
  });
  if (error) return { status: "error", message: dbErrorMessage(error) };

  refresh();
  return {
    status: "success",
    message: parsed.data.role === "admin" ? "Pengguna dijadikan admin." : "Akses admin dicabut.",
  };
}
