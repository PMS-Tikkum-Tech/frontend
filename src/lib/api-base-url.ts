const DEFAULT_LOCAL_API_BASE_URL = "http://127.0.0.1:3002";

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0"]);
const PRODUCTION_API_BASE_URLS: Record<string, string> = {
  "kikost.com": "https://api.kikost.com",
  "www.kikost.com": "https://api.kikost.com",
  "booking.kikost.com": "https://api.kikost.com",
  "app.kikost.com": "https://api.kikost.com",
  "dashboard.kikost.com": "https://api.kikost.com",
};

const normalizeLocalhost = (hostname: string) => {
  if (hostname === "::1") return "[::1]";

  if (hostname === "0.0.0.0") {
    return "127.0.0.1";
  }

  return hostname;
};

export const resolveApiBaseUrl = () => {
  const envBaseUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (envBaseUrl) {
    if (typeof window !== "undefined" && LOCAL_HOSTNAMES.has(window.location.hostname)) {
      try {
        const configuredUrl = new URL(envBaseUrl);
        if (LOCAL_HOSTNAMES.has(configuredUrl.hostname)) {
          configuredUrl.hostname = window.location.hostname;
          return configuredUrl.toString().replace(/\/$/, "");
        }
      } catch {
        // Invalid environment values fall through to the existing value.
      }
    }

    return envBaseUrl.replace(/\/$/, "");
  }

  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    if (LOCAL_HOSTNAMES.has(hostname)) {
      const apiHost = normalizeLocalhost(hostname);
      return `${window.location.protocol}//${apiHost}:3002`;
    }

    const mappedProductionApiBaseUrl = PRODUCTION_API_BASE_URLS[hostname];
    if (mappedProductionApiBaseUrl) {
      return mappedProductionApiBaseUrl;
    }

    // Production must use NEXT_PUBLIC_API_URL or a same-origin reverse proxy.
    // Do not assume :3001 is reachable from a public browser.
    return window.location.origin;
  }

  return DEFAULT_LOCAL_API_BASE_URL;
};
