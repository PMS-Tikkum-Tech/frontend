"use client";

import Link from "next/link";
import { type ReactNode } from "react";
import {
  CircleHelp,
  ClipboardList,
  CreditCard,
  MessageCircleMore,
  ShieldCheck,
  Wrench,
} from "lucide-react";

const rawWhatsappNumber =
  process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP?.trim() || "08123456789";
const normalizedWhatsappDigits = rawWhatsappNumber.replace(/[^\d]/g, "");
const whatsappNumber = normalizedWhatsappDigits.startsWith("0")
  ? `62${normalizedWhatsappDigits.slice(1)}`
  : normalizedWhatsappDigits;
const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
  "Halo administrator Kyra Stay, saya butuh bantuan terkait akun/penyewaan saya."
)}`;

export default function TenantBantuanPage() {
  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-teal-700 via-cyan-700 to-sky-700 p-6 text-white shadow-sm">
        <div className="pointer-events-none absolute -left-12 top-0 h-44 w-44 rounded-full bg-white/15 blur-2xl" />
        <div className="pointer-events-none absolute -right-12 bottom-0 h-44 w-44 rounded-full bg-white/10 blur-3xl" />

        <div className="relative">
          <h1 className="text-3xl font-semibold">Pusat Bantuan</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/90">
            Hubungi tim kami jika ada kendala akun, pembayaran, atau hunian. Kami
            siap membantu secepatnya.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-2xl border border-green-200 bg-green-50 p-5 shadow-sm transition hover:bg-green-100"
        >
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-green-700">
            <MessageCircleMore size={16} />
            Nomor Telepon Administrator
          </p>
          <p className="mt-2 text-sm text-slate-700">
            Kanal tercepat untuk pertanyaan umum, kendala akun, dan kebutuhan
            bantuan teknis.
          </p>
          <p className="mt-3 text-xs text-slate-500">Klik untuk mulai chat</p>
        </a>

        <Link
          href="/tenant/faq"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-green-300"
        >
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
            <CircleHelp size={16} />
            Pertanyaan Umum (FAQ)
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Cek jawaban instan untuk pertanyaan seputar sewa, tagihan, perawatan,
            dan keamanan akun.
          </p>
        </Link>
      </section>

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800">Panduan Cepat</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <GuideCard
            icon={<Wrench size={16} />}
            title="Kendala Unit"
            desc="Gunakan halaman Ajukan Keluhan untuk membuat laporan perawatan."
          />
          <GuideCard
            icon={<ClipboardList size={16} />}
            title="Status Perawatan"
            desc="Pantau progres teknisi di menu Perawatan."
          />
          <GuideCard
            icon={<CreditCard size={16} />}
            title="Tagihan & Pembayaran"
            desc="Lihat nominal, jatuh tempo, dan status pembayaran di menu Tagihan."
          />
          <GuideCard
            icon={<ShieldCheck size={16} />}
            title="Akun & Keamanan"
            desc="Perbarui kata sandi secara berkala dari menu Kata Sandi."
          />
        </div>
      </section>
    </div>
  );
}

function GuideCard({
  icon,
  title,
  desc,
}: {
  icon: ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="inline-flex items-center gap-2 text-sm font-medium text-slate-800">
        <span className="text-green-700">{icon}</span>
        {title}
      </p>
      <p className="mt-1 text-sm text-slate-600">{desc}</p>
    </div>
  );
}
