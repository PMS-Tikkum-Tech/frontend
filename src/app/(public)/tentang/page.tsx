"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardList,
  Clock3,
  GraduationCap,
  Handshake,
  LineChart,
  MapPinHouse,
  ShieldCheck,
  Sparkles,
  Users,
  Wifi,
} from "lucide-react";

const CORE_VALUES: Array<{ icon: ReactNode; title: string; desc: string }> = [
  {
    icon: <MapPinHouse size={18} />,
    title: "Lokasi Relevan untuk Mahasiswa",
    desc: "Fokus di area strategis dekat kampus, transportasi, dan kebutuhan harian.",
  },
  {
    icon: <ShieldCheck size={18} />,
    title: "Keamanan Sebagai Prioritas",
    desc: "Hunian dikelola dengan standar operasional yang menjaga rasa aman penghuni.",
  },
  {
    icon: <Wifi size={18} />,
    title: "Fasilitas Siap Pakai",
    desc: "Akses internet stabil, area tinggal nyaman, dan dukungan perawatan terjadwal.",
  },
  {
    icon: <LineChart size={18} />,
    title: "Pengelolaan Berbasis Data",
    desc: "Keputusan operasional dan harga didorong oleh data performa properti.",
  },
];

const COMPANY_PROFILE_ITEMS = [
  {
    icon: <Building2 size={16} />,
    label: "Nama Perusahaan",
    value: "PT Kyra Stay Indonesia",
  },
  {
    icon: <ClipboardList size={16} />,
    label: "Fokus Utama",
    value: "Pengelolaan hunian mahasiswa dan profesional muda",
  },
  {
    icon: <Handshake size={16} />,
    label: "Model Layanan",
    value: "Manajemen end-to-end dan kemitraan properti",
  },
  {
    icon: <ShieldCheck size={16} />,
    label: "Standar Operasional",
    value: "Keamanan, kenyamanan, dan transparansi layanan",
  },
];

const QUALITY_FLOW: Array<{ title: string; desc: string }> = [
  {
    title: "Kurasi Properti",
    desc: "Setiap unit dievaluasi berdasarkan lokasi, kondisi bangunan, dan fasilitas inti.",
  },
  {
    title: "Standarisasi Layanan",
    desc: "Proses orientasi penghuni, pembayaran, dan dukungan harian disusun terstruktur.",
  },
  {
    title: "Pemantauan Berkala",
    desc: "Kinerja hunian dipantau melalui indikator okupansi, kepuasan, dan respon operasional.",
  },
  {
    title: "Perbaikan Berkelanjutan",
    desc: "Masukan penyewa dan pemilik diterjemahkan menjadi peningkatan kualitas layanan.",
  },
];

const TESTIMONIALS = [
  {
    name: "Alya Putri",
    role: "Mahasiswa IPB",
    quote:
      "Lingkungan nyaman, akses kampus dekat, dan proses administrasi jauh lebih praktis.",
  },
  {
    name: "Rizky Pratama",
    role: "Mahasiswa Pascasarjana",
    quote:
      "Saya suka karena pengelolaan properti rapi, sehingga bisa fokus kuliah tanpa drama.",
  },
  {
    name: "Nabila Sari",
    role: "Profesional Muda",
    quote:
      "Fasilitas memadai dan respon tim cepat ketika ada kebutuhan perawatan unit.",
  },
];

const ABOUT_FOOTER_COLUMNS = [
  {
    title: "Menu",
    items: ["Beranda", "Sewa", "Kerjasama", "Tentang"],
  },
  {
    title: "Layanan",
    items: ["Pencarian Kost", "Jadwal Kunjungan", "Favorit", "Pusat Bantuan"],
  },
  {
    title: "Kontak",
    items: ["WhatsApp Administrator", "support@kyrastay.id", "Bogor, Jawa Barat"],
  },
];

export default function TentangPage() {
  return (
    <div className="overflow-hidden bg-slate-50 text-slate-900">
      <section className="relative bg-gradient-to-br from-[#0B3D91] via-[#154DA5] to-[#2A6CCF] text-white">
        <div className="pointer-events-none absolute -top-20 -left-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute right-0 bottom-0 h-72 w-72 rounded-full bg-cyan-300/20 blur-3xl" />

        <div className="absolute inset-0 opacity-10">
          <Image
            src="/bg-1200.webp"
            alt="Tentang Kyra Stay"
            fill
            className="object-cover"
          />
        </div>

        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-6 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/10 px-4 py-1.5 text-xs font-semibold tracking-wide">
              <Sparkles size={14} />
              Tentang Kyra Stay
            </p>
            <h1 className="mt-4 text-4xl font-bold leading-tight md:text-5xl">
              Hunian Mahasiswa yang Nyaman, Aman, dan Mendukung Produktivitas
            </h1>
            <p className="mt-4 max-w-2xl text-sm text-white/90 md:text-base">
              Kyra Stay hadir sebagai ekosistem hunian modern untuk mahasiswa
              dan profesional muda, dengan pengelolaan yang transparan, cepat,
              dan berorientasi kualitas hidup penghuni.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/sewa"
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-[#0B3D91] shadow-lg shadow-black/20 transition hover:bg-slate-100"
              >
                Lihat Hunian
                <ArrowRight size={15} />
              </Link>
              <Link
                href="/kerjasama"
                className="inline-flex h-11 items-center rounded-xl border border-white/45 px-5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Kerja Sama Properti
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="relative h-[330px] overflow-hidden rounded-3xl border border-white/30 bg-white/10 shadow-2xl backdrop-blur-sm md:h-[400px]">
              <Image
                src="/bg-1200.webp"
                alt="Hunian mahasiswa Kyra Stay"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B3D91]/75 via-[#0B3D91]/25 to-transparent" />
              <div className="absolute right-4 bottom-4 left-4 rounded-2xl border border-white/30 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-sm font-semibold">Pengalaman Tinggal yang Seimbang</p>
                <p className="mt-1 text-xs text-white/85">
                  Fokus belajar, kenyamanan harian, dan interaksi komunitas dalam
                  satu lingkungan hunian.
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-white/35 bg-white/15 px-4 py-3 backdrop-blur-md">
              <p className="text-[11px] uppercase tracking-[0.12em] text-white/75">
                Tingkat kepuasan penghuni
              </p>
              <p className="mt-1 text-2xl font-bold leading-none">4.8 / 5</p>
              <p className="mt-1 text-[11px] text-white/70">
                Berdasarkan evaluasi pengalaman tinggal
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-20 mx-auto mt-6 max-w-6xl px-6">
        <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/60 md:grid-cols-4">
          <StatCard value="120+" label="Properti Aktif" />
          <StatCard value="10.000+" label="Penyewa Aktif" />
          <StatCard value="95%" label="Rata-rata Okupansi" />
          <StatCard value="15+" label="Area Terjangkau" />
        </div>
      </section>

      <section id="company-profile" className="mx-auto max-w-7xl px-6 pt-10">
        <div className="grid gap-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0B3D91]">
              Profil Perusahaan
            </p>
            <h2 className="mt-2 text-2xl font-bold md:text-3xl">
              Profil Perusahaan Kyra Stay
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600 md:text-base">
              Kyra Stay adalah perusahaan pengelolaan properti yang membangun
              ekosistem hunian terstandar untuk mahasiswa dan profesional muda.
              Fokus kami adalah kualitas pengalaman tinggal dan keberlanjutan
              performa properti.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {COMPANY_PROFILE_ITEMS.map((item) => (
                <CompanyProfileItem
                  key={item.label}
                  icon={item.icon}
                  label={item.label}
                  value={item.value}
                />
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-semibold text-slate-900">
              Cakupan Peran Perusahaan
            </p>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li>Kurasi properti berdasarkan lokasi, fasilitas, dan permintaan pasar.</li>
              <li>Pengelolaan operasional penyewa dari orientasi hingga perawatan.</li>
              <li>Pelaporan performa properti untuk pemilik secara berkala.</li>
              <li>Pengembangan layanan berkelanjutan berbasis umpan balik penghuni.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-6 py-16 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0B3D91]">
            Cerita Kami
          </p>
          <h2 className="mt-2 text-2xl font-bold md:text-3xl">
            Mengapa Kyra Stay Dibangun?
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-slate-600 md:text-base">
            Banyak mahasiswa kesulitan menemukan hunian yang benar-benar
            mendukung ritme akademik: lokasi jauh, fasilitas tidak konsisten,
            atau pengelolaan yang kurang responsif.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-slate-600 md:text-base">
            Kyra Stay dibangun untuk menjawab masalah tersebut melalui standar
            kualitas hunian, manajemen operasional yang rapi, dan pengalaman
            tinggal yang lebih manusiawi.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0B3D91]">
            Komitmen Kami
          </p>
          <h3 className="mt-2 text-2xl font-bold">Prinsip Layanan Harian</h3>
          <div className="mt-4 space-y-3">
            <CommitmentItem
              icon={<CheckCircle2 size={16} />}
              text="Harga transparan dan informasi properti yang jelas."
            />
            <CommitmentItem
              icon={<Clock3 size={16} />}
              text="Respon operasional cepat untuk kebutuhan penghuni."
            />
            <CommitmentItem
              icon={<GraduationCap size={16} />}
              text="Lingkungan tinggal yang mendukung fokus akademik."
            />
            <CommitmentItem
              icon={<Handshake size={16} />}
              text="Kolaborasi jangka panjang dengan pemilik properti."
            />
          </div>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-9 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0B3D91]">
                Visi & Misi
              </p>
              <h2 className="mt-2 text-2xl font-bold md:text-3xl">
                Arah Jangka Panjang Kyra Stay
              </h2>
            </div>
            <p className="max-w-xl text-sm text-slate-600">
              Kami membangun standar hunian mahasiswa yang tidak hanya layak
              dihuni, tetapi juga berdampak pada kualitas hidup dan prestasi.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#0B3D91]">
                Visi
              </p>
              <p className="mt-3 text-sm leading-relaxed text-slate-700 md:text-base">
                Menjadi penyedia hunian mahasiswa terpercaya yang menghadirkan
                kenyamanan, keamanan, dan kualitas hidup terbaik melalui
                pengelolaan properti berbasis teknologi.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#0B3D91]">
                Misi
              </p>
              <ul className="mt-3 space-y-2 text-sm text-slate-700 md:text-base">
                <li>Menyediakan hunian berkualitas dengan harga transparan.</li>
                <li>Membangun lingkungan tinggal yang aman dan nyaman.</li>
                <li>Mengelola properti secara profesional dan terukur.</li>
                <li>Mendukung aktivitas akademik penghuni setiap hari.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-9 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0B3D91]">
              Keunggulan
            </p>
            <h2 className="mt-2 text-2xl font-bold md:text-3xl">
              Nilai Utama yang Kami Jaga
            </h2>
          </div>
          <p className="max-w-xl text-sm text-slate-600">
            Setiap properti Kyra Stay mengikuti standar layanan agar pengalaman
            tinggal tetap konsisten dari awal hingga akhir masa sewa.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CORE_VALUES.map((item) => (
            <ValueCard
              key={item.title}
              icon={item.icon}
              title={item.title}
              desc={item.desc}
            />
          ))}
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-9 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0B3D91]">
                Standar Kualitas
              </p>
              <h2 className="mt-2 text-2xl font-bold md:text-3xl">
                Cara Kami Menjaga Mutu Hunian
              </h2>
            </div>
            <p className="max-w-xl text-sm text-slate-600">
              Proses operasional kami dirancang agar penghuni mendapat kualitas
              layanan yang konsisten dan pemilik tetap punya visibilitas penuh.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {QUALITY_FLOW.map((item, index) => (
              <FlowCard
                key={item.title}
                number={index + 1}
                title={item.title}
                desc={item.desc}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-9 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0B3D91]">
              Testimoni
            </p>
            <h2 className="mt-2 text-2xl font-bold md:text-3xl">
              Pengalaman Penghuni Bersama Kyra Stay
            </h2>
          </div>
          <p className="max-w-xl text-sm text-slate-600">
            Masukan penyewa menjadi acuan utama kami dalam meningkatkan kualitas
            layanan secara berkelanjutan.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {TESTIMONIALS.map((item) => (
            <TestimonialCard
              key={item.name}
              name={item.name}
              role={item.role}
              quote={item.quote}
            />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-16">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0B3D91] to-[#2A6CCF] px-6 py-10 text-white md:px-10">
          <div className="pointer-events-none absolute -top-10 right-0 h-44 w-44 rounded-full bg-white/15 blur-2xl" />
          <h2 className="max-w-2xl text-2xl font-bold md:text-3xl">
            Siap Menemukan Hunian yang Tepat Bersama Kyra Stay?
          </h2>
          <p className="mt-3 max-w-2xl text-sm text-white/90">
            Jelajahi unit tersedia atau konsultasikan kebutuhan hunian Anda
            bersama tim kami.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/sewa"
              className="inline-flex h-11 items-center rounded-xl bg-white px-5 text-sm font-semibold text-[#0B3D91] transition hover:bg-slate-100"
            >
              Cari Hunian
            </Link>
            <Link
              href="/auth?next=%2Fsewa"
              className="inline-flex h-11 items-center rounded-xl border border-white/45 px-5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Mulai Sekarang
            </Link>
          </div>
        </div>
      </section>

      <footer className="bg-gradient-to-r from-[#0B3D91] to-[#0E7490] text-white">
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
                <span className="text-sm text-blue-100">dikelola oleh</span>
                <Image
                  src="/logo-white-400.webp"
                  alt="Kyra Stay"
                  width={92}
                  height={28}
                  className="h-7 w-auto object-contain"
                />
              </div>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-blue-50/95">
                Profil dan layanan hunian mahasiswa yang dikelola tim Kyra Stay
                dengan standar operasional yang jelas.
              </p>
              <p className="mt-4 text-sm text-blue-100">
                Bogor, Jawa Barat • support@kyrastay.id
              </p>
            </div>

            {ABOUT_FOOTER_COLUMNS.map((column) => (
              <AboutFooterCol
                key={column.title}
                title={column.title}
                items={column.items}
              />
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-white/20 pt-4 text-xs text-blue-100">
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

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-4 text-center">
      <p className="text-2xl font-bold text-[#0B3D91] md:text-3xl">{value}</p>
      <p className="mt-1 text-xs text-slate-600 md:text-sm">{label}</p>
    </div>
  );
}

function CompanyProfileItem({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 text-[#0B3D91]">{icon}</span>
        <div>
          <p className="text-[11px] uppercase tracking-[0.1em] text-slate-500">
            {label}
          </p>
          <p className="text-sm font-medium text-slate-800">{value}</p>
        </div>
      </div>
    </div>
  );
}

function ValueCard({
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
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#0B3D91]/10 text-[#0B3D91]">
        {icon}
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-600">{desc}</p>
    </div>
  );
}

function CommitmentItem({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
      <span className="mt-0.5 text-[#0B3D91]">{icon}</span>
      <p>{text}</p>
    </div>
  );
}

function FlowCard({
  number,
  title,
  desc,
}: {
  number: number;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#0B3D91] text-sm font-bold text-white">
        {number}
      </div>
      <p className="mt-3 font-semibold text-slate-900">{title}</p>
      <p className="mt-1 text-sm text-slate-600">{desc}</p>
    </div>
  );
}

function TestimonialCard({
  name,
  role,
  quote,
}: {
  name: string;
  role: string;
  quote: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#0B3D91]/10 text-[#0B3D91]">
        <Users size={16} />
      </div>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">
        &ldquo;{quote}&rdquo;
      </p>
      <p className="mt-4 font-semibold text-slate-900">{name}</p>
      <p className="text-xs text-slate-500">{role}</p>
    </div>
  );
}

function AboutFooterCol({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="text-sm font-semibold tracking-wide text-white">{title}</p>
      <div className="mt-3 space-y-2 text-sm text-blue-100">
        {items.map((item) => (
          <p key={item} className="transition hover:text-white">
            {item}
          </p>
        ))}
      </div>
    </div>
  );
}
