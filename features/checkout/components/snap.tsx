"use client";

import Script from "next/script";

import { publicEnv } from "@/lib/env/public";

type SnapResult = "success" | "pending" | "error" | "close";

type SnapCallbacks = {
  onSuccess?: () => void;
  onPending?: () => void;
  onError?: () => void;
  onClose?: () => void;
};

declare global {
  interface Window {
    snap?: { pay: (token: string, callbacks: SnapCallbacks) => void };
  }
}

const CLIENT_KEY = publicEnv.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY;
// Client key sandbox selalu berawalan "SB-".
const SNAP_URL = CLIENT_KEY?.startsWith("SB-")
  ? "https://app.sandbox.midtrans.com/snap/snap.js"
  : "https://app.midtrans.com/snap/snap.js";

/** Muat snap.js sekali; taruh di halaman yang bisa membuka pembayaran. */
export function SnapScript() {
  if (!CLIENT_KEY) return null;
  return <Script src={SNAP_URL} data-client-key={CLIENT_KEY} strategy="afterInteractive" />;
}

/**
 * Buka popup Snap. Hasil callback client hanya untuk navigasi — status
 * pembayaran yang sah tetap dari webhook (dibaca dari DB di halaman finish).
 */
export function openSnap(token: string): Promise<SnapResult> {
  return new Promise((resolve, reject) => {
    if (!window.snap) {
      reject(new Error("Snap belum termuat"));
      return;
    }
    window.snap.pay(token, {
      onSuccess: () => resolve("success"),
      onPending: () => resolve("pending"),
      onError: () => resolve("error"),
      onClose: () => resolve("close"),
    });
  });
}
