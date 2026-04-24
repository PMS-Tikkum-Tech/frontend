"use client";

import { ReactNode, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  BarChart3,
  LogOut,
  Menu,
  Search,
  X,
} from "lucide-react";
import RoleGuard from "@/components/auth/RoleGuard";
import { useAuth } from "@/context/AuthContext";
import { getApiErrorMessage } from "@/lib/dashboard/admin.api";
import {
  SELF_PROFILE_PICTURE_UNAVAILABLE_MESSAGE,
  updateSelfProfilePicture,
} from "@/lib/profile.api";
import LanguageSwitcher from "@/components/ui/LanguageSwitcher";

const PROFILE_PICTURE_ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png"];
const PROFILE_PICTURE_MAX_SIZE_BYTES = 5 * 1024 * 1024;
const OWNER_AVATAR_MANAGED_BY_BACKEND = true;

export default function OwnerDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, refreshUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarNotice, setAvatarNotice] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [failedAvatarKey, setFailedAvatarKey] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.push("/auth");
    router.refresh();
  };

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

  const handleAvatarFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.currentTarget.value = "";
    if (!file || !user?.id) {
      return;
    }

    if (!PROFILE_PICTURE_ALLOWED_TYPES.includes(file.type)) {
      setAvatarError("Format foto harus PNG, JPG, atau JPEG.");
      setAvatarNotice(null);
      return;
    }

    if (file.size > PROFILE_PICTURE_MAX_SIZE_BYTES) {
      setAvatarError("Ukuran foto maksimal 5 MB.");
      setAvatarNotice(null);
      return;
    }

    setIsUploadingAvatar(true);
    setAvatarError(null);
    setAvatarNotice(null);

    try {
      await updateSelfProfilePicture({
        userId: user.id,
        profilePicture: file,
      });
      await refreshUser();
      setAvatarNotice("Foto profil berhasil diperbarui.");
    } catch (uploadError) {
      setAvatarError(
        getApiErrorMessage(uploadError, "Gagal memperbarui foto profil.")
      );
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // ⭐ MENU OWNER (beda dengan admin)
  const menuItems = [
    { label: "Dasbor", href: "/owner", icon: LayoutDashboard },
    { label: "Laba & Hunian", href: "/owner/profit-hunian", icon: BarChart3 },
  ];

  return (
    <RoleGuard allowedRoles={["owner"]}>
      <div className="min-h-screen bg-slate-50 lg:flex">
        {isSidebarOpen ? (
          <button
            type="button"
            aria-label="Tutup sidebar"
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-[1px] lg:hidden"
          />
        ) : null}
        {/* ================= SIDEBAR ================= */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 text-white shadow-xl transition-transform duration-300 lg:static lg:w-64 lg:translate-x-0 ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex h-full flex-col justify-between py-6">
          <div>
            {/* Logo */}
            <div className="mb-8 flex items-center justify-between px-4 lg:mb-12 lg:justify-center lg:px-0">
              <button
                type="button"
                onClick={() => setIsSidebarOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 text-slate-200 lg:hidden"
                aria-label="Tutup menu"
              >
                <X size={18} />
              </button>
              <Image
                src="/logo-white.png"
                alt="Logo Kyra Stay"
                width={140}
                height={40}
                priority
              />
              <span className="w-9 lg:hidden" />
            </div>

            {/* Menu */}
            <nav className="flex flex-col gap-1 px-3 text-sm">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsSidebarOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
                  ${
                    isActive
                      ? "bg-[#8BC34A] text-black font-semibold shadow-md"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                  >
                    <Icon size={18} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Logout */}
          <div className="px-3">
            <button
              type="button"
              onClick={() => {
                void handleLogout();
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-slate-300 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200"
            >
              <LogOut size={18} />
              Keluar
            </button>
          </div>
          </div>
        </aside>

        {/* ================= MAIN AREA ================= */}
        <div className="flex min-h-screen flex-1 flex-col">
          {/* HEADER */}
          <header className="min-h-[72px] border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
            <div className="flex min-h-[72px] items-center justify-between gap-3">
            {/* Search */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(true)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700 lg:hidden"
                  aria-label="Buka menu"
                >
                  <Menu size={18} />
                </button>

                <div className="relative hidden w-full max-w-md md:block">
                  <Search
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    placeholder="Cari..."
                    className="w-full rounded-full border border-slate-200 bg-slate-50 py-2 pl-12 pr-4 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#8BC34A]"
                  />
                </div>
              </div>

              {/* Profile */}
              <div className="flex items-center gap-2 sm:gap-3 md:gap-6">
                <Link
                  href="/"
                  className="hidden items-center rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 md:inline-flex"
                >
                  Beranda Kyra Stay
                </Link>

                <LanguageSwitcher compact className="hidden sm:flex" />

                <div className="flex items-center gap-2 sm:gap-3">
                  {!OWNER_AVATAR_MANAGED_BY_BACKEND ? (
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg"
                      onChange={(event) => {
                        void handleAvatarFileChange(event);
                      }}
                      className="hidden"
                    />
                  ) : null}

                  <button
                    type="button"
                    onClick={() => {
                      if (OWNER_AVATAR_MANAGED_BY_BACKEND) {
                        setAvatarNotice(null);
                        setAvatarError(SELF_PROFILE_PICTURE_UNAVAILABLE_MESSAGE);
                        return;
                      }

                      fileInputRef.current?.click();
                    }}
                    disabled={isUploadingAvatar}
                    className="relative h-10 w-10 overflow-hidden rounded-full border border-slate-200 bg-slate-200 disabled:cursor-not-allowed disabled:opacity-70"
                    title={
                      OWNER_AVATAR_MANAGED_BY_BACKEND
                        ? "Foto profil pemilik mengikuti konfigurasi sistem"
                        : "Klik untuk ubah foto profil"
                    }
                  >
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Avatar pemilik"
                        className="h-full w-full object-cover"
                        onError={() => setFailedAvatarKey(user?.avatar ?? null)}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-slate-700">
                        {(user?.name?.charAt(0) || "O").toUpperCase()}
                      </div>
                    )}
                  </button>

                  <div className="hidden text-sm sm:block">
                    <p className="font-semibold text-slate-800">
                      {user?.name || "Pemilik"}
                    </p>
                    <p className="text-xs text-slate-500">Pemilik Properti</p>
                    {OWNER_AVATAR_MANAGED_BY_BACKEND ? (
                      <p className="text-[11px] text-slate-500">
                        Foto profil pemilik belum dapat diubah mandiri dari sistem saat ini.
                      </p>
                    ) : null}
                    {avatarNotice ? (
                      <p className="text-[11px] text-emerald-600">{avatarNotice}</p>
                    ) : null}
                    {avatarError ? (
                      <p className="text-[11px] text-red-600">{avatarError}</p>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* CONTENT */}
          <main className="flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </RoleGuard>
  );
}
