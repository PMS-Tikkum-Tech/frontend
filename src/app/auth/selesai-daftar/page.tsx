"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Loader, XCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { syncFirebaseUser, type AuthResult } from "@/lib/auth";
import {
  completeEmailSignInLink,
  isEmailSignInLink,
} from "@/lib/firebase-email-auth";

function SelesaiDaftarContent() {
  const router = useRouter();
  const { setSession } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleComplete = useCallback(async () => {
    const href = window.location.href;

    if (!isEmailSignInLink(href)) {
      setStatus("error");
      setErrorMessage(
        "Tautan tidak valid atau sudah kadaluarsa. Silakan daftar ulang."
      );
      return;
    }

    try {
      const { idToken } = await completeEmailSignInLink(href);
      const syncResult = await syncFirebaseUser(idToken);

      if ("requiresVerification" in syncResult) {
        setStatus("error");
        setErrorMessage(
          "Email belum terverifikasi di sistem. Coba masuk ulang."
        );
        return;
      }

      const authResult = syncResult as AuthResult;
      setSession({
        user: authResult.user,
        accessToken: authResult.token,
        refreshToken: authResult.refreshToken,
        expiresAt: authResult.expiresAt,
        refreshTokenExpiresAt: authResult.refreshTokenExpiresAt,
      });

      setStatus("success");
      setTimeout(() => router.replace("/"), 1500);
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Gagal menyelesaikan verifikasi. Silakan coba lagi."
      );
    }
  }, [router, setSession]);

  useEffect(() => {
    void handleComplete();
  }, [handleComplete]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-100 via-sky-100 to-blue-100">
      <div className="pointer-events-none absolute -left-28 top-8 h-72 w-72 rounded-full bg-sky-400/40 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-28 h-96 w-96 rounded-full bg-blue-300/35 blur-3xl" />

      <div className="relative flex min-h-screen items-center justify-center px-6 py-12">
        <div className="w-full max-w-md rounded-3xl border border-slate-200/80 bg-white p-8 text-center shadow-2xl shadow-sky-200/60">
          {status === "loading" && (
            <>
              <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-sky-100">
                <Loader size={24} className="animate-spin text-sky-600" />
              </div>
              <h1 className="text-xl font-semibold text-slate-900">
                Memverifikasi email Anda...
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Mohon tunggu sebentar.
              </p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 size={26} className="text-emerald-600" />
              </div>
              <h1 className="text-xl font-semibold text-slate-900">
                Pendaftaran berhasil!
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Mengalihkan ke halaman utama...
              </p>
            </>
          )}

          {status === "error" && (
            <>
              <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
                <XCircle size={26} className="text-red-600" />
              </div>
              <h1 className="text-xl font-semibold text-slate-900">
                Verifikasi gagal
              </h1>
              <p className="mt-2 text-sm text-slate-600">{errorMessage}</p>
              <div className="mt-6 flex flex-col gap-2">
                <Link
                  href="/auth?mode=register"
                  className="rounded-xl bg-sky-600 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700"
                >
                  Daftar ulang
                </Link>
                <Link
                  href="/auth"
                  className="rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  Kembali ke halaman masuk
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SelesaiDaftarPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">
          Memuat...
        </div>
      }
    >
      <SelesaiDaftarContent />
    </Suspense>
  );
}
