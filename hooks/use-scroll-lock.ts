"use client";

import { useEffect } from "react";

let locks = 0;
let saved: { overflow: string; paddingRight: string } | null = null;

/**
 * Kunci scroll halaman tanpa mencadangkan area scrollbar.
 *
 * Scroll lock bawaan Base UI memakai `scrollbar-gutter: stable`, sehingga
 * elemen fixed (sheet, overlay) berhenti sebelum area scrollbar dan menyisakan
 * celah kosong di kanan pada scrollbar klasik (Windows). Di sini scrollbar
 * benar-benar disembunyikan dan lebarnya diganti padding pada <body> agar
 * konten tidak bergeser. Mendukung lock bertumpuk.
 */
export function useScrollLock(active = true) {
  useEffect(() => {
    if (!active) return;
    const html = document.documentElement;
    const body = document.body;
    if (locks === 0) {
      const scrollbarWidth = window.innerWidth - html.clientWidth;
      saved = { overflow: html.style.overflow, paddingRight: body.style.paddingRight };
      html.style.overflow = "hidden";
      if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;
    }
    locks++;
    return () => {
      locks--;
      if (locks === 0 && saved) {
        html.style.overflow = saved.overflow;
        body.style.paddingRight = saved.paddingRight;
        saved = null;
      }
    };
  }, [active]);
}
