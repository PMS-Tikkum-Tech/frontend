"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { getMe, logoutUser } from "@/lib/auth";
import { AUTH_SESSION_STORAGE_KEY } from "@/lib/axios";
import type { AuthSession, SessionUser } from "@/types/auth";

const AUTH_COOKIE_KEY = "kyra_auth";
const AUTH_ROLE_COOKIE_KEY = "kyra_role";
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
const SESSION_REFRESH_TIMEOUT_MS = 10_000;

const syncAuthCookies = (role: string) => {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${AUTH_COOKIE_KEY}=1; Path=/; Max-Age=${SESSION_MAX_AGE_SECONDS}; SameSite=Lax`;
  document.cookie = `${AUTH_ROLE_COOKIE_KEY}=${encodeURIComponent(
    role
  )}; Path=/; Max-Age=${SESSION_MAX_AGE_SECONDS}; SameSite=Lax`;
};

const clearAuthCookies = () => {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${AUTH_COOKIE_KEY}=; Path=/; Max-Age=0; SameSite=Lax`;
  document.cookie = `${AUTH_ROLE_COOKIE_KEY}=; Path=/; Max-Age=0; SameSite=Lax`;
};

const getStoredSession = () => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
  } catch {
    return null;
  }
};

const setStoredSession = (session: AuthSession) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      AUTH_SESSION_STORAGE_KEY,
      JSON.stringify(session)
    );
  } catch {
    // Storage can be blocked by browser privacy policy.
  }
};

const removeStoredSession = () => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
  } catch {
    // Ignore storage failure to avoid blocking logout/session cleanup.
  }
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

const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number) => {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error("Session refresh timeout"));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
};

type AuthContextType = {
  user: SessionUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setSession: (session: AuthSession) => void;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: true,
  setSession: () => {},
  refreshUser: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSessionState] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isLoading) {
      return;
    }

    // Failsafe: avoid indefinite loading state on unstable browser storage/network.
    const timeoutId = setTimeout(() => {
      setIsLoading(false);
    }, SESSION_REFRESH_TIMEOUT_MS + 1000);

    return () => clearTimeout(timeoutId);
  }, [isLoading]);

  useEffect(() => {
    let active = true;

    const hydrateSession = async () => {
      try {
        const storedSession = getStoredSession();
        if (!storedSession) {
          clearAuthCookies();
          if (active) {
            setSessionState(null);
          }
          return;
        }

        const parsedSession = JSON.parse(storedSession) as AuthSession;
        if (isSessionExpired(parsedSession.expiresAt)) {
          removeStoredSession();
          clearAuthCookies();
          if (active) {
            setSessionState(null);
          }
          return;
        }

        setSessionState(parsedSession);
        syncAuthCookies(parsedSession.user.role);

        try {
          const freshUser = await withTimeout(
            getMe(),
            SESSION_REFRESH_TIMEOUT_MS
          );
          if (!active) {
            return;
          }

          const refreshedSession = {
            ...parsedSession,
            user: freshUser,
          };
          setStoredSession(refreshedSession);
          setSessionState(refreshedSession);
          syncAuthCookies(freshUser.role);
        } catch {
          if (!active) {
            return;
          }
          removeStoredSession();
          clearAuthCookies();
          setSessionState(null);
        }
      } catch {
        removeStoredSession();
        clearAuthCookies();
        setSessionState(null);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void hydrateSession();

    return () => {
      active = false;
    };
  }, []);

  const setSession = (nextSession: AuthSession) => {
    setStoredSession(nextSession);
    syncAuthCookies(nextSession.user.role);
    setSessionState(nextSession);
    setIsLoading(false);
  };

  const clearSession = () => {
    removeStoredSession();
    clearAuthCookies();
    setSessionState(null);
  };

  const logout = async () => {
    try {
      await logoutUser();
    } catch {
      // Ensure local session is always cleaned up.
    } finally {
      clearSession();
    }
  };

  const refreshUser = async () => {
    if (!session?.accessToken) {
      return;
    }

    try {
      const freshUser = await withTimeout(getMe(), SESSION_REFRESH_TIMEOUT_MS);
      const refreshedSession = {
        ...session,
        user: freshUser,
      };
      setStoredSession(refreshedSession);
      setSessionState(refreshedSession);
      syncAuthCookies(freshUser.role);
    } catch {
      // Keep existing user data if refresh fails.
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        accessToken: session?.accessToken ?? null,
        isAuthenticated: Boolean(session?.accessToken),
        isLoading,
        setSession,
        refreshUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
