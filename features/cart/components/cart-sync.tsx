"use client";

import { useEffect } from "react";

import { syncCartSession, useCartStore } from "../store";

/**
 * Menjembatani session (dibaca di server) ke store keranjang. Dirender ulang
 * oleh server setelah login/logout, sehingga perubahan userId memicu sinkronisasi.
 */
export function CartSync({ userId }: { userId: string | null }) {
  const hydrated = useCartStore((s) => s.hydrated);

  useEffect(() => {
    // Baca localStorage setelah mount (persist memakai skipHydration).
    void Promise.resolve(useCartStore.persist.rehydrate()).then(() =>
      useCartStore.setState({ hydrated: true }),
    );
  }, []);

  useEffect(() => {
    if (hydrated) void syncCartSession(userId);
  }, [hydrated, userId]);

  return null;
}
