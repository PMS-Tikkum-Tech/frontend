"use client";

import Link from "next/link";
import { ArrowRight, ShieldAlert } from "lucide-react";

export default function EmailVerificationRedirectPage() {
  return (
    <div className="font-plus-jakarta min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.18),_transparent_42%),linear-gradient(180deg,_#f8fbff_0%,_#eef4fb_52%,_#f8fafc_100%)] px-4 py-10 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl items-center justify-center">
        <div className="grid w-full max-w-4xl overflow-hidden rounded-[2rem] border border-white/70 bg-white/90 shadow-[0_30px_90px_rgba(15,23,42,0.10)] backdrop-blur md:grid-cols-[1.05fr_0.95fr]">
          <section className="relative overflow-hidden bg-[#0f172a] px-7 py-8 text-white sm:px-10 sm:py-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(56,189,248,0.32),_transparent_34%),radial-gradient(circle_at_bottom_left,_rgba(34,197,94,0.18),_transparent_32%)]" />
            <div className="relative">
              <div className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium tracking-[0.18em] text-sky-100">
                KIKOST
              </div>
              <h1 className="mt-6 max-w-sm text-3xl font-semibold leading-tight sm:text-4xl">
                Alur pendaftaran telah diperbarui
              </h1>
              <p className="mt-4 max-w-md text-sm leading-7 text-slate-200">
                Sistem pendaftaran KIKOST kini menggunakan verifikasi nomor HP
                via SMS. Tautan verifikasi email sudah tidak digunakan.
              </p>
            </div>
          </section>

          <section className="flex items-center px-6 py-8 sm:px-8 sm:py-10">
            <div className="w-full">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                <ShieldAlert className="h-8 w-8" />
              </div>

              <h2 className="mt-6 text-2xl font-semibold text-slate-900">
                Tautan Tidak Berlaku
              </h2>

              <p className="mt-3 text-sm leading-7 text-slate-600">
                Tautan verifikasi email ini sudah tidak didukung. Silakan daftar
                ulang menggunakan metode baru yang lebih cepat — verifikasi
                nomor HP via SMS.
              </p>

              <div className="mt-8 space-y-3">
                <Link
                  href="/auth?mode=register"
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 text-sm font-semibold text-white transition hover:bg-sky-700"
                >
                  Daftar Akun Baru
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <Link
                  href="/auth"
                  className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Kembali ke Halaman Masuk
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
