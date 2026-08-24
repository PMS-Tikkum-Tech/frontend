"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { getMe, logoutUser } from "@/lib/auth";
import { AUTH_SESSION_STORAGE_KEY } from "@/lib/axios";
import { clearClientAuthCookies, isSessionExpired } from "@/lib/auth-cookies";
import type { AuthSession, SessionUser } from "@/types/auth";
const SESSION_REFRESH_TIMEOUT_MS = 10_000;

const getStoredSession = () => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as AuthSession;
  } catch {
    removeStoredSession();
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
        if (!storedSession?.user) {
          removeStoredSession();
          if (active) {
            setSessionState(null);
          }
          return;
        }

        if (
          storedSession.refreshTokenExpiresAt &&
          isSessionExpired(storedSession.refreshTokenExpiresAt)
        ) {
          removeStoredSession();
          clearClientAuthCookies();
          if (active) {
            setSessionState(null);
          }
          return;
        }

        if (active) {
          setSessionState(storedSession);
        }

        try {
          const freshUser = await withTimeout(
            getMe(),
            SESSION_REFRESH_TIMEOUT_MS
          );
          if (!active) {
            return;
          }

          const latestStoredSession = getStoredSession();
          const refreshedSession = {
            ...storedSession,
            ...(latestStoredSession ?? {}),
            user: freshUser,
          };
          setStoredSession(refreshedSession);
          setSessionState(refreshedSession);
        } catch {
          if (!active) {
            return;
          }
          removeStoredSession();
          clearClientAuthCookies();
          setSessionState(null);
        }
      } catch {
        removeStoredSession();
        clearClientAuthCookies();
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
    setSessionState(nextSession);
    setIsLoading(false);
  };

  const clearSession = () => {
    removeStoredSession();
    clearClientAuthCookies();
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
    try {
      const freshUser = await withTimeout(getMe(), SESSION_REFRESH_TIMEOUT_MS);
      const latestStoredSession = getStoredSession();
      const refreshedSession = {
        ...(latestStoredSession ?? {}),
        ...(session ?? {}),
        user: freshUser,
      };
      setStoredSession(refreshedSession);
      setSessionState(refreshedSession);
    } catch {
      // Keep existing user data if refresh fails.
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        accessToken: null,
        isAuthenticated: Boolean(session?.user),
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
