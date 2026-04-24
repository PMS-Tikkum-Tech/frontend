"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getTenantNotifications } from "@/lib/dashboard/tenant.api";
import { hasUnreadTenantNotifications } from "@/lib/dashboard/tenant-notification-state";
import ProfilePanel from "./ProfilePanel";
import LanguageSwitcher from "@/components/ui/LanguageSwitcher";
import { Bell, Menu, User, X } from "lucide-react";

export default function PublicHeader() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const [failedAvatarKey, setFailedAvatarKey] = useState<string | null>(null);
  const previousPathnameRef = useRef(pathname);
  const dashboardHref =
    user?.role === "admin"
      ? "/admin"
      : user?.role === "owner"
        ? "/owner"
        : null;

  const nav = [
    { label: "Beranda", href: "/" },
    { label: "Tentang", href: "/tentang" },
    { label: "Sewa", href: "/sewa" },
    { label: "Kerjasama", href: "/kerjasama" },
  ];

  useEffect(() => {
    if (previousPathnameRef.current === pathname) {
      return;
    }

    previousPathnameRef.current = pathname;
    const frameId = window.requestAnimationFrame(() => {
      setMobileMenuOpen(false);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [pathname]);

  useEffect(() => {
    if (user?.role !== "tenant") {
      return;
    }

    if (pathname === "/tenant/notifikasi") {
      return;
    }

    let active = true;

    const syncUnreadState = async () => {
      try {
        const response = await getTenantNotifications({
          page: 1,
          per_page: 20,
        });
        if (!active) {
          return;
        }

        setHasUnreadNotifications(hasUnreadTenantNotifications(response.data));
      } catch {
        if (active) {
          setHasUnreadNotifications(false);
        }
      }
    };

    void syncUnreadState();
    const intervalId = window.setInterval(() => {
      void syncUnreadState();
    }, 60_000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [pathname, user?.role]);

  const showUnreadNotificationDot =
    user?.role === "tenant" &&
    pathname !== "/tenant/notifikasi" &&
    hasUnreadNotifications;
  const showTenantLanguageSwitcher = user?.role === "tenant";

  const avatarUrl = (() => {
    if (!user?.avatar || failedAvatarKey === user.avatar) {
      return null;
    }

    if (/^https?:\/\//i.test(user.avatar)) {
      return user.avatar;
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
      (typeof window !== "undefined"
        ? `${window.location.protocol}//${window.location.hostname}:3001`
        : "http://127.0.0.1:3001");

    return `${baseUrl}${user.avatar.startsWith("/") ? user.avatar : `/${user.avatar}`}`;
  })();

  return (
    <>
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 md:h-28 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <Image
              src="/logo-header.png"
              alt="KiKost"
              width={416}
              height={416}
              priority
              className="h-14 w-14 rounded-sm object-contain sm:h-16 sm:w-16 md:h-[6.5rem] md:w-[6.5rem]"
            />
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-10 text-sm font-medium">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`transition ${
                  pathname === item.href
                    ? "text-green-600 border-b-2 border-green-600 pb-1"
                    : "text-slate-700 hover:text-green-600"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Right Area */}
          {user ? (
            <div className="flex items-center gap-2 sm:gap-3">
              {dashboardHref ? (
                <Link
                  href={dashboardHref}
                  className="hidden sm:inline-flex rounded-full bg-sky-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-sky-700 md:px-4 md:text-sm"
                >
                  Masuk Dasbor
                </Link>
              ) : null}
              {showTenantLanguageSwitcher ? (
                <LanguageSwitcher compact className="hidden sm:inline-flex" />
              ) : null}
              {user.role === "tenant" ? (
                <Link
                  href="/tenant/notifikasi"
                  aria-label="Buka notifikasi"
                  className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:border-sky-300 hover:text-sky-700"
                >
                  <Bell size={19} />
                  {showUnreadNotificationDot ? (
                    <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
                  ) : null}
                </Link>
              ) : null}
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="flex items-center gap-2 hover:bg-slate-100 px-2.5 py-2 rounded-xl transition sm:gap-3 sm:px-3"
              >
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt="profile"
                    width={36}
                    height={36}
                    unoptimized
                    onError={() => setFailedAvatarKey(user?.avatar ?? null)}
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-slate-300 flex items-center justify-center text-white">
                    <User size={18} />
                  </div>
                )}

                <span className="hidden text-sm font-medium text-slate-700 sm:inline">
                  {user.name}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700 transition hover:border-sky-300 hover:text-sky-700 md:hidden"
                aria-label="Buka menu navigasi"
                aria-controls="public-mobile-menu"
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/auth?mode=login"
                className="hidden rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-sky-300 hover:text-sky-700 sm:inline-flex"
              >
                Masuk
              </Link>

              <Link
                href="/auth?mode=register"
                className="hidden rounded-full bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-700 sm:inline-flex"
              >
                Daftar
              </Link>
              <button
                type="button"
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700 transition hover:border-sky-300 hover:text-sky-700 md:hidden"
                aria-label="Buka menu navigasi"
                aria-controls="public-mobile-menu"
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>
          )}
        </div>

        <div
          id="public-mobile-menu"
          className={`overflow-hidden border-t border-slate-200 bg-white transition-all duration-300 md:hidden ${
            mobileMenuOpen ? "max-h-[480px] opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="space-y-3 px-4 py-3">
            {showTenantLanguageSwitcher ? (
              <LanguageSwitcher className="w-full justify-between border-slate-200" />
            ) : null}

            <nav className="grid gap-1.5">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                    pathname === item.href
                      ? "bg-sky-50 text-sky-700"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {!user ? (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/auth?mode=login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="inline-flex justify-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
                >
                  Masuk
                </Link>
                <Link
                  href="/auth?mode=register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="inline-flex justify-center rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white"
                >
                  Daftar
                </Link>
              </div>
            ) : dashboardHref ? (
              <Link
                href={dashboardHref}
                onClick={() => setMobileMenuOpen(false)}
                className="inline-flex w-full justify-center rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white"
              >
                Masuk Dasbor
              </Link>
            ) : null}
          </div>
        </div>
      </header>

      {/* PANEL PROFIL */}
      {user && <ProfilePanel open={open} onClose={() => setOpen(false)} />}
    </>
  );
}
