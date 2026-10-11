"use client";

import { ThemeProvider } from "next-themes";

import { ScrollbarWidth } from "@/components/shared/scrollbar-width";
import { Toaster } from "@/components/ui/sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
      <Toaster richColors closeButton position="top-center" />
      <ScrollbarWidth />
    </ThemeProvider>
  );
}
