import type { NextConfig } from "next";

/**
 * Security headers untuk semua route.
 * Didefinisikan di file ini (bukan di lib/) karena `next start` di Node tidak
 * bisa me-require modul TypeScript lain dari next.config.ts.
 *
 * CSP tanpa nonce: nonce mewajibkan render dinamis dan tidak kompatibel dengan
 * Partial Prerendering (lihat docs Next "content-security-policy"), jadi
 * script inline diizinkan tetapi semua SUMBER eksternal dibatasi ke daftar ini.
 */
type HeaderOptions = {
  supabaseUrl: string;
  isDev: boolean;
  /** Situs dilayani lewat HTTPS → paksa HTTPS (HSTS, upgrade-insecure-requests). */
  https: boolean;
};

export function contentSecurityPolicy({ supabaseUrl, isDev, https }: HeaderOptions): string {
  const supabase = new URL(supabaseUrl);
  const supabaseWs = `wss://${supabase.host}`;
  // Snap.js + popup pembayaran (sandbox & produksi).
  const midtrans = "https://*.midtrans.com";

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": ["'self'", "'unsafe-inline'", ...(isDev ? ["'unsafe-eval'"] : []), midtrans],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": [
      "'self'",
      "data:",
      "blob:",
      supabase.origin,
      "https://lh3.googleusercontent.com",
      midtrans,
    ],
    "font-src": ["'self'", "data:"],
    "connect-src": ["'self'", supabase.origin, supabaseWs, midtrans],
    // Video YouTube di deskripsi produk (mode privasi, tanpa cookie pelacak).
    "frame-src": [midtrans, "https://www.youtube-nocookie.com"],
    // Login Google & redirect auth Supabase bisa terjadi lewat form (tanpa JS).
    "form-action": ["'self'", supabase.origin, "https://accounts.google.com"],
    "frame-ancestors": ["'none'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
  };

  const policy = Object.entries(directives).map(([key, values]) => `${key} ${values.join(" ")}`);
  // Hanya di HTTPS: di http://localhost (next start, E2E) upgrade memutus redirect.
  if (https) policy.push("upgrade-insecure-requests");
  return policy.join("; ");
}

export function securityHeaders(options: HeaderOptions) {
  return [
    { key: "Content-Security-Policy", value: contentSecurityPolicy(options) },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value:
        'camera=(), microphone=(), geolocation=(), payment=(self "https://app.midtrans.com" "https://app.sandbox.midtrans.com")',
    },
    ...(!options.https
      ? []
      : [
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ]),
  ];
}

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  images: {
    remotePatterns: [
      // Gambar produk dari Supabase Storage (bucket publik) dan avatar Google.
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  partialPrefetching: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders({
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://invalid.supabase.co",
          isDev: process.env.NODE_ENV === "development",
          https: process.env.NEXT_PUBLIC_SITE_URL?.startsWith("https://") ?? false,
        }),
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
