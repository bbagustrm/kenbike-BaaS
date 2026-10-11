"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    // TODO(#76): kirim ke error monitoring.
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <h1 className="text-3xl font-bold tracking-tight">Terjadi kesalahan</h1>
      <p className="max-w-md text-muted-foreground">
        Maaf, ada yang tidak beres. Silakan coba lagi.
        {error.digest && <span className="mt-2 block font-mono text-xs">Kode: {error.digest}</span>}
      </p>
      <Button onClick={() => retry()}>Coba lagi</Button>
    </main>
  );
}
