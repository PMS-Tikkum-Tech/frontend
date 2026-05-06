"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import LoginForm from "@/components/auth/LoginForm";
import RegisterForm from "@/components/auth/RegisterForm";
import VerifyEmailForm from "@/components/auth/VerifyEmailForm";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

type AuthMode = "login" | "register" | "verify";

const resolveMode = (mode: string | null): AuthMode => {
  if (mode === "register") {
    return "register";
  }

  if (mode === "verify") {
    return "verify";
  }

  return "login";
};

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-screen items-center justify-center bg-white text-sm text-slate-500">
          Memuat halaman autentikasi...
        </div>
      }
    >
      <AuthPageContent />
    </Suspense>
  );
}

function AuthPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<AuthMode>("login");

  const currentMode = useMemo(
    () => resolveMode(searchParams.get("mode")),
    [searchParams]
  );

  useEffect(() => {
    setMode(currentMode);
  }, [currentMode]);

  const setModeWithQuery = (nextMode: AuthMode) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("mode", nextMode);

    if (nextMode !== "login" && nextMode !== "verify") {
      nextParams.delete("otp_requested");
      nextParams.delete("phone");
      nextParams.delete("verification_email_sent");
    }

    if (nextMode === "register") {
      nextParams.delete("registered");
      nextParams.delete("debug_code");
      nextParams.delete("phone");
      nextParams.delete("verification_email_sent");
    }

    const query = nextParams.toString();
    router.replace(query ? `/auth?${query}` : "/auth");
    setMode(nextMode);
  };

  const registered = searchParams.get("registered") === "1";
  const verificationEmailSent =
    searchParams.get("verification_email_sent") === "1";
  const authEmail = searchParams.get("email");
  const title =
    mode === "register"
      ? "Buat Akun KIKOST"
      : mode === "verify"
        ? "Verifikasi Email"
        : "Masuk ke Akun Anda";

  const description =
    mode === "register"
      ? "Daftar cukup dengan email atau nomor HP."
      : mode === "verify"
        ? "Metode pendaftaran telah diperbarui. Silakan gunakan formulir pendaftaran baru."
        : "Gunakan email dan kata sandi untuk melanjutkan.";

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-100 via-sky-100 to-blue-100">
      <div className="pointer-events-none absolute -left-28 top-8 h-72 w-72 rounded-full bg-sky-400/40 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-28 h-96 w-96 rounded-full bg-blue-300/35 blur-3xl" />

      <div className="relative mx-auto grid min-h-screen max-w-6xl items-center gap-8 px-6 py-8 md:grid-cols-[1.1fr_0.9fr] md:py-14">
        <section className="text-slate-900">
          <Link
            href="/"
            className="inline-flex items-center rounded-full border border-sky-200 bg-white/90 px-4 py-2 text-xs font-medium text-sky-700 transition hover:border-sky-300 hover:bg-sky-50"
          >
            Kembali ke Beranda
          </Link>

          <h1 className="mt-6 max-w-xl text-3xl font-semibold leading-tight md:text-5xl">
            Selamat datang di KIKOST
          </h1>

          <p className="mt-4 max-w-lg text-sm text-slate-600 md:text-base">
            Masuk atau daftar untuk mulai menggunakan layanan KIKOST.
          </p>
        </section>

        <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-2xl shadow-sky-200/60 backdrop-blur md:p-7">
          <div className="mb-6">
            <div className="mb-4 inline-flex rounded-full border border-slate-200 p-1">
              <button
                type="button"
                onClick={() => setModeWithQuery("login")}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  mode === "login"
                    ? "bg-sky-600 text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Masuk
              </button>
              <button
                type="button"
                onClick={() => setModeWithQuery("register")}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  mode === "register"
                    ? "bg-sky-600 text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Daftar
              </button>
            </div>

            <h2 className="text-2xl font-semibold text-slate-900">{title}</h2>
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          </div>

          {verificationEmailSent && (
            <div className="mb-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
              Email verifikasi sudah dikirim. Buka email kamu untuk melanjutkan
              proses pendaftaran.
              {authEmail && (
                <p className="mt-1 text-xs text-sky-700">
                  Email terdaftar: {authEmail}
                </p>
              )}
            </div>
          )}

          {registered && (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Pendaftaran berhasil. Silakan masuk.
            </div>
          )}

          <Suspense
            fallback={
              <div className="rounded-xl border border-slate-200 p-4 text-sm text-slate-500">
                Memuat formulir autentikasi...
              </div>
            }
          >
            <AnimatePresence mode="wait">
              {mode === "login" && (
                <motion.div
                  key="login"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -14 }}
                  transition={{ duration: 0.25 }}
                >
                  <LoginForm />
                </motion.div>
              )}

              {mode === "register" && (
                <motion.div
                  key="register"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -14 }}
                  transition={{ duration: 0.25 }}
                >
                  <RegisterForm />
                </motion.div>
              )}

              {mode === "verify" && (
                <motion.div
                  key="verify"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -14 }}
                  transition={{ duration: 0.25 }}
                >
                  <VerifyEmailForm initialEmail={authEmail ?? undefined} />
                </motion.div>
              )}
            </AnimatePresence>
          </Suspense>
        </section>
      </div>
    </div>
  );
}
