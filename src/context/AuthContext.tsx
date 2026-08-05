"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getMe, logoutUser } from "@/lib/auth";
import type { AuthSession, SessionUser } from "@/types/auth";

const SESSION_TIMEOUT_MS = 10_000;
const AUTH_CHANNEL_NAME = "kikost-auth-state";

const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number) =>
  new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => reject(new Error("Session timeout")), timeoutMs);
    promise.then((value) => {
      clearTimeout(timeoutId);
      resolve(value);
    }).catch((error) => {
      clearTimeout(timeoutId);
      reject(error);
    });
  });

type AuthContextType = {
  user: SessionUser | null;
  accessToken: null;
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
  setSession: () => undefined,
  refreshUser: async () => undefined,
  logout: async () => undefined,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSessionState] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const hydrate = async () => {
    try {
      const user = await withTimeout(getMe(), SESSION_TIMEOUT_MS);
      setSessionState({ user });
    } catch {
      setSessionState(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void hydrate();

    if (!("BroadcastChannel" in window)) return;
    const channel = new BroadcastChannel(AUTH_CHANNEL_NAME);
    channel.onmessage = (event) => {
      if (event.data === "logout") {
        setSessionState(null);
      } else if (event.data === "login") {
        void hydrate();
      }
    };
    return () => channel.close();
  }, []);

  const broadcast = (message: "login" | "logout") => {
    if (!("BroadcastChannel" in window)) return;
    const channel = new BroadcastChannel(AUTH_CHANNEL_NAME);
    channel.postMessage(message);
    channel.close();
  };

  const setSession = (nextSession: AuthSession) => {
    setSessionState(nextSession);
    setIsLoading(false);
    broadcast("login");
  };

  const logout = async () => {
    try {
      await logoutUser();
    } finally {
      setSessionState(null);
      broadcast("logout");
    }
  };

  const refreshUser = async () => {
    try {
      const user = await withTimeout(getMe(), SESSION_TIMEOUT_MS);
      setSessionState((current) => ({ ...(current ?? {}), user }));
    } catch {
      // Preserve the current in-memory view during transient network failures.
    }
  };

  return (
    <AuthContext.Provider value={{
      user: session?.user ?? null,
      accessToken: null,
      isAuthenticated: Boolean(session?.user),
      isLoading,
      setSession,
      refreshUser,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
