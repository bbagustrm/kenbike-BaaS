"use client";

import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

/**
 * Jumlah percakapan belum dibaca (admin: butuh balasan; pembeli: balasan baru).
 * `live` = berlangganan Realtime (area akun/admin). Tanpa `live` (mis. header di
 * semua halaman) cukup dimuat saat tampil & saat tab kembali aktif agar tidak
 * membuka koneksi websocket untuk setiap pengunjung. Tidak tampil bila 0.
 */
export function UnreadBadge({ className, live = false }: { className?: string; live?: boolean }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const load = () => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        const { data } = await supabase.rpc("unread_conversation_count");
        setCount(data ?? 0);
      }, 300);
    };
    load();

    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisible);

    const channel = live
      ? supabase
          .channel(`chat:unread:${crypto.randomUUID()}`)
          .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, load)
          .subscribe()
      : null;

    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [live]);

  if (count === 0) return null;
  return (
    <span
      className={cn(
        "flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-medium text-white tabular-nums",
        className,
      )}
      aria-label={`${count} percakapan belum dibaca`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
