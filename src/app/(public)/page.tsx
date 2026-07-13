import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import HomeHeroCarousel from "@/components/public/HomeHeroCarousel";
import {
  ArrowRight,
  Building2,
  Check,
  Clock3,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  Wifi,
} from "lucide-react";

export const metadata: Metadata = {
  title: "KIKOST — Kost nyaman, sewa lebih mudah",
  description:
    "Temukan kost nyaman di lokasi pilihan dengan informasi yang jelas dan proses sewa yang mudah.",
};

const benefits = [
  {
    icon: MapPin,
    title: "Lokasi yang pas",
    description:
      "Bandingkan lokasi dan pilih hunian yang paling dekat dengan aktivitasmu.",
    accent: "bg-[#efedff] text-[#3423b8]",
  },
  {
    icon: ShieldCheck,
    title: "Informasi lebih jelas",
    description:
      "Lihat detail fasilitas, ketersediaan, dan tipe kamar sebelum memutuskan.",
    accent: "bg-sky-50 text-sky-700",
  },
  {
    icon: Clock3,
    title: "Proses lebih singkat",
    description:
      "Cari, pilih, dan lanjutkan pemesanan dalam satu alur yang praktis.",
    accent: "bg-indigo-50 text-indigo-700",
  },
];

const steps = [
  {
    number: "01",
    title: "Cari kost",
    description: "Pilih area dan lihat hunian yang tersedia.",
  },
  {
    number: "02",
    title: "Pilih kamar",
    description: "Cek fasilitas dan tentukan kamar yang cocok.",
  },
  {
    number: "03",
    title: "Ajukan sewa",
    description: "Lengkapi data dan lanjutkan pemesanan secara online.",
  },
];

export default function PublicHomePage() {
  return (
    <div className="bg-white text-slate-950">
      <section className="relative isolate overflow-hidden bg-[radial-gradient(circle_at_12%_12%,rgba(74,58,190,0.1),transparent_32%),radial-gradient(circle_at_86%_18%,rgba(58,180,255,0.12),transparent_28%),linear-gradient(180deg,#ffffff_0%,#fafaff_100%)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[42rem] bg-[radial-gradient(circle_at_18%_16%,rgba(52,35,184,0.08),transparent_32%),radial-gradient(circle_at_82%_20%,rgba(87,199,255,0.1),transparent_28%)]" />

        <div className="mx-auto max-w-7xl px-4 pb-14 pt-10 sm:px-6 lg:hidden">
          <div className="mx-auto max-w-[20.5rem] overflow-hidden rounded-[2rem] bg-slate-900 shadow-[0_32px_80px_rgba(15,23,42,0.22)]">
            <div className="relative aspect-[4/5]">
              <HomeHeroCarousel imageClassName="object-center" />
              <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-slate-950/70 via-slate-900/10 to-white/5" />
            </div>
          </div>

          <div className="mx-auto mt-8 max-w-2xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#dcd8ff] bg-[#f3f1ff] px-3 py-1.5 text-xs font-semibold text-[#3423b8] shadow-sm">
              <Sparkles size={14} aria-hidden="true" />
              Hunian nyaman, hidup lebih tenang
            </div>

            <h1 className="mx-auto mt-6 max-w-2xl text-4xl font-semibold leading-[1.08] tracking-[-0.04em] text-slate-950">
              Kost yang terasa seperti
              <span className="font-playfair block font-normal italic text-[#3423b8]">
                tempat pulang.
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-slate-600">
              Temukan kost nyaman di lokasi pilihan, dengan informasi yang jelas
              dan proses sewa yang tidak bikin ribet.
            </p>

            <div className="mt-8 flex flex-col items-center gap-3">
              <Link
                href="/booking/v2"
                className="group inline-flex min-h-12 w-full max-w-xs items-center justify-center gap-2 rounded-full bg-[#3423b8] px-6 py-3 text-sm font-semibold text-white shadow-[0_12px_32px_rgba(52,35,184,0.24)] transition hover:-translate-y-0.5 hover:bg-[#24147d]"
              >
                Cari kost sekarang
                <ArrowRight
                  size={17}
                  className="transition-transform group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm text-slate-600">
              {[
                "Pilihan fleksibel",
                "Informasi transparan",
                "Proses online",
              ].map((item) => (
                <span key={item} className="inline-flex items-center gap-2">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#d8ff3e] text-[#24147d]">
                    <Check size={12} strokeWidth={3} aria-hidden="true" />
                  </span>
                  {item}
                </span>
              ))}
            </div>

            <div className="mt-8 grid gap-3">
              <div className="rounded-2xl border border-white/80 bg-white/90 p-3.5 text-left shadow-xl backdrop-blur">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#ebe9ff] text-[#3423b8]">
                    <Building2 size={19} aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-xs text-slate-500">Hunian pilihan</p>
                    <p className="text-sm font-semibold text-slate-900">
                      Siap kamu jelajahi
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/80 bg-white/90 p-3.5 text-left shadow-xl backdrop-blur">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                    <Wifi size={19} aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-xs text-slate-500">Detail lengkap</p>
                    <p className="text-sm font-semibold text-slate-900">
                      Fasilitas mudah dicek
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto hidden max-w-7xl items-center gap-10 px-4 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-14 lg:grid lg:grid-cols-[0.88fr_1.12fr] lg:gap-16 lg:pb-24 lg:pt-16">
          <div className="relative z-10 order-2 text-center lg:order-1 lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#dcd8ff] bg-[#f3f1ff] px-3 py-1.5 text-xs font-semibold text-[#3423b8] shadow-sm">
              <Sparkles size={14} aria-hidden="true" />
              Hunian nyaman, hidup lebih tenang
            </div>

            <h1 className="mx-auto mt-6 max-w-2xl text-4xl font-semibold leading-[1.08] tracking-[-0.04em] text-slate-950 sm:text-5xl lg:mx-0 lg:text-[4rem]">
              Kost yang terasa seperti
              <span className="font-playfair block font-normal italic text-[#3423b8]">
                tempat pulang.
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8 lg:mx-0">
              Temukan kost nyaman di lokasi pilihan, dengan informasi yang jelas
              dan proses sewa yang tidak bikin ribet.
            </p>

            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-start lg:justify-start">
              <Link
                href="/booking/v2"
                className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#3423b8] px-6 py-3 text-sm font-semibold text-white shadow-[0_12px_32px_rgba(52,35,184,0.24)] transition hover:-translate-y-0.5 hover:bg-[#24147d]"
              >
                Cari kost sekarang
                <ArrowRight
                  size={17}
                  className="transition-transform group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm text-slate-600 lg:justify-start">
              {[
                "Pilihan fleksibel",
                "Informasi transparan",
                "Proses online",
              ].map((item) => (
                <span key={item} className="inline-flex items-center gap-2">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#d8ff3e] text-[#24147d]">
                    <Check size={12} strokeWidth={3} aria-hidden="true" />
                  </span>
                  {item}
                </span>
              ))}
            </div>

          </div>

          <div className="relative mx-auto order-1 w-full max-w-[24rem] lg:max-w-none lg:order-2">
            <div className="absolute -left-4 top-10 hidden h-28 w-28 rounded-full border border-[#dcd8ff] sm:block" />
            <div className="absolute -right-6 bottom-12 hidden h-40 w-40 rounded-full bg-sky-100 blur-sm sm:block" />

            <div className="relative mx-auto overflow-hidden rounded-[2rem] bg-slate-900 shadow-[0_32px_80px_rgba(15,23,42,0.22)] sm:rounded-[2.5rem]">
              <div className="relative aspect-[4/5] min-h-[30rem] sm:aspect-[5/4] lg:aspect-[4/3] lg:min-h-[35rem]">
                <HomeHeroCarousel imageClassName="object-center" />
                <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-slate-950/65 via-slate-900/5 to-white/5" />
              </div>
            </div>

            <div className="absolute -left-3 top-8 hidden rounded-2xl border border-white/80 bg-white/90 p-3.5 shadow-xl backdrop-blur sm:-left-8 sm:top-16 sm:block sm:p-4">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#ebe9ff] text-[#3423b8]">
                  <Building2 size={19} aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs text-slate-500">Hunian pilihan</p>
                  <p className="text-sm font-semibold text-slate-900">
                    Siap kamu jelajahi
                  </p>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-5 right-3 hidden rounded-2xl border border-white/80 bg-white/90 p-3.5 shadow-xl backdrop-blur sm:-bottom-7 sm:right-8 sm:block sm:p-4">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                  <Wifi size={19} aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs text-slate-500">Detail lengkap</p>
                  <p className="text-sm font-semibold text-slate-900">
                    Fasilitas mudah dicek
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#1d1269] text-white">
        <div className="mx-auto grid max-w-7xl divide-y divide-white/20 px-4 sm:px-6 md:grid-cols-3 md:divide-x md:divide-y-0">
          {[
            ["01", "Pilih sesuai kebutuhan"],
            ["02", "Lihat detail dengan jelas"],
            ["03", "Sewa tanpa banyak langkah"],
          ].map(([number, label]) => (
            <div
              key={number}
              className="flex items-center gap-4 py-5 md:px-7 md:first:pl-0 md:last:pr-0"
            >
              <span className="text-xs font-bold tracking-[0.18em] text-[#d8ff3e]">
                {number}
              </span>
              <p className="text-sm font-semibold text-white">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[#f8f8ff]">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#3423b8]">
              Dibuat lebih sederhana
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-4xl">
              Semua yang kamu perlukan,
              <span className="font-playfair ml-2 font-normal italic text-[#5141c7]">
                tanpa yang tidak perlu.
              </span>
            </h2>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {benefits.map(({ icon: Icon, title, description, accent }) => (
              <article
                key={title}
                className="group rounded-[1.75rem] border border-[#e5e2ff] bg-white p-6 transition duration-300 hover:-translate-y-1 hover:border-[#c7c0ff] hover:shadow-[0_20px_50px_rgba(52,35,184,0.1)] sm:p-7"
              >
                <span
                  className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${accent}`}
                >
                  <Icon size={22} aria-hidden="true" />
                </span>
                <h3 className="mt-8 text-lg font-semibold text-slate-900">
                  {title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {description}
                </p>
                <div className="mt-8 h-px w-full bg-slate-100 transition-colors group-hover:bg-[#ddd8ff]" />
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#15104f] text-white">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 sm:py-24 lg:grid-cols-[0.75fr_1.25fr] lg:gap-20">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#d8ff3e]">
              Cara kerjanya
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
              Tiga langkah menuju kamar barumu.
            </h2>
            <p className="mt-5 max-w-md text-sm leading-7 text-blue-50/70">
              Alur pencarian dibuat fokus supaya kamu bisa mengambil keputusan
              dengan cepat dan nyaman.
            </p>
            <Link
              href="/booking/v2"
              className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-[#d8ff3e] transition hover:text-white"
            >
              Mulai cari kost
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>

          <div className="divide-y divide-white/15 border-y border-white/15">
            {steps.map((step) => (
              <div
                key={step.number}
                className="grid gap-3 py-7 sm:grid-cols-[4rem_1fr] sm:items-start sm:gap-5"
              >
                <span className="font-playfair text-2xl italic text-[#d8ff3e]">
                  {step.number}
                </span>
                <div>
                  <h3 className="text-lg font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-blue-50/65">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl bg-white px-4 py-20 sm:px-6 sm:py-24">
        <div className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-[linear-gradient(125deg,#4430c3_0%,#2b1b98_58%,#21136f_100%)] px-6 py-12 text-white shadow-[0_24px_60px_rgba(13,8,60,0.3)] sm:px-10 sm:py-14 lg:flex lg:items-center lg:justify-between lg:gap-10 lg:px-14">
          <div className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full border-[48px] border-white/10" />
          <div className="pointer-events-none absolute -bottom-36 right-48 h-64 w-64 rounded-full bg-sky-300/25 blur-2xl" />

          <div className="relative max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#d8ff3e]">
              Kamar yang tepat sudah menunggu
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
              Mulai pencarianmu hari ini.
            </h2>
            <p className="mt-4 text-sm leading-7 text-blue-50/80 sm:text-base">
              Jelajahi pilihan kost dan temukan tempat yang paling cocok
              untukmu.
            </p>
          </div>

          <Link
            href="/booking/v2"
            className="relative mt-8 inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-[#d8ff3e] px-6 py-3 text-sm font-semibold text-[#24147d] transition hover:-translate-y-0.5 hover:bg-[#c9f12e] lg:mt-0"
          >
            <Search size={17} aria-hidden="true" />
            Lihat pilihan kost
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-8 text-sm text-slate-500 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/logo-header.png"
              alt="KIKOST"
              width={48}
              height={48}
              className="h-10 w-10 object-contain"
            />
            <p>Hunian nyaman untuk langkah barumu.</p>
          </div>
          <div className="text-sm font-medium text-slate-500">
            Dikelola oleh Kyra Stay Hospitality
          </div>
        </div>
      </footer>
    </div>
  );
}
