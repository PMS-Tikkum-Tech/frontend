"use client";

import { useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import {
  completeTenantEmailRegistration,
  requestTenantRegistrationEmailCode,
  resolveRoleRoute,
  verifyTenantRegistrationEmailCode,
} from "@/lib/auth";
import { getEmailValidationMessage, sanitizeEmailInput } from "@/lib/form-validation";
import { useAuth } from "@/context/AuthContext";

const fieldClass =
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 transition focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:bg-slate-50 disabled:text-slate-500";

const getBackendErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    if (!error.response)
      return "Tidak bisa terhubung ke layanan. Pastikan sistem aktif.";
    const payload = error.response?.data as
      | { message?: string; errors?: string[] }
      | undefined;
    return (
      payload?.errors?.[0] ?? payload?.message ?? "Terjadi kesalahan. Silakan coba lagi."
    );
  }
  if (error instanceof Error) return error.message;
  return "Terjadi kesalahan. Silakan coba lagi.";
};

type Step = "email" | "otp";

export default function RegisterForm() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const { setSession } = useAuth();

  const handleRequestCode = async () => {
    setServerError(null);
    const sanitized = sanitizeEmailInput(email);
    const emailError = getEmailValidationMessage(sanitized, {
      label: "Email",
      required: true,
    });
    if (emailError) { setServerError(emailError); return; }

    setIsSubmitting(true);
    try {
      await requestTenantRegistrationEmailCode(sanitized);
      setStep("otp");
    } catch (error) {
      setServerError(getBackendErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyCode = async () => {
    setServerError(null);
    const trimmedCode = code.replace(/\D/g, "");
    if (trimmedCode.length !== 6) {
      setServerError("Kode verifikasi harus 6 digit angka.");
      return;
    }

    setIsSubmitting(true);
    try {
      const verified = await verifyTenantRegistrationEmailCode({
        email: sanitizeEmailInput(email),
        code: trimmedCode,
      });

      const authResult = await completeTenantEmailRegistration({
        emailVerificationToken: verified.emailVerificationToken,
      });

      setSession({
        user: authResult.user,
        expiresAt: authResult.expiresAt,
        refreshTokenExpiresAt: authResult.refreshTokenExpiresAt,
      });

      router.push(
        resolveRoleRoute(authResult.user.role, searchParams.get("next"))
      );
      router.refresh();
    } catch (error) {
      setServerError(getBackendErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = useCallback(async () => {
    setServerError(null);
    setIsResending(true);
    try {
      await requestTenantRegistrationEmailCode(sanitizeEmailInput(email));
    } catch (error) {
      setServerError(getBackendErrorMessage(error));
    } finally {
      setIsResending(false);
    }
  }, [email]);

  // ── OTP step ─────────────────────────────────────────────────────────────
  if (step === "otp") {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          <p className="font-medium">Cek email Anda</p>
          <p className="mt-1 text-xs">
            Kode 6 digit dikirim ke <strong>{sanitizeEmailInput(email)}</strong>.
            Berlaku 5 menit.
          </p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-800">
            Kode Verifikasi
          </label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            autoComplete="one-time-code"
            disabled={isSubmitting}
            value={code}
            onChange={(e) => {
              setCode(e.target.value.replace(/\D/g, ""));
              setServerError(null);
            }}
            onKeyDown={(e) => { if (e.key === "Enter") void handleVerifyCode(); }}
            placeholder="123456"
            className={`${fieldClass} text-center text-lg tracking-widest`}
          />
        </div>

        {serverError && (
          <p className="text-center text-sm text-red-600">{serverError}</p>
        )}

        <button
          type="button"
          onClick={handleVerifyCode}
          disabled={isSubmitting || isResending}
          className="w-full rounded-xl bg-sky-600 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-50"
        >
          {isSubmitting ? "Memverifikasi..." : "Verifikasi & Masuk"}
        </button>

        <div className="flex flex-col items-center gap-1.5">
          <button
            type="button"
            onClick={handleResend}
            disabled={isResending || isSubmitting}
            className="text-sm font-medium text-sky-700 hover:text-sky-800 disabled:opacity-50"
          >
            {isResending ? "Mengirim ulang..." : "Kirim ulang kode"}
          </button>
          <button
            type="button"
            onClick={() => { setStep("email"); setCode(""); setServerError(null); }}
            disabled={isSubmitting || isResending}
            className="text-sm text-slate-500 hover:text-slate-700 disabled:opacity-50"
          >
            Ganti email
          </button>
        </div>
      </div>
    );
  }

  // ── Email step ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-800">
          Email
        </label>
        <input
          type="email"
          autoComplete="email"
          inputMode="email"
          disabled={isSubmitting}
          value={email}
          onChange={(e) => {
            setEmail(sanitizeEmailInput(e.target.value));
            setServerError(null);
          }}
          onKeyDown={(e) => { if (e.key === "Enter") void handleRequestCode(); }}
          placeholder="nama@email.com"
          className={fieldClass}
        />
        <p className="mt-1 text-[11px] text-gray-400">
          Kode verifikasi 6 digit akan dikirim ke email ini.
        </p>
      </div>

      {serverError && (
        <p className="text-center text-sm text-red-600">{serverError}</p>
      )}

      <button
        type="button"
        onClick={handleRequestCode}
        disabled={isSubmitting}
        className="w-full rounded-xl bg-sky-600 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-50"
      >
        {isSubmitting ? "Mengirim kode..." : "Daftar"}
      </button>
    </div>
  );
}
