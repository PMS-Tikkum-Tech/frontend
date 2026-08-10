"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

const INTRO_STORAGE_KEY = "kikost_intro_seen";
const INTRO_MESSAGE = "Selamat datang di KIKOST";
const INTRO_EXCLUDED_PATHS = ["/verifikasi-email", "/__/auth/action"];

export default function IntroSplash() {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(true);
  const [isLeaving, setIsLeaving] = useState(false);
  const [typedText, setTypedText] = useState("");

  const exitTimeoutRef = useRef<number | null>(null);
  const isExcludedRoute = INTRO_EXCLUDED_PATHS.some((path) =>
    pathname?.startsWith(path)
  );

  const closeSplash = useCallback(() => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(INTRO_STORAGE_KEY, "1");
    }

    setIsLeaving(true);
    exitTimeoutRef.current = window.setTimeout(() => {
      setIsVisible(false);
    }, 520);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (isExcludedRoute) {
      return;
    }

    const hasSeenIntro = window.sessionStorage.getItem(INTRO_STORAGE_KEY) === "1";
    if (hasSeenIntro) {
      const frameId = window.requestAnimationFrame(() => {
        setIsVisible(false);
      });

      return () => window.cancelAnimationFrame(frameId);
    }

    let index = 0;
    let holdTimeout: number | null = null;

    const typingInterval = window.setInterval(() => {
      index += 1;
      setTypedText(INTRO_MESSAGE.slice(0, index));

      if (index >= INTRO_MESSAGE.length) {
        window.clearInterval(typingInterval);
        holdTimeout = window.setTimeout(() => {
          closeSplash();
        }, 1400);
      }
    }, 26);

    return () => {
      window.clearInterval(typingInterval);
      if (holdTimeout) {
        window.clearTimeout(holdTimeout);
      }
      if (exitTimeoutRef.current) {
        window.clearTimeout(exitTimeoutRef.current);
      }
    };
  }, [closeSplash, isExcludedRoute]);

  if (!isVisible || isExcludedRoute) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-[#0B3D91] via-[#0E4F94] to-[#1D4ED8] px-6 transition-opacity duration-500 ${
        isLeaving ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <div className="w-full max-w-3xl rounded-3xl border border-white/35 bg-white/10 px-6 py-10 text-center shadow-2xl backdrop-blur-md md:px-10">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-white/80">
          Sistem Manajemen Properti
        </p>
        <h1 className="mt-4 text-xl font-semibold leading-snug text-white md:text-4xl">
          {typedText}
          <span className="ml-1 inline-block h-7 w-[2px] animate-pulse bg-white/90 align-middle md:h-10" />
        </h1>
        <p className="mt-4 text-sm text-white/85">
          Hunian nyaman, proses sewa lebih mudah.
        </p>

        <button
          type="button"
          onClick={closeSplash}
          className="mt-6 rounded-xl border border-white/50 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/15"
        >
          Lewati
        </button>
      </div>
    </div>
  );
}
