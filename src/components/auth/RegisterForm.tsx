"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { resolveRoleRoute, syncFirebaseUser } from "@/lib/auth";
import { getEmailValidationMessage, sanitizeEmailInput } from "@/lib/form-validation";
import {
  getFirebaseAuthErrorMessage,
  registerWithFirebaseEmail,
  resendFirebaseVerificationEmail,
} from "@/lib/firebase-email-auth";
import { useAuth } from "@/context/AuthContext";

const fieldClass =
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 transition focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:bg-slate-50 disabled:text-slate-500";

const getBackendErrorMessage = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return "Tidak bisa terhubung ke layanan KIKOST. Pastikan sistem aktif.";
    }
    const payload = error.response?.data as
      | { message?: string; errors?: string[] }
      | undefined;
    const rawMessage = payload?.errors?.[0] ?? payload?.message;
    return rawMessage ?? "Pendaftaran gagal. Silakan coba lagi.";
  }
  if (error instanceof Error) return error.message;
  return "Terjadi kesalahan saat pendaftaran.";
};

export default function RegisterForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegistered, setIsRegistered] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [registeredPassword, setRegisteredPassword] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const { setSession } = useAuth();
  const isBusy = isSubmitting || isResending;

  const handleRegister = async () => {
    setServerError(null);
    setInfoMessage(null);

    const emailError = getEmailValidationMessage(email, { label: "Email", required: true });
    if (emailError) { setServerError(emailError); return; }
    if (!password || password.length < 6) {
      setServerError("Kata sandi minimal 6 karakter.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { idToken, email: registeredTo } = await registerWithFirebaseEmail(
        sanitizeEmailInput(email),
        password
      );

      await syncFirebaseUser(idToken);

      setIsRegistered(true);
      setRegisteredEmail(registeredTo);
      setRegisteredPassword(password);
      setPassword("");
      setInfoMessage(
        `Email verifikasi dikirim ke ${registeredTo}. Buka email dan klik link verifikasi, lalu masuk dari halaman Login.`
      );
    } catch (error) {
      const msg = axios.isAxiosError(error)
        ? getBackendErrorMessage(error)
        : getFirebaseAuthErrorMessage(error);
      setServerError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    setServerError(null);
    setInfoMessage(null);
    setIsResending(true);
    try {
      await resendFirebaseVerificationEmail(registeredEmail, registeredPassword);
      setInfoMessage(`Email verifikasi dikirim ulang ke ${registeredEmail}.`);
    } catch (error) {
      setServerError(getFirebaseAuthErrorMessage(error));
    } finally {
      setIsResending(false);
    }
  };

  const handleReset = () => {
    setIsRegistered(false);
    setEmail("");
    setPassword("");
    setRegisteredEmail("");
    setRegisteredPassword("");
    setServerError(null);
    setInfoMessage(null);
  };

  if (isRegistered) {
    return (
      <div className="space-y-4">
        {infoMessage && (
          <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
            {infoMessage}
          </div>
        )}
        {serverError && (
          <p className="text-center text-sm text-red-600">{serverError}</p>
        )}
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={handleResend}
            disabled={isBusy}
            className="text-sm font-medium text-sky-700 hover:text-sky-800 disabled:opacity-50"
          >
            {isResending ? "Mengirim ulang..." : "Kirim ulang email verifikasi"}
          </button>
          <button
            type="button"
            onClick={handleReset}
            disabled={isBusy}
            className="text-sm text-slate-500 hover:text-slate-700 disabled:opacity-50"
          >
            Daftar dengan email lain
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-800">Email</label>
        <input
          type="email"
          autoComplete="email"
          inputMode="email"
          disabled={isBusy}
          value={email}
          onChange={(e) => { setEmail(sanitizeEmailInput(e.target.value)); setServerError(null); }}
          placeholder="nama@email.com"
          className={fieldClass}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-800">Kata Sandi</label>
        <input
          type="password"
          autoComplete="new-password"
          disabled={isBusy}
          value={password}
          onChange={(e) => { setPassword(e.target.value); setServerError(null); }}
          placeholder="Minimal 6 karakter"
          className={fieldClass}
        />
        <p className="mt-1 text-[11px] text-gray-400">Digunakan untuk login berikutnya.</p>
      </div>

      {serverError && (
        <p className="text-center text-sm text-red-600">{serverError}</p>
      )}

      <button
        type="button"
        onClick={handleRegister}
        disabled={isBusy}
        className="w-full rounded-xl bg-sky-600 py-2.5 text-white transition hover:bg-sky-700 disabled:opacity-50"
      >
        {isSubmitting ? "Mendaftarkan..." : "Daftar"}
      </button>
    </div>
  );
}
