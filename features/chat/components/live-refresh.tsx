"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { createClient } from "@/lib/supabase/client";

/** Muat ulang data server (mis. daftar inbox) saat ada perubahan percakapan via Realtime. */
export function ConversationsLiveRefresh() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const channel = supabase
      .channel(`chat:inbox:${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => {
        clearTimeout(timer);
        timer = setTimeout(() => router.refresh(), 500);
      })
      .subscribe();
    return () => {
      clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
