"use client";

import { useEffect } from "react";

/**
 * Menyimpan lebar area scrollbar yang sedang dicadangkan ke `--scrollbar-width`.
 * Base UI mengunci scroll dengan `scrollbar-gutter: stable`, sehingga elemen
 * fixed (overlay, sheet) berhenti sebelum area scrollbar dan menyisakan celah
 * kosong di kanan; sheet & overlay memakai variabel ini untuk menutupinya.
 */
export function ScrollbarWidth() {
  useEffect(() => {
    const html = document.documentElement;
    const update = () => {
      // Gutter `scrollbar-gutter: stable` tidak tercermin di html.clientWidth,
      // tetapi mempersempit <body> (body tanpa margin, lihat preflight).
      const width = Math.max(0, window.innerWidth - document.body.clientWidth);
      html.style.setProperty("--scrollbar-width", `${width}px`);
    };
    update();
    // Scroll lock mengubah atribut style <html>.
    const observer = new MutationObserver(update);
    observer.observe(html, { attributes: true, attributeFilter: ["style"] });
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  return null;
}
