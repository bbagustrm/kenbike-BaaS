"use client";

import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

import { CHAT_BUCKET } from "../schemas";

const TTL_SECONDS = 60 * 60;

/**
 * Signed URL untuk lampiran (nilai "" = tidak tersedia) (bucket privat). Diminta sekaligus per batch dan
 * disimpan selama komponen hidup; policy Storage memastikan hanya peserta
 * percakapan yang mendapat URL.
 */
export function useAttachmentUrls(paths: readonly string[]): Record<string, string> {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const key = paths.join("|");

  useEffect(() => {
    const missing = paths.filter((p) => !(p in urls));
    if (missing.length === 0) return;
    let cancelled = false;
    createClient()
      .storage.from(CHAT_BUCKET)
      .createSignedUrls(missing, TTL_SECONDS)
      .then(({ data }) => {
        if (cancelled || !data) return;
        setUrls((prev) => {
          const next = { ...prev };
          // "" = gagal (mis. file sudah dihapus) → UI menampilkan "tidak tersedia".
          for (const [i, item] of data.entries())
            next[item.path ?? missing[i]!] = item.signedUrl ?? "";
          return next;
        });
      });
    return () => {
      cancelled = true;
    };
    // `urls` sengaja tidak jadi dependensi: hanya path baru yang memicu permintaan.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return urls;
}
