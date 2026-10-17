import { describe, expect, it } from "vitest";

import { contentSecurityPolicy, securityHeaders } from "./next.config";

const supabaseUrl = "https://abc.supabase.co";

describe("contentSecurityPolicy", () => {
  const prod = contentSecurityPolicy({ supabaseUrl, isDev: false, https: true });
  const directive = (name: string) =>
    prod
      .split("; ")
      .find((d) => d.startsWith(`${name} `))
      ?.split(" ")
      .slice(1);

  it("mengizinkan Supabase (REST, storage, realtime) & Midtrans", () => {
    expect(directive("connect-src")).toEqual(
      expect.arrayContaining([supabaseUrl, "wss://abc.supabase.co", "https://*.midtrans.com"]),
    );
    expect(directive("frame-src")).toEqual([
      "https://*.midtrans.com",
      "https://www.youtube-nocookie.com",
    ]);
    expect(directive("img-src")).toContain(supabaseUrl);
  });

  it("menolak framing, plugin, dan base tag asing", () => {
    expect(directive("frame-ancestors")).toEqual(["'none'"]);
    expect(directive("object-src")).toEqual(["'none'"]);
    expect(directive("base-uri")).toEqual(["'self'"]);
  });

  it("unsafe-eval hanya di development; HTTPS dipaksa hanya bila situs HTTPS", () => {
    expect(prod).not.toContain("unsafe-eval");
    expect(prod).toContain("upgrade-insecure-requests");
    expect(contentSecurityPolicy({ supabaseUrl, isDev: true, https: false })).toContain(
      "'unsafe-eval'",
    );
    expect(contentSecurityPolicy({ supabaseUrl, isDev: false, https: false })).not.toContain(
      "upgrade-insecure-requests",
    );
  });
});

describe("securityHeaders", () => {
  it("HSTS hanya bila situs HTTPS", () => {
    const keys = (https: boolean) =>
      securityHeaders({ supabaseUrl, isDev: false, https }).map((h) => h.key);
    expect(keys(true)).toContain("Strict-Transport-Security");
    expect(keys(false)).not.toContain("Strict-Transport-Security");
    expect(keys(false)).toEqual(
      expect.arrayContaining(["Content-Security-Policy", "X-Frame-Options", "Referrer-Policy"]),
    );
  });
});
