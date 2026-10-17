"use client";

import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

/**
 * Jumlah percakapan belum dibaca (admin: butuh balasan; pembeli: balasan baru).
 * Diperbarui lewat Realtime saat ringkasan percakapan berubah. Tidak tampil bila 0.
 */
export function UnreadBadge({ className }: { className?: string }) {
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
    const channel = supabase
      .channel(`chat:unread:${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, load)
      .subscribe();
    return () => {
      clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, []);

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
