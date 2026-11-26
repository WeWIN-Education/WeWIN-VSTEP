import type { MetadataRoute } from "next";
import { siteOrigin, publicPaths } from "@/lib/site-pages";

export default function sitemap(): MetadataRoute.Sitemap {
  return publicPaths.map(path => ({ url: siteOrigin + path }));
}
