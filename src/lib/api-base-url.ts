const DEFAULT_LOCAL_API_BASE_URL = "http://127.0.0.1:3001";

export const resolveApiBaseUrl = () => {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  const envBaseUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (envBaseUrl) {
    return envBaseUrl.replace(/\/$/, "");
  }

  return DEFAULT_LOCAL_API_BASE_URL;
};
