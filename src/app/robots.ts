import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/owner/", "/tenant/", "/auth/"],
    },
    sitemap: "https://kikost.com/sitemap.xml",
  };
}
