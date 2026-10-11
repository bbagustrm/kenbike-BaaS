import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { publicEnv } from "@/lib/env/public";

import { Providers } from "./providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.NEXT_PUBLIC_SITE_URL),
  title: {
    default: "KenBike — Toko Sepeda & Aksesoris",
    template: "%s · KenBike",
  },
  description: "Belanja sepeda, sparepart, dan aksesoris dengan pengiriman ke seluruh Indonesia.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
