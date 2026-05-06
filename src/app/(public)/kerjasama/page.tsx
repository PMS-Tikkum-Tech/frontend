"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeDollarSign,
  Building2,
  CalendarCheck2,
  ChartSpline,
  CircleUserRound,
  ClipboardCheck,
  FileText,
  Handshake,
  Megaphone,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  Users,
  Wrench,
  WalletCards,
} from "lucide-react";

const SERVICE_ITEMS: Array<{
  title: string;
  desc: string;
  icon: ReactNode;
}> = [
  {
    title: "Pemasaran & Daftar Hunian",
    desc: "Optimasi halaman properti agar lebih mudah ditemukan calon penyewa.",
    icon: <Megaphone size={17} />,
  },
  {
    title: "Seleksi Penyewa",
    desc: "Proses penyaringan awal untuk meningkatkan kualitas dan kecocokan penyewa.",
    icon: <SearchCheck size={17} />,
  },
  {
    title: "Pengelolaan Pembayaran",
    desc: "Pemantauan tagihan, pengingat batas pembayaran, dan rekap pembayaran berkala.",
    icon: <WalletCards size={17} />,
  },
  {
    title: "Perawatan Properti",
    desc: "Koordinasi keluhan penghuni dan tindak lanjut perawatan lebih terstruktur.",
    icon: <Wrench size={17} />,
  },
  {
    title: "Laporan Kinerja",
    desc: "Laporan okupansi, arus kas, dan indikator performa untuk pemilik properti.",
    icon: <FileText size={17} />,
  },
  {
    title: "Dukungan Penghuni",
    desc: "Pendampingan komunikasi penyewa agar pengalaman tinggal tetap positif.",
    icon: <CircleUserRound size={17} />,
  },
];

const PARTNERSHIP_MODELS: Array<{
  title: string;
  desc: string;
  fit: string;
}> = [
  {
    title: "Model Bagi Hasil",
    desc: "Pendapatan dibagi berdasarkan performa unit dan skema yang disepakati.",
    fit: "Cocok untuk: pemilik yang ingin potensi pertumbuhan maksimal.",
  },
  {
    title: "Model Sewa Tetap",
    desc: "Pendapatan bulanan lebih stabil sesuai nilai sewa yang disepakati.",
    fit: "Cocok untuk: pemilik yang mengutamakan arus kas konsisten.",
  },
  {
    title: "Model Campuran",
    desc: "Kombinasi komponen tetap dan variabel untuk fleksibilitas manajemen.",
    fit: "Cocok untuk: properti dengan segmen pasar yang dinamis.",
  },
];

const PARTNER_LOGOS: Array<{ name: string; category: string }> = [
  { name: "Kinara Signature Kost", category: "Kost Eksklusif" },
  { name: "Kinara Urban Residence", category: "Apartemen" },
  { name: "Kinara Green House", category: "Rumah Sewa" },
  { name: "Dramaga Student Living", category: "Kost Mahasiswa" },
  { name: "Cihideung Residence", category: "Kost Campur" },
  { name: "Bogor Transit House", category: "Hunian Harian/Bulanan" },
  { name: "Pakuan City Rooms", category: "Kost Premium" },
  { name: "Baranangsiang Living", category: "Kost Strategis" },
];

const PARTNERSHIP_FOOTER_COLUMNS = [
  {
    title: "Menu",
    items: ["Beranda", "Sewa", "Kerjasama", "Tentang"],
  },
  {
    title: "Layanan",
    items: ["Kemitraan Properti", "Konsultasi Awal", "Pengelolaan End-to-End"],
  },
  {
    title: "Kontak",
    items: ["WhatsApp Administrator", "support@kyrastay.id", "Bogor, Jawa Barat"],
  },
];
const rawWhatsappNumber =
  process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP?.trim() || "082114224431";
const normalizedWhatsappDigits = rawWhatsappNumber.replace(/[^\d]/g, "");
const whatsappNumber = normalizedWhatsappDigits.startsWith("0")
  ? `62${normalizedWhatsappDigits.slice(1)}`
  : normalizedWhatsappDigits;
const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
  "Halo administrator Kyra Stay, saya ingin konsultasi soal kerja sama properti."
)}`;

export default function KerjasamaPage() {
  return (
    <div className="overflow-hidden bg-slate-50 text-slate-900">
      <section className="relative bg-gradient-to-br from-[#0F7A2A] via-[#188D3B] to-[#2FA24D] text-white">
        <div className="pointer-events-none absolute -top-20 -left-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute right-0 bottom-0 h-72 w-72 rounded-full bg-green-300/20 blur-3xl" />

        <div className="absolute inset-0 opacity-10">
          <Image
            src="/bg-1200.webp"
            alt="Kerja sama Kyra Stay"
            fill
            className="object-cover"
          />
        </div>

        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-6 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/10 px-4 py-1.5 text-xs font-semibold tracking-wide">
              <Sparkles size={14} />
              Program Kemitraan Pemilik Properti
            </p>
            <h1 className="mt-4 text-4xl font-bold leading-tight md:text-5xl">
              Tingkatkan Nilai Properti Anda Bersama Kyra Stay
            </h1>

            <p className="mt-4 max-w-2xl text-sm text-white/90 md:text-base">
              Kami bantu pemilik kost dan investor mengelola hunian secara
              profesional: okupansi lebih stabil, operasional lebih rapi, dan
              laporan keuangan transparan.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/auth?next=%2Fkerjasama"
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-[#188D3B] shadow-lg shadow-black/20 transition hover:bg-slate-100"
              >
                Ajukan Kerja Sama
                <ArrowRight size={15} />
              </Link>
              <a
                href="#alur-kemitraan"
                className="inline-flex h-11 items-center rounded-xl border border-white/45 px-5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Pelajari Lebih Lanjut
              </a>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <MetricPill label="Properti Aktif" value="120+" />
              <MetricPill label="Tingkat Hunian" value="95%" />
              <MetricPill label="Rata-rata ROI" value="+18%" />
            </div>
          </div>

          <div className="relative">
            <div className="relative h-[330px] overflow-hidden rounded-3xl border border-white/30 bg-white/10 shadow-2xl backdrop-blur-sm md:h-[400px]">
              <Image
                src="/bg-1200.webp"
                alt="Investasi properti"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0F7A2A]/75 via-[#0F7A2A]/25 to-transparent" />
              <div className="absolute right-4 bottom-4 left-4 z-20 rounded-2xl border border-white/30 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-sm font-semibold">
                  Dasbor Operasional dan Finansial
                </p>
                <p className="mt-1 text-xs text-white/85">
                  Pemantauan hunian, pembayaran, dan laporan kinerja dalam satu
                  panel.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      <section className="relative z-20 mx-auto mt-6 max-w-6xl px-6">
        <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/60 md:grid-cols-4">
          <Stat number="95%" label="Tingkat Hunian" />
          <Stat number="120+" label="Properti Dikelola" />
          <Stat number="10.000+" label="Penyewa Aktif" />
          <Stat number="7 Tahun" label="Pengalaman Tim" />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pt-8">
        <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-[#188D3B]/10 px-3 py-1 text-xs font-semibold text-[#188D3B]">
              <CalendarCheck2 size={14} />
              30 Hari Pertama Kemitraan
            </p>
            <h2 className="mt-3 text-xl font-bold md:text-2xl">
              Linimasa Orientasi yang Jelas
            </h2>
            <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-3">
              <p className="rounded-xl bg-slate-50 px-3 py-2">
                Minggu 1: Audit unit & evaluasi pasar
              </p>
              <p className="rounded-xl bg-slate-50 px-3 py-2">
                Minggu 2: Penyiapan daftar hunian & aset konten
              </p>
              <p className="rounded-xl bg-slate-50 px-3 py-2">
                Minggu 3-4: Aktivasi daftar hunian & mulai akuisisi penyewa
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">
              Yang Anda Dapatkan
            </p>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li>Rencana kerja kemitraan sesuai kondisi properti.</li>
              <li>Dokumen operasional dan jalur komunikasi yang jelas.</li>
              <li>Pembaruan performa secara periodik dan transparan.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-9 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#188D3B]">
              Nilai Kemitraan
            </p>
            <h2 className="mt-2 text-2xl font-bold md:text-3xl">
              Mengapa Bermitra dengan Kyra Stay?
            </h2>
          </div>
          <p className="max-w-xl text-sm text-slate-600">
            Strategi kami fokus pada peningkatan okupansi, efisiensi
            operasional, dan pengalaman penyewa agar performa properti tetap
            konsisten.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <BenefitCard
            icon={<ChartSpline size={18} />}
            title="Okupansi Lebih Tinggi"
            desc="Promosi digital tersegmentasi dan optimasi daftar hunian untuk mempercepat keterisian unit."
          />
          <BenefitCard
            icon={<ShieldCheck size={18} />}
            title="Operasional Lebih Terkontrol"
            desc="Manajemen penyewa, pembayaran, dan pemeliharaan berjalan dalam SOP yang jelas."
          />
          <BenefitCard
            icon={<BadgeDollarSign size={18} />}
            title="Pendapatan Lebih Stabil"
            desc="Penentuan harga berbasis data pasar untuk menjaga arus kas properti."
          />
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-9 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#188D3B]">
                Cakupan Layanan
              </p>
              <h2 className="mt-2 text-2xl font-bold md:text-3xl">
                End-to-End Management yang Informatif
              </h2>
            </div>
            <p className="max-w-xl text-sm text-slate-600">
              Seluruh proses inti dikelola dalam satu alur, sehingga keputusan
              bisnis lebih cepat dan kualitas layanan penyewa tetap terjaga.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICE_ITEMS.map((item) => (
              <ServiceCard
                key={item.title}
                icon={item.icon}
                title={item.title}
                desc={item.desc}
              />
            ))}
          </div>
        </div>
      </section>

      <section id="alur-kemitraan" className="bg-slate-50 py-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-9 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#188D3B]">
                Alur Kerja
              </p>
              <h2 className="mt-2 text-2xl font-bold md:text-3xl">
                Proses Kerja Sama yang Jelas dan Cepat
              </h2>
            </div>
            <p className="max-w-xl text-sm text-slate-600">
              Setiap tahap didampingi tim Kyra Stay, dari evaluasi awal hingga
              properti aktif menerima penyewa.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <StepCard
              number="1"
              title="Ajukan Properti"
              desc="Isi data dasar properti dan target kerja sama."
            />
            <StepCard
              number="2"
              title="Evaluasi dan Survei"
              desc="Tim kami menilai potensi pasar dan kondisi unit."
            />
            <StepCard
              number="3"
              title="Kesepakatan"
              desc="Skema kerja sama disepakati secara transparan."
            />
            <StepCard
              number="4"
              title="Aktivasi Operasional"
              desc="Daftar hunian dipublikasikan dan operasional mulai berjalan."
            />
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl items-start gap-6 px-6 py-16 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#188D3B]">
            Dampak Kemitraan
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-2xl font-bold">Sebelum vs Sesudah Bermitra</h2>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
              4 aspek inti
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            Perbandingan berikut menunjukkan perubahan utama setelah properti
            dikelola dengan sistem Kyra Stay.
          </p>

          <div className="mt-5 hidden grid-cols-[220px_1fr_1fr] gap-0 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 md:grid">
            <p>Aspek</p>
            <p>Sebelum</p>
            <p>Sesudah</p>
          </div>

          <div className="mt-3 grid gap-3">
            <CompareRow
              icon={<Building2 size={16} />}
              title="Keterisian Unit"
              before="Terisi tidak konsisten"
              after="Pola okupansi lebih stabil"
            />
            <CompareRow
              icon={<Users size={16} />}
              title="Manajemen Penyewa"
              before="Manual dan tersebar"
              after="Terpusat dalam dasbor"
            />
            <CompareRow
              icon={<ClipboardCheck size={16} />}
              title="Pelaporan"
              before="Rekap bulanan manual"
              after="Laporan berkala dan transparan"
            />
            <CompareRow
              icon={<Handshake size={16} />}
              title="Dukungan Tim"
              before="Bergantung pemilik"
              after="Didampingi tim operasional"
            />
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#188D3B]">
            Pertanyaan Umum
          </p>
          <h3 className="mt-2 text-2xl font-bold">FAQ Kemitraan</h3>

          <div className="mt-5 space-y-3">
            <FaqItem
              q="Apakah Kyra Stay menerima properti selain kost?"
              a="Ya. Kami juga menerima tipe hunian lain sesuai hasil evaluasi lokasi dan segmen pasar."
            />
            <FaqItem
              q="Bagaimana skema pembagian hasil?"
              a="Skema ditentukan setelah survei properti agar sesuai potensi unit dan kebutuhan pemilik."
            />
            <FaqItem
              q="Apakah saya tetap bisa memantau performa properti?"
              a="Bisa. Anda tetap mendapatkan laporan performa dan pembaruan operasional secara berkala."
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-16">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#188D3B]">
              Fleksibilitas Kemitraan
            </p>
            <h2 className="mt-2 text-2xl font-bold md:text-3xl">
              Pilihan Skema Sesuai Tujuan Properti
            </h2>
          </div>
          <p className="max-w-xl text-sm text-slate-600">
            Skema final ditentukan bersama setelah evaluasi unit, target pasar,
            dan preferensi arus kas pemilik.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {PARTNERSHIP_MODELS.map((model) => (
            <PartnershipModelCard
              key={model.title}
              title={model.title}
              desc={model.desc}
              fit={model.fit}
            />
          ))}
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#188D3B]">
                Mitra Kami
              </p>
              <h2 className="mt-2 text-2xl font-bold md:text-3xl">
                Mitra Kerja Sama Kyra Stay
              </h2>
            </div>
            <p className="max-w-xl text-sm text-slate-600">
              Kolaborasi dengan berbagai properti dan pengelola hunian untuk
              memperluas pilihan unit yang terstandar.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {PARTNER_LOGOS.map((partner) => (
              <PartnerLogoCard
                key={partner.name}
                name={partner.name}
                category={partner.category}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-16">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0F7A2A] to-[#188D3B] px-6 py-10 text-white md:px-10">
          <div className="pointer-events-none absolute -top-10 right-0 h-44 w-44 rounded-full bg-white/15 blur-2xl" />
          <h2 className="max-w-2xl text-2xl font-bold md:text-3xl">
            Siap Mengembangkan Properti Anda dengan Model Kemitraan yang Lebih
            Modern?
          </h2>
          <p className="mt-3 max-w-2xl text-sm text-white/90">
            Konsultasi awal gratis untuk memetakan potensi properti dan
            menyusun rencana pengelolaan yang tepat.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center rounded-xl bg-white px-5 text-sm font-semibold text-[#188D3B] transition hover:bg-slate-100"
            >
              Mulai Konsultasi
            </a>
            <a
              href="mailto:support@kyrastay.id"
              className="inline-flex h-11 items-center rounded-xl border border-white/45 px-5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              support@kyrastay.id
            </a>
          </div>
        </div>
      </section>

      <footer className="bg-gradient-to-r from-[#0F7A2A] to-[#188D3B] text-white">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="grid gap-8 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Image
                  src="/logo-header-400.webp"
                  alt="KiKost"
                  width={204}
                  height={64}
                  className="h-16 w-auto rounded object-contain"
                />
                <span className="text-sm text-green-100">dikelola oleh</span>
                <Image
                  src="/logo-white-400.webp"
                  alt="Kyra Stay"
                  width={92}
                  height={28}
                  className="h-7 w-auto object-contain"
                />
              </div>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-green-50/95">
                Program kemitraan properti dengan proses orientasi terstruktur
                dan pendampingan operasional dari tim Kyra Stay.
              </p>
              <p className="mt-4 text-sm text-green-100">
                Bogor, Jawa Barat • support@kyrastay.id
              </p>
            </div>

            {PARTNERSHIP_FOOTER_COLUMNS.map((column) => (
              <PartnershipFooterCol
                key={column.title}
                title={column.title}
                items={column.items}
              />
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-white/20 pt-4 text-xs text-green-100">
            <p>© 2026 KiKost by Kyra Stay.</p>
            <div className="flex items-center gap-4">
              <Link href="/tentang" className="transition hover:text-white">
                Tentang
              </Link>
              <Link href="/kerjasama" className="transition hover:text-white">
                Kerjasama
              </Link>
              <Link href="/" className="transition hover:text-white">
                Beranda
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Stat({ number, label }: { number: string; label: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-4 text-center">
      <p className="text-2xl font-bold text-[#188D3B] md:text-3xl">{number}</p>
      <p className="mt-1 text-xs text-slate-600 md:text-sm">{label}</p>
    </div>
  );
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/35 bg-white/10 px-3 py-2 backdrop-blur-sm">
      <p className="text-[11px] text-white/75">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}

function BenefitCard({
  icon,
  title,
  desc,
}: {
  icon: ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#188D3B]/10 text-[#188D3B]">
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-slate-600">{desc}</p>
    </div>
  );
}

function ServiceCard({
  icon,
  title,
  desc,
}: {
  icon: ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#188D3B]/10 text-[#188D3B]">
        {icon}
      </div>
      <h3 className="mt-3 text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-600">{desc}</p>
    </div>
  );
}

function StepCard({
  number,
  title,
  desc,
}: {
  number: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#188D3B] text-sm font-bold text-white">
        {number}
      </div>
      <p className="mt-3 font-semibold text-slate-900">{title}</p>
      <p className="mt-1 text-sm text-slate-600">{desc}</p>
    </div>
  );
}

function PartnershipModelCard({
  title,
  desc,
  fit,
}: {
  title: string;
  desc: string;
  fit: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-base font-semibold text-slate-900">{title}</p>
      <p className="mt-2 text-sm text-slate-600">{desc}</p>
      <p className="mt-4 rounded-xl bg-[#188D3B]/8 px-3 py-2 text-xs font-medium text-[#188D3B]">
        {fit}
      </p>
    </div>
  );
}

function PartnerLogoCard({
  name,
  category,
}: {
  name: string;
  category: string;
}) {
  const logoText = name
    .split(" ")
    .map((word) => word.charAt(0))
    .join("")
    .slice(0, 3)
    .toUpperCase();

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:shadow-sm">
      <div className="flex items-center gap-3">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#188D3B]/10 text-xs font-bold tracking-wide text-[#188D3B]">
          {logoText}
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">{name}</p>
          <p className="text-xs text-slate-500">{category}</p>
        </div>
      </div>
    </div>
  );
}

function CompareRow({
  icon,
  title,
  before,
  after,
}: {
  icon: ReactNode;
  title: string;
  before: string;
  after: string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="grid md:grid-cols-[220px_1fr_1fr]">
        <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 md:border-r md:border-b-0">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#188D3B]/10 text-[#188D3B]">
            {icon}
          </span>
          {title}
        </div>

        <div className="border-b border-slate-200 bg-rose-50/70 px-4 py-3 text-sm text-rose-700 md:border-r md:border-b-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-rose-600 md:hidden">
            Sebelum
          </p>
          <p className="mt-1 md:mt-0">{before}</p>
        </div>

        <div className="bg-emerald-50/70 px-4 py-3 text-sm text-emerald-700">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-emerald-600 md:hidden">
            Sesudah
          </p>
          <p className="mt-1 md:mt-0">{after}</p>
        </div>
      </div>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <details className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 transition open:border-[#188D3B]/35 open:bg-[#188D3B]/[0.03]">
      <summary className="list-none cursor-pointer text-sm font-semibold text-slate-800 [&::-webkit-details-marker]:hidden">
        {q}
      </summary>
      <p className="mt-2 text-sm text-slate-600">{a}</p>
    </details>
  );
}

function PartnershipFooterCol({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <div>
      <p className="text-sm font-semibold tracking-wide text-white">{title}</p>
      <div className="mt-3 space-y-2 text-sm text-green-100">
        {items.map((item) => (
          <p key={item} className="transition hover:text-white">
            {item}
          </p>
        ))}
      </div>
    </div>
  );
}
