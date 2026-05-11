"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import {
  completeTenantPhoneRegistration,
  requestTenantRegistrationOtp,
  resolveRoleRoute,
  syncFirebaseUser,
  verifyTenantRegistrationOtp,
} from "@/lib/auth";
import {
  OTP_CODE_LENGTH,
  PHONE_INPUT_MAX_LENGTH,
  getEmailValidationMessage,
  getPhoneValidationMessage,
  normalizePhoneNumber,
  sanitizeEmailInput,
  sanitizeOtpInput,
  sanitizePhoneInput,
} from "@/lib/form-validation";
import {
  getFirebaseAuthErrorMessage,
  registerWithFirebaseEmail,
  resendFirebaseVerificationEmail,
} from "@/lib/firebase-email-auth";
import { useAuth } from "@/context/AuthContext";
import type { AuthResult } from "@/lib/auth";

type RegistrationMethod = "email" | "phone";

const fieldClass =
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 transition focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:bg-slate-50 disabled:text-slate-500";

const otpFieldClass = `${fieldClass} text-center tracking-[0.35em]`;

const getBackendErrorMessage = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return "Tidak bisa terhubung ke layanan KIKOST. Pastikan sistem aktif.";
    }

    const payload = error.response?.data as
      | { message?: string; errors?: string[] }
      | undefined;

    const rawMessage = payload?.errors?.[0] ?? payload?.message;
    const normalizedMessage = rawMessage?.toLowerCase() ?? "";
    if (
      normalizedMessage.includes("wrongpass") ||
      normalizedMessage.includes("redis://") ||
      normalizedMessage.includes("invalid username-password")
    ) {
      return "Layanan pendaftaran sedang bermasalah. Silakan coba lagi nanti.";
    }

    return rawMessage ?? "Pendaftaran gagal. Silakan coba lagi.";
  }

  if (error instanceof Error) return error.message;
  return "Terjadi kesalahan saat pendaftaran.";
};

const formatPhoneForInput = (value: string) => {
  if (value.startsWith("+62")) {
    return `0${value.slice(3)}`;
  }
  return value.replace(/^\+/, "");
};

export default function RegisterForm() {
  const [method, setMethod] = useState<RegistrationMethod>("email");

  // --- Email (Firebase) state ---
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firebaseRegistered, setFirebaseRegistered] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [registeredPassword, setRegisteredPassword] = useState("");
  const [isResending, setIsResending] = useState(false);

  // --- Phone (OTP) state ---
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [debugCode, setDebugCode] = useState<string | null>(null);
  const [isCodeRequested, setIsCodeRequested] = useState(false);

  // --- Shared state ---
  const [serverError, setServerError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const { setSession } = useAuth();
  const isBusy = isRequesting || isVerifying || isResending;

  const completeSession = (result: AuthResult) => {
    setSession({
      user: result.user,
      accessToken: result.token,
      refreshToken: result.refreshToken,
      expiresAt: result.expiresAt,
      refreshTokenExpiresAt: result.refreshTokenExpiresAt,
    });
    router.push(resolveRoleRoute(result.user.role, searchParams.get("next")));
    router.refresh();
  };

  const resetEmailState = () => {
    setEmail("");
    setPassword("");
    setFirebaseRegistered(false);
    setRegisteredEmail("");
    setRegisteredPassword("");
    setServerError(null);
    setInfoMessage(null);
  };

  const resetPhoneState = () => {
    setPhone("");
    setCode("");
    setDebugCode(null);
    setIsCodeRequested(false);
    setServerError(null);
    setInfoMessage(null);
  };

  const handleMethodChange = (nextMethod: RegistrationMethod) => {
    if (isBusy) return;
    setMethod(nextMethod);
    resetEmailState();
    resetPhoneState();
  };

  // ─── Firebase email registration ──────────────────────────────────────────

  const handleFirebaseRegister = async () => {
    setServerError(null);
    setInfoMessage(null);

    const emailError = getEmailValidationMessage(email, {
      label: "Email",
      required: true,
    });
    if (emailError) {
      setServerError(emailError);
      return;
    }

    if (!password || password.length < 6) {
      setServerError("Kata sandi minimal 6 karakter.");
      return;
    }

    setIsRequesting(true);
    try {
      const { idToken, email: registeredTo } = await registerWithFirebaseEmail(
        sanitizeEmailInput(email),
        password
      );

      // Sync Firebase user to backend (creates unverified record)
      await syncFirebaseUser(idToken);

      setFirebaseRegistered(true);
      setRegisteredEmail(registeredTo);
      setRegisteredPassword(password);
      setPassword("");
      setInfoMessage(
        `Email verifikasi dikirim ke ${registeredTo}. Buka email dan klik link verifikasi, lalu masuk dari halaman Login.`
      );
    } catch (error) {
      // Firebase errors use getFirebaseAuthErrorMessage, backend errors use getBackendErrorMessage
      const msg =
        axios.isAxiosError(error)
          ? getBackendErrorMessage(error)
          : getFirebaseAuthErrorMessage(error);
      setServerError(msg);
    } finally {
      setIsRequesting(false);
    }
  };

  const handleResendVerification = async () => {
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

  // ─── Phone OTP registration (unchanged) ───────────────────────────────────

  const handlePhoneRequestCode = async () => {
    setServerError(null);
    setInfoMessage(null);
    setIsRequesting(true);

    try {
      const phoneError = getPhoneValidationMessage(phone, {
        label: "Nomor Telepon",
        required: true,
      });
      if (phoneError) throw new Error(phoneError);

      const normalizedPhone = normalizePhoneNumber(phone);
      const result = await requestTenantRegistrationOtp(normalizedPhone);
      setPhone(formatPhoneForInput(result.phoneNumber));
      setDebugCode(result.debugCode ?? null);
      setCode("");
      setIsCodeRequested(true);
      setInfoMessage("Kode verifikasi telah dikirim ke nomor telepon kamu.");
    } catch (error) {
      setServerError(getBackendErrorMessage(error));
    } finally {
      setIsRequesting(false);
    }
  };

  const handlePhoneVerifyCode = async () => {
    setServerError(null);
    setInfoMessage(null);

    if (!isCodeRequested) {
      setServerError("Kirim kode verifikasi terlebih dahulu.");
      return;
    }

    if (code.trim().length !== OTP_CODE_LENGTH) {
      setServerError(`Kode verifikasi harus ${OTP_CODE_LENGTH} digit.`);
      return;
    }

    setIsVerifying(true);
    try {
      const verified = await verifyTenantRegistrationOtp({
        phoneNumber: phone,
        code: code.trim(),
      });
      const result = await completeTenantPhoneRegistration({
        phoneVerificationToken: verified.phoneVerificationToken,
      });
      completeSession(result);
    } catch (error) {
      setServerError(getBackendErrorMessage(error));
    } finally {
      setIsVerifying(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Method toggle */}
      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
        {(["email", "phone"] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => handleMethodChange(item)}
            disabled={isBusy}
            className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
              method === item
                ? "bg-white text-sky-700 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {item === "email" ? "Email" : "Nomor Telepon"}
          </button>
        ))}
      </div>

      {/* ── Email tab (Firebase) ── */}
      {method === "email" && (
        <>
          {!firebaseRegistered ? (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-800">
                  Email
                </label>
                <input
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  disabled={isBusy}
                  value={email}
                  onChange={(e) => {
                    setEmail(sanitizeEmailInput(e.target.value));
                    setServerError(null);
                  }}
                  placeholder="nama@email.com"
                  className={fieldClass}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-800">
                  Kata Sandi
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  disabled={isBusy}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setServerError(null);
                  }}
                  placeholder="Minimal 6 karakter"
                  className={fieldClass}
                />
                <p className="mt-1 text-[11px] text-gray-400">
                  Kata sandi digunakan untuk login berikutnya.
                </p>
              </div>

              {serverError && (
                <p className="text-center text-sm text-red-600">{serverError}</p>
              )}

              <button
                type="button"
                onClick={handleFirebaseRegister}
                disabled={isBusy}
                className="w-full rounded-xl bg-sky-600 py-2.5 text-white transition hover:bg-sky-700 disabled:opacity-50"
              >
                {isRequesting ? "Mendaftarkan..." : "Daftar"}
              </button>
            </>
          ) : (
            <>
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
                  onClick={handleResendVerification}
                  disabled={isBusy}
                  className="text-sm font-medium text-sky-700 hover:text-sky-800 disabled:opacity-50"
                >
                  {isResending ? "Mengirim ulang..." : "Kirim ulang email verifikasi"}
                </button>
                <button
                  type="button"
                  onClick={resetEmailState}
                  disabled={isBusy}
                  className="text-sm text-slate-500 hover:text-slate-700 disabled:opacity-50"
                >
                  Daftar dengan email lain
                </button>
              </div>
            </>
          )}
        </>
      )}

      {/* ── Phone tab (OTP, unchanged) ── */}
      {method === "phone" && (
        <>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-800">
              Nomor Telepon
            </label>
            <input
              type="tel"
              autoComplete="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={PHONE_INPUT_MAX_LENGTH}
              disabled={isCodeRequested || isBusy}
              value={phone}
              onChange={(e) => {
                setPhone(sanitizePhoneInput(e.target.value));
                setServerError(null);
                setInfoMessage(null);
              }}
              placeholder="Contoh: 081234567890"
              className={fieldClass}
            />
          </div>

          {isCodeRequested && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-800">
                Kode Verifikasi
              </label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={OTP_CODE_LENGTH}
                disabled={isBusy}
                value={code}
                onChange={(e) => {
                  setCode(sanitizeOtpInput(e.target.value));
                  setServerError(null);
                }}
                placeholder="000000"
                className={otpFieldClass}
              />
              {debugCode && (
                <p className="mt-1 text-[11px] text-amber-600">
                  Mode dev: kode verifikasi {debugCode}
                </p>
              )}
            </div>
          )}

          {serverError && (
            <p className="text-center text-sm text-red-600">{serverError}</p>
          )}

          {infoMessage && (
            <p className="text-center text-sm text-sky-700">{infoMessage}</p>
          )}

          <div className="space-y-2">
            {!isCodeRequested ? (
              <button
                type="button"
                onClick={handlePhoneRequestCode}
                disabled={isBusy}
                className="w-full rounded-xl bg-sky-600 py-2.5 text-white transition hover:bg-sky-700 disabled:opacity-50"
              >
                {isRequesting ? "Mengirim..." : "Kirim Kode Verifikasi"}
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePhoneVerifyCode}
                disabled={isBusy}
                className="w-full rounded-xl bg-sky-600 py-2.5 text-white transition hover:bg-sky-700 disabled:opacity-50"
              >
                {isVerifying ? "Memverifikasi..." : "Verifikasi & Daftar"}
              </button>
            )}

            {isCodeRequested && (
              <div className="flex items-center justify-center gap-3 text-xs">
                <button
                  type="button"
                  onClick={handlePhoneRequestCode}
                  disabled={isBusy}
                  className="font-medium text-sky-700 hover:text-sky-800 disabled:opacity-50"
                >
                  Kirim ulang kode
                </button>
                <button
                  type="button"
                  onClick={resetPhoneState}
                  disabled={isBusy}
                  className="font-medium text-slate-500 hover:text-slate-700 disabled:opacity-50"
                >
                  Ubah nomor telepon
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
