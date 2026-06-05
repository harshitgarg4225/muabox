import type { MetadataRoute } from "next";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://muabox.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/login", "/privacy", "/terms"],
      // Keep authenticated areas and APIs out of search indexes.
      disallow: [
        "/api/",
        "/dashboard",
        "/deals",
        "/discover",
        "/artists",
        "/settings",
        "/onboarding",
        "/data-deletion-status",
      ],
    },
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
