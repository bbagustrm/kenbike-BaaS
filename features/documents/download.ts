"use client";

import { useState } from "react";
import { toast } from "sonner";

/**
 * Unduh PDF lewat fetch agar error (429, 404, 500) tampil sebagai toast,
 * bukan file JSON yang ikut terunduh.
 */
export function useDownload() {
  const [pending, setPending] = useState(false);

  async function download(url: string, fallbackName: string) {
    setPending(true);
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        toast.error(body?.error ?? "Gagal mengunduh dokumen.");
        return;
      }
      const name =
        /filename="([^"]+)"/.exec(res.headers.get("content-disposition") ?? "")?.[1] ??
        fallbackName;
      const href = URL.createObjectURL(await res.blob());
      const link = Object.assign(document.createElement("a"), { href, download: name });
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(href), 10_000);
    } catch {
      toast.error("Gagal mengunduh dokumen. Periksa koneksi lalu coba lagi.");
    } finally {
      setPending(false);
    }
  }

  return { pending, download };
}
