import type { MetadataRoute } from "next";

import { listCategories, listProductSlugs } from "@/features/catalog/queries";
import { publicEnv } from "@/lib/env/public";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = publicEnv.NEXT_PUBLIC_SITE_URL;
  const [products, categories] = await Promise.all([listProductSlugs(), listCategories()]);

  return [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/products`, changeFrequency: "daily", priority: 0.9 },
    ...categories.map((c) => ({
      url: `${base}/products?category=${encodeURIComponent(c.slug)}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...products.map((p) => ({
      url: `${base}/products/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
