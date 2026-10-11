import "server-only";

import { io } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

export type CurrentUser = {
  id: string;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  phone: string | null;
  role: Database["public"]["Enums"]["user_role"];
};

/**
 * Data Access Layer untuk session. Memverifikasi JWT (getClaims) lalu membaca
 * profile; di-dedupe per request dengan React cache(). Membaca cookies(), jadi
 * pemanggilnya harus berada di dalam <Suspense>.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  // getClaims() membaca waktu sekarang (cek kedaluwarsa token). Dengan Cache
  // Components + partial prefetching, cookies() tersedia saat runtime prefetch,
  // jadi tandai eksplisit bahwa sisa fungsi ini hanya berjalan saat request.
  await io();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, phone, role")
    .eq("id", data.claims.sub)
    .maybeSingle();
  if (!profile) return null;

  return {
    id: data.claims.sub,
    email: typeof data.claims.email === "string" ? data.claims.email : null,
    fullName: profile.full_name,
    avatarUrl: profile.avatar_url,
    phone: profile.phone,
    role: profile.role,
  };
});

/** Wajib login; jika tidak, arahkan ke /login dengan tujuan kembali. */
export async function requireUser(nextPath?: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login");
  }
  return user;
}

/** Wajib admin; selain itu 404 agar keberadaan halaman admin tidak terungkap. */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") notFound();
  return user;
}
