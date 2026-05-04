"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import {
  Home,
  CalendarCheck,
  Heart,
  Bell,
  Wallet,
  Wrench,
  HelpCircle,
  MessageCircle,
  Megaphone,
  User,
  Lock,
  LogOut,
  ChevronRight,
  X,
} from "lucide-react";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { resolveApiBaseUrl } from "@/lib/api-base-url";

interface Props {
  open: boolean;
  onClose: () => void;
  hasUnreadNotifications?: boolean;
}

type MenuItemProps = {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  href?: string;
  onClick?: () => void;
  onClose: () => void;
  showIndicator?: boolean;
  variant?: "default" | "danger";
};

function MenuItem({
  icon,
  title,
  subtitle,
  href,
  onClick,
  onClose,
  showIndicator = false,
  variant = "default",
}: MenuItemProps) {
  const isDanger = variant === "danger";
  const content = (
    <div
      className={`group relative flex w-full items-start gap-3 rounded-xl px-3 py-3 transition ${
        isDanger ? "hover:bg-red-50" : "hover:bg-sky-50"
      }`}
    >
      <div
        className={`relative mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
          isDanger
            ? "border-red-100 bg-red-50 text-red-600"
            : "border-sky-100 bg-sky-50 text-sky-600"
        }`}
      >
        {icon}
        {showIndicator ? (
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
        ) : null}
      </div>

      <div className="min-w-0 flex-1 text-left">
        <p className={`text-sm font-semibold ${isDanger ? "text-red-700" : "text-slate-800"}`}>
          {title}
        </p>
        {subtitle ? (
          <p className={`mt-0.5 text-xs ${isDanger ? "text-red-500" : "text-slate-500"}`}>
            {subtitle}
          </p>
        ) : null}
      </div>

      <ChevronRight
        size={16}
        className={`mt-1 shrink-0 transition group-hover:translate-x-0.5 ${
          isDanger ? "text-red-300" : "text-slate-300"
        }`}
      />
    </div>
  );

  if (href) {
    return (
      <Link href={href} onClick={onClose}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        onClick?.();
        onClose();
      }}
      className="w-full text-left"
    >
      {content}
    </button>
  );
}

export default function ProfilePanel({
  open,
  onClose,
  hasUnreadNotifications = false,
}: Props) {
  const { logout, user } = useAuth();
  const displayName = user?.name || "Pengguna";
  const [failedAvatarKey, setFailedAvatarKey] = useState<string | null>(null);
  const displayRole =
    user?.role === "admin"
      ? "Administrator"
      : user?.role === "owner"
        ? "Pemilik Properti"
        : "Penyewa";
  const avatarUrl = (() => {
    if (!user?.avatar || failedAvatarKey === user.avatar) {
      return null;
    }

    if (/^https?:\/\//i.test(user.avatar)) {
      return user.avatar;
    }

    const baseUrl = resolveApiBaseUrl();

    return `${baseUrl}${user.avatar.startsWith("/") ? user.avatar : `/${user.avatar}`}`;
  })();

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* OVERLAY */}
          <motion.div
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.45 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
          />

          {/* PANEL */}
          <motion.div
            initial={{ x: 460 }}
            animate={{ x: 0 }}
            exit={{ x: 460 }}
            transition={{ type: "spring", damping: 28, stiffness: 230 }}
            className="fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-slate-50 shadow-2xl"
          >
            {/* HEADER PROFILE */}
            <div className="relative overflow-hidden border-b border-sky-100 bg-gradient-to-br from-sky-600 via-blue-600 to-cyan-600 px-6 pb-6 pt-5 text-white">
              <div className="pointer-events-none absolute -left-10 top-8 h-28 w-28 rounded-full bg-white/20 blur-2xl" />
              <div className="pointer-events-none absolute -right-10 top-2 h-36 w-36 rounded-full bg-cyan-300/30 blur-3xl" />

              <button
                type="button"
                onClick={onClose}
                aria-label="Tutup panel profil"
                className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white transition hover:bg-white/30"
              >
                <X size={18} />
              </button>

              <div className="relative mt-5 flex items-center gap-4">
                <div className="rounded-full border-2 border-white/80 p-0.5 shadow-lg">
                  {avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt="Profil"
                      width={72}
                      height={72}
                      unoptimized
                      onError={() => setFailedAvatarKey(user?.avatar ?? null)}
                      className="rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-white/20 text-xl font-semibold text-white">
                      {(displayName?.charAt(0) || "P").toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <h2 className="truncate text-xl font-semibold leading-tight">
                    {displayName}
                  </h2>
                  {user?.email ? (
                    <p className="mt-1 truncate text-sm text-white/85">{user.email}</p>
                  ) : null}
                  <span className="mt-2 inline-flex rounded-full border border-white/35 bg-white/20 px-3 py-1 text-xs font-medium text-white">
                    {displayRole}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              {/* ================= AKTIVITAS SAYA ================= */}
              <Section title="Aktivitas Saya">
                <MenuItem
                  icon={<Home size={20} />}
                  title="Kost Saya"
                  subtitle="Lihat info kost yang sedang kamu sewa"
                  href="/tenant/kost-saya"
                  onClose={onClose}
                />

                <MenuItem
                  icon={<CalendarCheck size={20} />}
                  title="Jadwal Kunjungan"
                  subtitle="Daftar survei kost yang sudah dijadwalkan"
                  href="/tenant/jadwal-visit"
                  onClose={onClose}
                />

                <MenuItem
                  icon={<Heart size={20} />}
                  title="Favorit"
                  subtitle="Kost yang kamu simpan"
                  href="/tenant/favorit"
                  onClose={onClose}
                />

                <MenuItem
                  icon={<Bell size={20} />}
                  title="Notifikasi"
                  subtitle="Pembaruan status & info penting"
                  href="/tenant/notifikasi"
                  onClose={onClose}
                  showIndicator={hasUnreadNotifications}
                />
              </Section>

              {/* ================= TAGIHAN ================= */}
              <Section title="Tagihan & Pembayaran">
                <MenuItem
                  icon={<Wallet size={20} />}
                  title="Tagihan & Pembayaran"
                  subtitle="Lihat status pembayaran & riwayat"
                  href="/tenant/pembayaran"
                  onClose={onClose}
                />
              </Section>

              {/* ================= BANTUAN ================= */}
              <Section title="Bantuan & Layanan">
                <MenuItem
                  icon={<Wrench size={20} />}
                  title="Perawatan"
                  subtitle="Laporkan perbaikan fasilitas unit"
                  href="/tenant/perawatan"
                  onClose={onClose}
                />

                <MenuItem
                  icon={<HelpCircle size={20} />}
                  title="Pertanyaan Umum"
                  subtitle="Pertanyaan yang sering ditanyakan"
                  href="/tenant/faq"
                  onClose={onClose}
                />

                <MenuItem
                  icon={<MessageCircle size={20} />}
                  title="Pusat Bantuan"
                  subtitle="Hubungi administrator melalui WhatsApp"
                  href="/tenant/bantuan"
                  onClose={onClose}
                />

                <MenuItem
                  icon={<Megaphone size={20} />}
                  title="Ajukan Keluhan"
                  subtitle="Sampaikan keluhan kamu"
                  href="/tenant/keluhan"
                  onClose={onClose}
                />
              </Section>

              {/* ================= PENGATURAN ================= */}
              <Section title="Pengaturan Akun">
                <MenuItem
                  icon={<User size={20} />}
                  title="Profil"
                  subtitle="Perbarui data akun dan kontak darurat"
                  href="/tenant/akun"
                  onClose={onClose}
                />

                <MenuItem
                  icon={<Lock size={20} />}
                  title="Kata Sandi"
                  subtitle="Jaga keamanan akun kamu"
                  href="/tenant/sandi"
                  onClose={onClose}
                />

                {/* LOGOUT */}
                <MenuItem
                  icon={<LogOut size={20} />}
                  title="Keluar"
                  subtitle="Akhiri sesi dan keluar dari akun"
                  onClick={logout}
                  onClose={onClose}
                  variant="danger"
                />
              </Section>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ================= SECTION COMPONENT ================= */

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </div>

      <div className="space-y-1 p-2">{children}</div>
    </div>
  );
}
