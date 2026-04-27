"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import {
  registerTenant,
  TENANT_PENDING_APPROVAL_NOTICE_STORAGE_KEY,
} from "@/lib/auth";
import {
  checkTenantEmailVerification,
  consumeTenantEmailVerifiedMarker,
  clearPendingTenantRegistration,
  clearTenantEmailVerificationSession,
  getTenantEmailVerificationErrorMessage,
  loadPendingTenantRegistration,
  resendTenantEmailVerification,
  type PendingTenantRegistration,
} from "@/lib/tenant-email-verification";

const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data as
      | { message?: string; errors?: string[] }
      | undefined;

    return payload?.errors?.[0] ?? payload?.message ?? fallback;
  }

  if (error instanceof Error) {
    return error.message || fallback;
  }

  return fallback;
};

export default function VerifyEmailForm({
  initialEmail,
}: {
  initialEmail?: string;
}) {
  const router = useRouter();
  const [pendingRegistration, setPendingRegistration] =
    useState<PendingTenantRegistration | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const hasAutoCheckedRef = useRef(false);

  useEffect(() => {
    const pending = loadPendingTenantRegistration();
    setPendingRegistration(pending);

    if (!pending && initialEmail) {
      setInfoMessage(
        "Tautan verifikasi sudah dibuka. Untuk menyelesaikan pendaftaran, gunakan sesi pendaftaran yang sama atau daftar ulang."
      );
    }
  }, [initialEmail]);

  const finalizeRegistration = useCallback(
    async (registration: PendingTenantRegistration) => {
      setIsFinalizing(true);
      setServerError(null);
      setInfoMessage(
        "Email sudah terverifikasi. Menyelesaikan pendaftaran akun..."
      );

      try {
        await registerTenant({
          full_name: registration.fullName,
          email: registration.email,
          password: registration.password,
          phone_number: registration.phoneNumber,
        });

        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(
            TENANT_PENDING_APPROVAL_NOTICE_STORAGE_KEY,
            "1"
          );
        }

        clearPendingTenantRegistration();
        await clearTenantEmailVerificationSession(
          registration.email,
          registration.password
        );
        router.push("/");
        router.refresh();
      } catch (error) {
        setServerError(
          getApiErrorMessage(
            error,
            "Email sudah terverifikasi, tetapi pendaftaran akun gagal disimpan."
          )
        );
      } finally {
        setIsFinalizing(false);
      }
    },
    [router]
  );

  const checkVerification = useCallback(
    async (registration?: PendingTenantRegistration | null) => {
      const currentRegistration = registration || pendingRegistration;

      if (!currentRegistration) {
        setServerError(
          "Data pendaftaran tidak ditemukan. Silakan isi formulir daftar kembali."
        );
        return;
      }

      setIsChecking(true);
      setServerError(null);
      setInfoMessage(null);

      try {
        const verified = await checkTenantEmailVerification(
          currentRegistration.email,
          currentRegistration.password
        );

        if (!verified) {
          setInfoMessage(
            "Email belum terverifikasi. Buka Gmail kamu, klik tautan verifikasi, lalu cek lagi."
          );
          return;
        }

        await finalizeRegistration(currentRegistration);
      } catch (error) {
        setServerError(
          getTenantEmailVerificationErrorMessage(
            error,
            "Gagal memeriksa status verifikasi email."
          )
        );
      } finally {
        setIsChecking(false);
      }
    },
    [finalizeRegistration, pendingRegistration]
  );

  useEffect(() => {
    if (!pendingRegistration || hasAutoCheckedRef.current) {
      return;
    }

    hasAutoCheckedRef.current = true;
    if (consumeTenantEmailVerifiedMarker(pendingRegistration.email)) {
      void checkVerification(pendingRegistration);
      return;
    }

    void checkVerification(pendingRegistration);
  }, [checkVerification, pendingRegistration]);

  useEffect(() => {
    if (!pendingRegistration) {
      return;
    }

    const handleVerifiedMarker = () => {
      if (consumeTenantEmailVerifiedMarker(pendingRegistration.email)) {
        void checkVerification(pendingRegistration);
        return;
      }

      void checkVerification(pendingRegistration);
    };

    const handleFocus = () => {
      handleVerifiedMarker();
    };

    const handleStorage = (event: StorageEvent) => {
      if (!event.key || !event.key.includes("tenant.email_verified")) {
        return;
      }

      handleVerifiedMarker();
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("storage", handleStorage);
    document.addEventListener("visibilitychange", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("storage", handleStorage);
      document.removeEventListener("visibilitychange", handleFocus);
    };
  }, [checkVerification, pendingRegistration]);

  const handleResend = async () => {
    if (!pendingRegistration) {
      setServerError(
        "Data pendaftaran tidak ditemukan. Silakan isi formulir daftar kembali."
      );
      return;
    }

    setIsResending(true);
    setServerError(null);
    setInfoMessage(null);

    try {
      await resendTenantEmailVerification(
        pendingRegistration.email,
        pendingRegistration.password
      );
      setInfoMessage(
        "Email verifikasi baru sudah dikirim. Cek Gmail atau folder spam."
      );
    } catch (error) {
      setServerError(
        getTenantEmailVerificationErrorMessage(
          error,
          "Gagal mengirim ulang email verifikasi."
        )
      );
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-600">
        <p className="font-medium text-slate-800">Verifikasi Gmail</p>
        <ol className="mt-3 list-decimal space-y-2 pl-5 leading-6">
          <li>Buka Gmail yang kamu pakai saat daftar.</li>
          <li>Cari email verifikasi di Kotak Masuk, Promosi, atau Spam.</li>
          <li>Klik tautan verifikasi yang ada di email tersebut.</li>
          <li>Kembali ke halaman ini, lalu tekan tombol cek status verifikasi.</li>
          <li>Setelah valid, pendaftaran akun akan diselesaikan otomatis.</li>
        </ol>
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
          Jika email verifikasi belum terlihat dalam beberapa menit, periksa folder
          Spam atau Promosi di Gmail kamu.
        </div>
      </div>

      {infoMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {infoMessage}
        </div>
      )}

      {serverError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => {
            void checkVerification();
          }}
          disabled={isChecking || isFinalizing}
          className="inline-flex h-11 items-center justify-center rounded-xl bg-sky-600 px-4 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isChecking
            ? "Memeriksa..."
            : isFinalizing
              ? "Menyelesaikan..."
              : "Cek Status Verifikasi"}
        </button>

        <button
          type="button"
          onClick={() => {
            void handleResend();
          }}
          disabled={isResending || isChecking || isFinalizing}
          className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isResending ? "Mengirim..." : "Kirim Ulang Email"}
        </button>
      </div>

      <button
        type="button"
        onClick={() => router.replace("/auth?mode=register")}
        disabled={isChecking || isResending || isFinalizing}
        className="w-full text-sm font-medium text-slate-500 transition hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Kembali ke formulir daftar
      </button>
    </div>
  );
}
