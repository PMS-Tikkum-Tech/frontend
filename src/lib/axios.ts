import axios, { AxiosHeaders } from "axios";
import {
  clearClientAuthCookies,
  isSessionExpired,
  syncClientAuthCookies,
} from "@/lib/auth-cookies";

export const AUTH_SESSION_STORAGE_KEY = "kyra.auth.session";

const SESSION_EXPIRED_MESSAGE = "Sesi login berakhir. Silakan masuk kembali.";

type StoredSession = {
  user?: {
    id: number;
    name: string;
    email: string;
    role: "admin" | "owner" | "tenant";
    avatar?: string | null;
  };
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string | null;
  refreshTokenExpiresAt?: string | null;
};

type RefreshResponsePayload = {
  data?: {
    user?: {
      id: number;
      full_name?: string;
      email: string;
      role: "admin" | "owner" | "tenant";
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
  syncClientAuthCookies({
    role: session.user.role,
    accessToken: session.accessToken,
    expiresAt: session.expiresAt,
    refreshToken: session.refreshToken,
    refreshTokenExpiresAt: session.refreshTokenExpiresAt,
  });
};

const isProtectedPath = (pathname: string) =>
  pathname.startsWith("/admin") ||
  pathname.startsWith("/owner") ||
  pathname.startsWith("/tenant");

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

const refreshClient = axios.create({
  baseURL: resolveApiBaseUrl(),
  withCredentials: false,
  headers: {
    "Content-Type": "application/json",
  },
});

const canRefreshSession = (session: StoredSession | null) =>
  Boolean(
    session?.refreshToken &&
      !isSessionExpired(session.refreshTokenExpiresAt)
  );

const mapRefreshSession = (payload?: RefreshResponsePayload["data"] | null): StoredSession | null => {
  if (
    !payload?.user ||
    !payload.token ||
    !payload.refresh_token
  ) {
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
    accessToken: payload.token,
    refreshToken: payload.refresh_token,
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
    .post<RefreshResponsePayload>("/api/v1/auth/refresh", {
      refresh_token: currentSession?.refreshToken,
    })
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
  withCredentials: false,
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

  if (isSessionExpired(session.expiresAt) || !session.accessToken) {
    session = await refreshClientSession();
    if (!session?.accessToken) {
      clearClientSession();
      redirectToAuth();
      return config;
    }
  }

  const headers = AxiosHeaders.from(config.headers);
  headers.set("Authorization", `Bearer ${session.accessToken}`);
  config.headers = headers;

  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (
      isAuthFailureResponse(error) &&
      axios.isAxiosError(error) &&
      error.config &&
      !isRefreshEndpoint(error.config.url) &&
      !(error.config as { _retry?: boolean })._retry
    ) {
      const refreshedSession = await refreshClientSession();

      if (refreshedSession?.accessToken) {
        const retryConfig = error.config;
        (retryConfig as { _retry?: boolean })._retry = true;
        const headers = AxiosHeaders.from(retryConfig.headers);
        headers.set("Authorization", `Bearer ${refreshedSession.accessToken}`);
        retryConfig.headers = headers;
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
