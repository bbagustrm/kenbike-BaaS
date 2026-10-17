"use client";

import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

const REFRESH_MS = 60_000;

/**
 * Jumlah pertanyaan produk yang belum dijawab admin (sidebar). Dimuat saat
 * tampil, saat tab kembali aktif, dan berkala. Tidak tampil bila 0.
 */
export function UnansweredCommentsBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      createClient()
        .rpc("admin_unanswered_comment_count")
        .then(({ data }) => !cancelled && setCount(data ?? 0));
    void load();
    const onVisible = () => document.visibilityState === "visible" && void load();
    document.addEventListener("visibilitychange", onVisible);
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(timer);
    };
  }, []);

  if (count === 0) return null;
  return (
    <span
      className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-medium text-white tabular-nums"
      aria-label={`${count} pertanyaan belum dijawab`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
