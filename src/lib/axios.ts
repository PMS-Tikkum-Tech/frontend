import axios, { AxiosHeaders } from "axios";

export const AUTH_SESSION_STORAGE_KEY = "kyra.auth.session";
export const AUTH_COOKIE_KEY = "kyra_auth";
export const AUTH_ROLE_COOKIE_KEY = "kyra_role";

const SESSION_EXPIRED_MESSAGE = "Sesi login berakhir. Silakan masuk kembali.";

type StoredSession = {
  accessToken?: string;
  expiresAt?: string | null;
};

const clearStoredSession = () => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
  } catch {
    // Ignore storage failure.
  }
};

const clearAuthCookies = () => {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${AUTH_COOKIE_KEY}=; Path=/; Max-Age=0; SameSite=Lax`;
  document.cookie = `${AUTH_ROLE_COOKIE_KEY}=; Path=/; Max-Age=0; SameSite=Lax`;
};

const clearClientSession = () => {
  clearStoredSession();
  clearAuthCookies();
};

const isSessionExpired = (expiresAt?: string | null) => {
  if (!expiresAt) {
    return false;
  }

  const expiresAtMs = new Date(expiresAt).getTime();
  if (Number.isNaN(expiresAtMs)) {
    return false;
  }

  return Date.now() >= expiresAtMs;
};

const redirectToAuth = () => {
  if (typeof window === "undefined") {
    return;
  }

  if (window.location.pathname === "/auth") {
    return;
  }

  const loginUrl = new URL("/auth", window.location.origin);
  const nextPath = `${window.location.pathname}${window.location.search}`;
  if (nextPath && nextPath !== "/auth") {
    loginUrl.searchParams.set("next", nextPath);
  }

  window.location.replace(loginUrl.toString());
};

const isAuthFailureResponse = (error: unknown) => {
  if (!axios.isAxiosError(error)) {
    return false;
  }

  if (error.response?.status !== 401) {
    return false;
  }

  const payload = error.response?.data as { message?: string } | undefined;
  const message = payload?.message?.toLowerCase() || "";

  return (
    message.includes("authentication token has expired") ||
    message.includes("invalid authentication token") ||
    message.includes("authentication required") ||
    message.includes("token autentikasi telah kedaluwarsa") ||
    message.includes("token autentikasi tidak valid") ||
    message.includes("autentikasi diperlukan") ||
    message.includes("akses tidak terautentikasi")
  );
};

const resolveApiBaseUrl = () => {
  const envBaseUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (envBaseUrl) {
    return envBaseUrl;
  }

  // Default dev fallback: Next.js on :3000 and Rails API on :3001.
  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:3001`;
  }

  return "http://127.0.0.1:3001";
};

const axiosInstance = axios.create({
  baseURL: resolveApiBaseUrl(),
  withCredentials: false,
  headers: {
    "Content-Type": "application/json",
  },
});

axiosInstance.interceptors.request.use((config) => {
  if (typeof window === "undefined") {
    return config;
  }

  let rawSession: string | null = null;
  try {
    rawSession = window.localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
  } catch {
    return config;
  }

  if (!rawSession) {
    return config;
  }

  try {
    const session = JSON.parse(rawSession) as StoredSession;

    if (isSessionExpired(session.expiresAt)) {
      clearClientSession();
      redirectToAuth();
      return config;
    }

    if (session.accessToken) {
      const headers = AxiosHeaders.from(config.headers);
      headers.set("Authorization", `Bearer ${session.accessToken}`);
      config.headers = headers;
    }
  } catch {
    clearStoredSession();
  }

  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (isAuthFailureResponse(error)) {
      clearClientSession();

      if (axios.isAxiosError(error) && error.response?.data) {
        const payload = error.response.data as { message?: string };
        payload.message = SESSION_EXPIRED_MESSAGE;
      }

      redirectToAuth();
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
