import type { MetadataRoute } from "next";
import { siteOrigin } from "@/lib/site-pages";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", disallow: ["/api/", "/manage/", "/login", "/history", "/profile/", "/dashboard"] },
    sitemap: siteOrigin + "/sitemap.xml",
  };
}
