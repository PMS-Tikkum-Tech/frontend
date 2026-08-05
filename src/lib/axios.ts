import axios from "axios";
import { resolveApiBaseUrl } from "@/lib/api-base-url";

const SESSION_EXPIRED_MESSAGE = "Sesi login berakhir. Silakan masuk kembali.";

const isProtectedPath = (pathname: string) =>
  pathname.startsWith("/admin") ||
  pathname.startsWith("/owner") ||
  pathname.startsWith("/tenant");

const isAuthBootstrapEndpoint = (url?: string | null) =>
  Boolean(
    url?.includes("/api/v1/auth/login") ||
    url?.includes("/api/v1/auth/refresh") ||
    url?.includes("/api/v1/auth/password/") ||
    url?.includes("/api/v1/auth/tenant/register/")
  );

const redirectToAuth = () => {
  if (typeof window === "undefined" || !isProtectedPath(window.location.pathname)) return;
  const loginUrl = new URL("/auth", window.location.origin);
  loginUrl.searchParams.set("next", `${window.location.pathname}${window.location.search}`);
  window.location.replace(loginUrl.toString());
};

const refreshClient = axios.create({
  baseURL: resolveApiBaseUrl(),
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

let refreshPromise: Promise<boolean> | null = null;

const refreshSession = () => {
  if (!refreshPromise) {
    refreshPromise = refreshClient
      .post("/api/v1/auth/refresh", {})
      .then(() => true)
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

const axiosInstance = axios.create({
  baseURL: resolveApiBaseUrl(),
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      error.config &&
      !isAuthBootstrapEndpoint(error.config.url) &&
      !(error.config as { _retry?: boolean })._retry
    ) {
      const refreshed = await refreshSession();
      if (refreshed) {
        (error.config as { _retry?: boolean })._retry = true;
        return axiosInstance.request(error.config);
      }

      if (error.response.data && typeof error.response.data === "object") {
        (error.response.data as { message?: string }).message = SESSION_EXPIRED_MESSAGE;
      }
      redirectToAuth();
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
