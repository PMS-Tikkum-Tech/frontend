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

const fieldClass = "w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 transition focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:bg-slate-50 disabled:text-slate-500";

const getBackendErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    if (!error.response) return "Tidak bisa terhubung ke layanan. Pastikan sistem aktif.";
    const payload = error.response.data as { message?: string; errors?: string[] };
    return payload.errors?.[0] ?? payload.message ?? "Terjadi kesalahan. Silakan coba lagi.";
  }
  return "Terjadi kesalahan. Silakan coba lagi.";
};

type Step = "email" | "otp" | "profile";

export default function RegisterForm() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [verificationToken, setVerificationToken] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setSession } = useAuth();

  const handleRequestCode = async () => {
    setServerError(null);
    const sanitized = sanitizeEmailInput(email);
    const emailError = getEmailValidationMessage(sanitized, { label: "Email", required: true });
    if (emailError) {
      setServerError(emailError);
      return;
    }
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
    const normalizedCode = code.replace(/\D/g, "");
    if (normalizedCode.length !== 6) {
      setServerError("Kode verifikasi harus 6 digit angka.");
      return;
    }
    setIsSubmitting(true);
    setServerError(null);
    try {
      const verified = await verifyTenantRegistrationEmailCode({
        email: sanitizeEmailInput(email),
        code: normalizedCode,
      });
      setVerificationToken(verified.emailVerificationToken);
      setStep("profile");
    } catch (error) {
      setServerError(getBackendErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleComplete = async () => {
    if (fullName.trim().length < 2) {
      setServerError("Nama lengkap minimal 2 karakter.");
      return;
    }
    if (password.length < 12 || new TextEncoder().encode(password).length > 72) {
      setServerError("Kata sandi minimal 12 karakter dan maksimal 72 byte.");
      return;
    }
    if (password !== passwordConfirmation) {
      setServerError("Konfirmasi kata sandi tidak cocok.");
      return;
    }
    setIsSubmitting(true);
    setServerError(null);
    try {
      const result = await completeTenantEmailRegistration({
        emailVerificationToken: verificationToken,
        fullName,
        password,
        passwordConfirmation,
      });
      setSession({
        user: result.user,
        expiresAt: result.expiresAt,
        refreshTokenExpiresAt: result.refreshTokenExpiresAt,
      });
      router.push(resolveRoleRoute(result.user.role, searchParams.get("next")));
      router.refresh();
    } catch (error) {
      setServerError(getBackendErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = useCallback(async () => {
    setIsResending(true);
    setServerError(null);
    try {
      await requestTenantRegistrationEmailCode(sanitizeEmailInput(email));
    } catch (error) {
      setServerError(getBackendErrorMessage(error));
    } finally {
      setIsResending(false);
    }
  }, [email]);

  if (step === "profile") {
    return (
      <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void handleComplete(); }}>
        <div>
          <label htmlFor="register-full-name" className="mb-1 block text-sm font-medium">Nama lengkap</label>
          <input id="register-full-name" name="full_name" autoComplete="name" maxLength={100} value={fullName} onChange={(event) => setFullName(event.target.value)} className={fieldClass} />
        </div>
        <div>
          <label htmlFor="register-password" className="mb-1 block text-sm font-medium">Kata sandi</label>
          <input id="register-password" name="password" type="password" autoComplete="new-password" minLength={12} maxLength={72} value={password} onChange={(event) => setPassword(event.target.value)} className={fieldClass} />
          <p className="mt-1 text-xs text-slate-500">Gunakan passphrase 12 karakter atau lebih (maksimal 72 byte).</p>
        </div>
        <div>
          <label htmlFor="register-password-confirmation" className="mb-1 block text-sm font-medium">Konfirmasi kata sandi</label>
          <input id="register-password-confirmation" name="password_confirmation" type="password" autoComplete="new-password" minLength={12} maxLength={72} value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} className={fieldClass} />
        </div>
        {serverError && <p role="alert" className="text-sm text-red-600">{serverError}</p>}
        <button type="submit" disabled={isSubmitting} className="w-full rounded-xl bg-sky-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
          {isSubmitting ? "Membuat akun..." : "Buat akun"}
        </button>
      </form>
    );
  }

  if (step === "otp") {
    return (
      <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void handleVerifyCode(); }}>
        <p className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">Kode 6 digit dikirim ke <strong>{sanitizeEmailInput(email)}</strong>.</p>
        <div>
          <label htmlFor="register-email-code" className="mb-1 block text-sm font-medium">Kode verifikasi</label>
          <input id="register-email-code" name="verification_code" type="text" inputMode="numeric" maxLength={6} autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} className={`${fieldClass} text-center text-lg tracking-widest`} />
        </div>
        {serverError && <p role="alert" className="text-sm text-red-600">{serverError}</p>}
        <button type="submit" disabled={isSubmitting || isResending} className="w-full rounded-xl bg-sky-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{isSubmitting ? "Memverifikasi..." : "Verifikasi email"}</button>
        <div className="flex justify-center gap-4 text-sm">
          <button type="button" onClick={() => void handleResend()} disabled={isResending} className="text-sky-700">{isResending ? "Mengirim..." : "Kirim ulang"}</button>
          <button type="button" onClick={() => setStep("email")} className="text-slate-500">Ganti email</button>
        </div>
      </form>
    );
  }

  return (
    <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void handleRequestCode(); }}>
      <div>
        <label htmlFor="register-email" className="mb-1 block text-sm font-medium">Email</label>
        <input id="register-email" name="email" type="email" autoComplete="email" inputMode="email" maxLength={254} value={email} onChange={(event) => setEmail(sanitizeEmailInput(event.target.value))} className={fieldClass} />
        <p className="mt-1 text-xs text-slate-500">Kami akan mengirim kode verifikasi. Role akun ditentukan server.</p>
      </div>
      {serverError && <p role="alert" className="text-sm text-red-600">{serverError}</p>}
      <button type="submit" disabled={isSubmitting} className="w-full rounded-xl bg-sky-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{isSubmitting ? "Mengirim kode..." : "Lanjutkan"}</button>
    </form>
  );
}
