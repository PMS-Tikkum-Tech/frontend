"use client";

import axios from "axios";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  LoaderCircle,
  MailCheck,
  ShieldAlert,
} from "lucide-react";
import {
  registerTenant,
  TENANT_PENDING_APPROVAL_NOTICE_STORAGE_KEY,
} from "@/lib/auth";
import {
  checkTenantEmailVerification,
  clearPendingTenantRegistration,
  clearTenantEmailVerificationSession,
  completeTenantEmailAction,
  getTenantEmailVerificationErrorMessage,
  loadPendingTenantRegistration,
} from "@/lib/tenant-email-verification";

type VerificationStatus = "processing" | "success" | "error";

const isRegistrationAlreadyCompleted = (error: unknown) => {
  if (!axios.isAxiosError(error)) {
    return false;
  }

  const payload = error.response?.data as
    | { message?: string; errors?: string[] }
    | undefined;
  const messages = [payload?.message, ...(payload?.errors || [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return messages.includes("email sudah terdaftar");
};

export default function EmailVerificationRedirectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");
  const oobCode = searchParams.get("oobCode");
  const emailParam = searchParams.get("email")?.trim().toLowerCase() || "";
  const continueUrl = searchParams.get("continueUrl");
  const [status, setStatus] = useState<VerificationStatus>("processing");
  const [message, setMessage] = useState(
    "Memproses verifikasi email kamu. Mohon tunggu sebentar."
  );

  useEffect(() => {
    let active = true;
    let redirectTimer: number | null = null;

    const getContinueUrlEmail = () => {
      if (!continueUrl) {
        return "";
      }

      try {
        const parsed = new URL(continueUrl, window.location.origin);
        return parsed.searchParams.get("email")?.trim().toLowerCase() || "";
      } catch {
        return "";
      }
    };

    const finalizeRegistration = async (verifiedEmail?: string) => {
      const pendingRegistration = loadPendingTenantRegistration();

      if (!pendingRegistration) {
        throw new Error(
          "Data pendaftaran tidak ditemukan. Silakan ulangi pendaftaran dari awal."
        );
      }

      if (
        verifiedEmail &&
        pendingRegistration.email.trim().toLowerCase() !== verifiedEmail
      ) {
        throw new Error(
          "Email verifikasi tidak sesuai dengan data pendaftaran yang sedang diproses."
        );
      }

      setMessage("Email berhasil diverifikasi. Menyelesaikan pendaftaran akun...");

      try {
        await registerTenant({
          full_name: pendingRegistration.fullName,
          email: pendingRegistration.email,
          password: pendingRegistration.password,
          phone_number: pendingRegistration.phoneNumber,
        });
      } catch (error) {
        if (!isRegistrationAlreadyCompleted(error)) {
          throw error;
        }
      }

      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(
          TENANT_PENDING_APPROVAL_NOTICE_STORAGE_KEY,
          "1"
        );
      }

      clearPendingTenantRegistration();
      await clearTenantEmailVerificationSession(
        pendingRegistration.email,
        pendingRegistration.password
      );

      if (!active) {
        return;
      }

      setStatus("success");
      setMessage("Email berhasil diverifikasi. Kamu akan diarahkan ke beranda.");
      redirectTimer = window.setTimeout(() => {
        router.replace("/");
        router.refresh();
      }, 1200);
    };

    const runVerification = async () => {
      if (mode && mode !== "verifyEmail") {
        if (!active) {
          return;
        }

        setStatus("error");
        setMessage("Tautan verifikasi ini tidak dikenali oleh sistem.");
        return;
      }

      try {
        if (oobCode) {
          const email = await completeTenantEmailAction(oobCode);

          if (!active) {
            return;
          }

          await finalizeRegistration(email || getContinueUrlEmail() || emailParam);
          return;
        }

        const pendingRegistration = loadPendingTenantRegistration();
        const fallbackEmail =
          emailParam ||
          getContinueUrlEmail() ||
          pendingRegistration?.email?.trim().toLowerCase() ||
          "";

        if (pendingRegistration) {
          const isVerified = await checkTenantEmailVerification(
            pendingRegistration.email,
            pendingRegistration.password
          );

          if (!active) {
            return;
          }

          if (isVerified) {
            await finalizeRegistration(fallbackEmail || pendingRegistration.email);
            return;
          }
        }

        if (!active) {
          return;
        }

        setStatus("error");
        setMessage(
          "Verifikasi email belum dapat dipastikan dari tautan ini. Buka kembali email verifikasi terbaru dari Gmail kamu."
        );
      } catch (error) {
        if (!active) {
          return;
        }

        setStatus("error");
        setMessage(
          getTenantEmailVerificationErrorMessage(
            error,
            "Verifikasi email gagal diproses. Silakan minta tautan verifikasi baru."
          )
        );
      }
    };

    void runVerification();

    return () => {
      active = false;
      if (redirectTimer) {
        window.clearTimeout(redirectTimer);
      }
    };
  }, [continueUrl, emailParam, mode, oobCode, router]);

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
                Verifikasi akun yang lebih rapi dan langsung ke KIKOST
              </h1>

              <p className="mt-4 max-w-md text-sm leading-7 text-slate-200">
                Setelah link verifikasi di Gmail dibuka, halaman ini menangani
                status verifikasi dan mengarahkan kamu kembali ke alur pendaftaran
                yang benar.
              </p>

              <div className="mt-10 grid gap-3 text-sm text-slate-200">
                <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <MailCheck className="mt-0.5 h-5 w-5 text-sky-300" />
                  <p>Gunakan tautan verifikasi yang dikirim ke Gmail saat daftar.</p>
                </div>
                <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <BadgeCheck className="mt-0.5 h-5 w-5 text-emerald-300" />
                  <p>Kalau verifikasi berhasil, proses pendaftaran akan dilanjutkan ke KIKOST.</p>
                </div>
                <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <ShieldAlert className="mt-0.5 h-5 w-5 text-amber-300" />
                  <p>Kalau email verifikasi belum terlihat, periksa folder Spam atau Promosi di Gmail.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="flex items-center px-6 py-8 sm:px-8 sm:py-10">
            <div className="w-full">
              <div
                className={`inline-flex h-16 w-16 items-center justify-center rounded-2xl ${
                  status === "success"
                    ? "bg-emerald-50 text-emerald-600"
                    : status === "error"
                      ? "bg-red-50 text-red-600"
                      : "bg-sky-50 text-sky-600"
                }`}
              >
                {status === "success" ? (
                  <BadgeCheck className="h-8 w-8" />
                ) : status === "error" ? (
                  <ShieldAlert className="h-8 w-8" />
                ) : (
                  <LoaderCircle className="h-8 w-8 animate-spin" />
                )}
              </div>

              <h2 className="mt-6 text-2xl font-semibold text-slate-900">
                {status === "success"
                  ? "Verifikasi Berhasil"
                  : status === "error"
                    ? "Verifikasi Belum Berhasil"
                    : "Memverifikasi Email"}
              </h2>

              <p className="mt-3 text-sm leading-7 text-slate-600">{message}</p>

              {status === "success" ? (
                <div className="mt-8 space-y-3">
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-700">
                    Berhasil diverifikasi. Sistem akan mengarahkan kamu ke beranda
                    secara otomatis.
                  </div>

                  <Link
                    href="/"
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 text-sm font-semibold text-white transition hover:bg-sky-700"
                  >
                    Ke Beranda Sekarang
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              ) : status === "error" ? (
                <div className="mt-8 space-y-3">
                  <Link
                    href="/auth?mode=verify"
                    className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Buka Halaman Verifikasi
                  </Link>

                  <Link
                    href="/auth?mode=register"
                    className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Kembali ke Daftar
                  </Link>
                </div>
              ) : (
                <div className="mt-8 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm leading-6 text-sky-700">
                  Halaman ini sedang memproses tautan verifikasi dari Gmail. Jangan
                  tutup halaman sampai status verifikasi selesai ditampilkan.
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
