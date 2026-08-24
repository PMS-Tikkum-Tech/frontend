import axios from "axios";
import { clearClientAuthCookies, isSessionExpired } from "@/lib/auth-cookies";
import { resolveApiBaseUrl } from "@/lib/api-base-url";

export const AUTH_SESSION_STORAGE_KEY = "kyra.auth.session";

const SESSION_EXPIRED_MESSAGE = "Sesi login berakhir. Silakan masuk kembali.";

type StoredSession = {
  user?: {
    id: number;
    name: string;
    email: string;
    role: "admin" | "finance" | "owner" | "tenant" | "housekeeper" | "technician";
    avatar?: string | null;
  };
  expiresAt?: string | null;
  refreshTokenExpiresAt?: string | null;
};

type RefreshResponsePayload = {
  data?: {
    user?: {
      id: number;
      full_name?: string;
      email: string;
      role: "admin" | "finance" | "owner" | "tenant" | "housekeeper" | "technician";
      profile_picture_url?: string | null;
    };
    token?: string;
    refresh_token?: string;
    expires_at?: string | null;
    refresh_token_expires_at?: string | null;
  };
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

const clearClientSession = () => {
  clearStoredSession();
  clearClientAuthCookies();
};

const getStoredSession = () => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as StoredSession;
  } catch {
    clearStoredSession();
    return null;
  }
};

const setStoredSession = (session: StoredSession) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Ignore storage failure.
  }
};

const persistClientSession = (session: StoredSession) => {
  if (!session.user?.role) {
    clearClientSession();
    return;
  }

  setStoredSession(session);
};

const isProtectedPath = (pathname: string) =>
  pathname.startsWith("/admin") ||
  pathname.startsWith("/owner") ||
  pathname.startsWith("/tenant") ||
  pathname.startsWith("/staff");

const redirectToAuth = () => {
  if (typeof window === "undefined") {
    return;
  }

  if (!isProtectedPath(window.location.pathname)) {
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

const isRefreshEndpoint = (url?: string | null) =>
  Boolean(url?.includes("/api/v1/auth/refresh") || url?.includes("/auth/refresh"));

const refreshClient = axios.create({
  baseURL: resolveApiBaseUrl(),
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

const canRefreshSession = (session: StoredSession | null) =>
  Boolean(session?.user) &&
  (!session?.refreshTokenExpiresAt ||
    !isSessionExpired(session.refreshTokenExpiresAt));

const mapRefreshSession = (payload?: RefreshResponsePayload["data"] | null): StoredSession | null => {
  if (!payload?.user) {
    return null;
  }

  return {
    user: {
      id: payload.user.id,
      name: payload.user.full_name || payload.user.email,
      email: payload.user.email,
      role: payload.user.role,
      avatar: payload.user.profile_picture_url ?? null,
    },
    expiresAt: payload.expires_at ?? null,
    refreshTokenExpiresAt: payload.refresh_token_expires_at ?? null,
  };
};

let refreshSessionPromise: Promise<StoredSession | null> | null = null;

const refreshClientSession = async () => {
  if (typeof window === "undefined") {
    return null;
  }

  const currentSession = getStoredSession();
  if (!canRefreshSession(currentSession)) {
    clearClientSession();
    redirectToAuth();
    return null;
  }

  if (refreshSessionPromise) {
    return refreshSessionPromise;
  }

  refreshSessionPromise = refreshClient
    .post<RefreshResponsePayload>("/api/v1/auth/refresh", {})
    .then((response) => {
      const nextSession = mapRefreshSession(response.data.data);
      if (!nextSession) {
        clearClientSession();
        return null;
      }

      persistClientSession(nextSession);
      return nextSession;
    })
    .catch(() => {
      clearClientSession();
      redirectToAuth();
      return null;
    })
    .finally(() => {
      refreshSessionPromise = null;
    });

  return refreshSessionPromise;
};

const axiosInstance = axios.create({
  baseURL: resolveApiBaseUrl(),
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

axiosInstance.interceptors.request.use(async (config) => {
  if (typeof window === "undefined") {
    return config;
  }

  if (isRefreshEndpoint(config.url)) {
    return config;
  }

  let session = getStoredSession();
  if (!session) {
    return config;
  }

  if (isSessionExpired(session.expiresAt)) {
    session = await refreshClientSession();
    if (!session?.user) {
      clearClientSession();
      redirectToAuth();
    }
  }

  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (
      isAuthFailureResponse(error) &&
      axios.isAxiosError(error) &&
      error.config &&
      getStoredSession()?.user &&
      !isRefreshEndpoint(error.config.url) &&
      !(error.config as { _retry?: boolean })._retry
    ) {
      const refreshedSession = await refreshClientSession();

      if (refreshedSession?.user) {
        const retryConfig = error.config;
        (retryConfig as { _retry?: boolean })._retry = true;
        return axiosInstance.request(retryConfig);
      }
    }

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
