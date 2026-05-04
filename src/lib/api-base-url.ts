const DEFAULT_LOCAL_API_BASE_URL = "http://127.0.0.1:3001";

const normalizeLocalhost = (hostname: string) => {
  if (hostname === "localhost" || hostname === "::1" || hostname === "0.0.0.0") {
    return "127.0.0.1";
  }

  return hostname;
};

export const resolveApiBaseUrl = () => {
  const envBaseUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (envBaseUrl) {
    return envBaseUrl.replace(/\/$/, "");
  }

  if (typeof window !== "undefined") {
    const apiHost = normalizeLocalhost(window.location.hostname);
    return `${window.location.protocol}//${apiHost}:3001`;
  }

  return DEFAULT_LOCAL_API_BASE_URL;
};
