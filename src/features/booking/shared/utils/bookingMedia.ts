import { resolveApiBaseUrl } from "@/lib/api-base-url";

export const resolveBookingMediaUrl = (path?: string | null) => {
  const normalized = path?.trim();
  if (!normalized) {
    return "/bg-1200.webp";
  }

  if (/^data:image\//i.test(normalized) || /^https?:\/\//i.test(normalized)) {
    return normalized;
  }

  const baseUrl = resolveApiBaseUrl();

  return `${baseUrl}${normalized.startsWith("/") ? normalized : `/${normalized}`}`;
};

export const firstBookingMediaUrl = (
  ...candidates: Array<string | string[] | null | undefined>
) => {
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      const first = candidate.find((item) => item?.trim());
      if (first) {
        return resolveBookingMediaUrl(first);
      }
      continue;
    }

    if (candidate?.trim()) {
      return resolveBookingMediaUrl(candidate);
    }
  }

  return "/bg-1200.webp";
};
