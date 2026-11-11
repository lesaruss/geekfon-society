// geekfon.ai/robots.txt (site health 2026-11-11): everything public may be crawled; the signed-in
// and account areas and the API stay out. Points Google at the sitemap.
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/dashboard", "/auth/", "/login", "/register", "/complete-profile"] },
    sitemap: "https://geekfon.ai/sitemap.xml",
  };
}
