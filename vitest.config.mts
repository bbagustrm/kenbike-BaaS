import { defineConfig } from "vitest/config";

// Semua test saat ini murni logika (tanpa DOM) → environment node jauh lebih cepat
// daripada jsdom. Tambahkan `// @vitest-environment jsdom` per file bila perlu DOM.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["node_modules", ".next"],
    // Nilai dummy agar modul yang membaca lib/env/public bisa di-import di test.
    env: {
      NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
    },
  },
});
