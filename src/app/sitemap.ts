import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://kikost.com/",
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: "https://kikost.com/sewa",
      changeFrequency: "daily",
      priority: 0.8,
    },
  ];
}
