import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  ChartLine,
  CheckCircle2,
  Compass,
  Handshake,
  Layers3,
  Sparkles,
} from "lucide-react";
import RevealOnScroll from "@/components/ui/RevealOnScroll";

const COMPANY_HIGHLIGHTS = [
  { label: "Perusahaan", value: "Kinara Land" },
  { label: "Merek Operasional", value: "Kyra Stay" },
  { label: "Fokus", value: "Hunian Mahasiswa & Properti Produktif" },
  { label: "Model", value: "Kembangkan, Kelola, Tumbuhkan" },
];

const BUSINESS_PILLARS: Array<{ icon: ReactNode; title: string; desc: string }> = [
  {
    icon: <Building2 size={18} />,
    title: "Pengembangan Properti",
    desc: "Merancang aset hunian yang relevan dengan permintaan nyata di sekitar kampus.",
  },
  {
    icon: <Layers3 size={18} />,
    title: "Manajemen Operasional",
    desc: "Standarisasi proses tinggal, perawatan unit, dan layanan penghuni.",
  },
  {
    icon: <ChartLine size={18} />,
    title: "Optimasi Kinerja Aset",
    desc: "Mengelola okupansi, harga, dan kinerja unit secara terukur.",
  },
  {
    icon: <Handshake size={18} />,
    title: "Kemitraan Jangka Panjang",
    desc: "Membangun kolaborasi berkelanjutan dengan pemilik dan mitra properti.",
  },
];

const PERFORMANCE_METRICS = [
  { value: "120+", label: "Unit dalam Ekosistem" },
  { value: "95%", label: "Rata-rata Okupansi" },
  { value: "10.000+", label: "Penghuni Aktif" },
  { value: "15+", label: "Area Operasional" },
];

const PORTFOLIO_ITEMS = [
  {
    name: "Kinara Signature Kost",
    location: "Dramaga, Bogor",
    image: "/bg-1200.webp",
    desc: "Hunian mahasiswa dengan pendekatan layanan premium dan akses kampus cepat.",
  },
  {
    name: "Kinara Manunggal",
    location: "Bogor Barat",
    image: "/bg-1200.webp",
    desc: "Aset hunian produktif dengan permintaan stabil sepanjang kalender akademik.",
  },
  {
    name: "Kinara Kost Cifor",
    location: "Cifor, Bogor",
    image: "/bg-1200.webp",
    desc: "Menjaga keseimbangan kenyamanan penghuni dan efisiensi operasional properti.",
  },
];

const GOVERNANCE_FLOW = [
  "Akuisisi dan kurasi aset berdasarkan lokasi dan permintaan pasar",
  "Standarisasi unit, fasilitas, dan SOP layanan penghuni",
  "Operasional harian melalui merek Kyra Stay",
  "Evaluasi berkala untuk peningkatan nilai aset dan pengalaman penyewa",
];

export default function CompanyProfilePage() {
  return (
    <div className="font-manrope min-h-screen bg-[#F5F2EC] text-slate-900">
      <section className="relative overflow-hidden bg-[#1E293B] text-white">
        <Image
          src="/bg-1200.webp"
          alt="Profil Perusahaan Kinara Land"
          fill
          priority
          className="object-cover opacity-25"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#111827]/95 via-[#111827]/82 to-[#1f2937]/90" />
        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-emerald-300/15 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-[1.08fr_0.92fr] lg:py-20">
          <RevealOnScroll>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-1.5 text-xs font-semibold tracking-[0.12em]">
              <Sparkles size={14} />
              COMPANY PROFILE
            </p>
            <h1 className="font-playfair mt-4 max-w-3xl text-4xl leading-tight md:text-5xl">
              Kinara Land
              <span className="block text-amber-300">
                Induk Usaha dari Ekosistem Kyra Stay
              </span>
            </h1>
            <p className="mt-4 max-w-2xl text-sm text-white/85 md:text-base">
              Kinara Land berperan sebagai perusahaan pengembangan dan pengelolaan
              properti yang menaungi Kyra Stay sebagai merek operasional hunian
              mahasiswa. Fokus kami adalah membangun aset produktif dengan model
              operasional yang konsisten dan terukur.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/sewa"
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-amber-300 px-5 text-sm font-semibold text-slate-900 transition hover:bg-amber-200"
              >
                Jelajahi Properti
                <ArrowRight size={15} />
              </Link>
              <Link
                href="/kerjasama"
                className="inline-flex h-11 items-center rounded-xl border border-white/45 px-5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Diskusi Kemitraan
              </Link>
            </div>
          </RevealOnScroll>

          <RevealOnScroll delayMs={140}>
            <div className="rounded-3xl border border-white/25 bg-white/10 p-5 backdrop-blur-md">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">
                Ringkasan Entitas
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {COMPANY_HIGHLIGHTS.map((item, index) => (
                  <div
                    key={item.label}
                    className="rounded-xl border border-white/20 bg-white/10 px-3 py-3"
                    style={{ transitionDelay: `${index * 70}ms` }}
                  >
                    <p className="text-[11px] uppercase tracking-[0.1em] text-white/65">
                      {item.label}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-white">{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-xl border border-amber-300/40 bg-amber-300/10 p-3">
                <p className="text-xs font-medium text-amber-200">
                  Kinara Land membangun arah bisnis properti.
                </p>
                <p className="mt-1 text-xs text-white/80">
                  Kyra Stay menjalankan operasional dan pengalaman penghuni di
                  lapangan.
                </p>
              </div>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      <section className="relative z-20 mx-auto -mt-7 max-w-6xl px-6">
        <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-300/40 md:grid-cols-4">
          {PERFORMANCE_METRICS.map((item, index) => (
            <RevealOnScroll key={item.label} delayMs={index * 80}>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-4 text-center">
                <p className="font-playfair text-2xl text-[#1f2937] md:text-3xl">
                  {item.value}
                </p>
                <p className="mt-1 text-xs text-slate-600 md:text-sm">{item.label}</p>
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14">
        <RevealOnScroll>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Pilar Bisnis Kinara Land
          </p>
          <h2 className="font-playfair mt-2 text-3xl text-slate-900 md:text-4xl">
            Dari Pengembangan Aset Hingga Operasional Penghuni
          </h2>
        </RevealOnScroll>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {BUSINESS_PILLARS.map((item, index) => (
            <RevealOnScroll key={item.title} delayMs={index * 90}>
              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                  {item.icon}
                </div>
                <h3 className="mt-3 text-base font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{item.desc}</p>
              </article>
            </RevealOnScroll>
          ))}
        </div>
      </section>

      <section className="bg-white py-14">
        <div className="mx-auto grid max-w-7xl gap-6 px-6 lg:grid-cols-[1fr_1fr]">
          <RevealOnScroll>
            <div className="rounded-3xl border border-slate-200 bg-[#0f172a] p-6 text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-300">
                Tata Kelola
              </p>
              <h3 className="font-playfair mt-2 text-3xl">Alur Kerja Strategis</h3>
              <div className="mt-4 space-y-2.5">
                {GOVERNANCE_FLOW.map((item, index) => (
                  <div
                    key={item}
                    className="flex items-start gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/85"
                  >
                    <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-amber-300" />
                    <span>
                      <strong className="mr-1 text-amber-200">{index + 1}.</strong>
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </RevealOnScroll>

          <RevealOnScroll delayMs={120}>
            <div className="relative h-full min-h-[360px] overflow-hidden rounded-3xl border border-slate-200 bg-slate-100">
              <Image
                src="/bg-1200.webp"
                alt="Operasional properti Kinara Land"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/25 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-white/25 bg-white/10 p-4 backdrop-blur-sm">
                <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-white/80">
                  <Compass size={14} />
                  Positioning
                </p>
                <p className="mt-2 text-sm leading-relaxed text-white/90">
                  Kinara Land memimpin strategi aset; Kyra Stay mengeksekusi
                  layanan penghuni secara operasional.
                </p>
              </div>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14">
        <RevealOnScroll>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Portofolio Properti
          </p>
          <h2 className="font-playfair mt-2 text-3xl text-slate-900 md:text-4xl">
            Aset yang Dikelola Dalam Ekosistem Kinara Land
          </h2>
        </RevealOnScroll>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {PORTFOLIO_ITEMS.map((item, index) => (
            <RevealOnScroll key={item.name} delayMs={index * 110}>
              <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="relative h-44 overflow-hidden">
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    className="object-cover transition duration-500 hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <p className="absolute bottom-3 left-3 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
                    {item.location}
                  </p>
                </div>
                <div className="p-4">
                  <h3 className="text-base font-semibold text-slate-900">{item.name}</h3>
                  <p className="mt-2 text-sm text-slate-600">{item.desc}</p>
                </div>
              </article>
            </RevealOnScroll>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-16">
        <RevealOnScroll>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#111827] via-[#1f2937] to-[#334155] px-6 py-10 text-white md:px-10">
            <div className="pointer-events-none absolute -top-10 right-0 h-44 w-44 rounded-full bg-amber-300/20 blur-2xl" />
            <h2 className="font-playfair max-w-2xl text-3xl md:text-4xl">
              Kenali Strategi Properti Kinara Land Lebih Dalam
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-white/85">
              Kami siap berdiskusi mengenai model pengembangan aset, operasional
              Kyra Stay, dan peluang kolaborasi berkelanjutan.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/kerjasama"
                className="inline-flex h-11 items-center rounded-xl bg-amber-300 px-5 text-sm font-semibold text-slate-900 transition hover:bg-amber-200"
              >
                Lihat Program Kemitraan
              </Link>
              <Link
                href="/auth?next=%2Fcompany-profile"
                className="inline-flex h-11 items-center rounded-xl border border-white/45 px-5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Hubungi Tim
              </Link>
            </div>
          </div>
        </RevealOnScroll>
      </section>
    </div>
  );
}
