"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import {
  completeTenantEmailRegistration,
  completeTenantPhoneRegistration,
  requestTenantRegistrationEmailCode,
  requestTenantRegistrationOtp,
  resolveRoleRoute,
  verifyTenantRegistrationEmailCode,
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
import { useAuth } from "@/context/AuthContext";
import type { AuthResult } from "@/lib/auth";

type RegistrationMethod = "email" | "phone";

const fieldClass =
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 transition focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:bg-slate-50 disabled:text-slate-500";

const otpFieldClass = `${fieldClass} text-center tracking-[0.35em]`;

const getErrorMessage = (error: unknown) => {
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

    return (
      rawMessage ??
      "Pendaftaran gagal. Silakan coba lagi."
    );
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
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [debugCode, setDebugCode] = useState<string | null>(null);
  const [isCodeRequested, setIsCodeRequested] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const { setSession } = useAuth();
  const isBusy = isRequesting || isVerifying;

  const contactLabel = method === "email" ? "email" : "nomor telepon";
  const contactValue = method === "email" ? email : phone;

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

  const resetProgress = () => {
    setCode("");
    setDebugCode(null);
    setIsCodeRequested(false);
    setServerError(null);
    setInfoMessage(null);
  };

  const handleMethodChange = (nextMethod: RegistrationMethod) => {
    setMethod(nextMethod);
    setEmail("");
    setPhone("");
    resetProgress();
  };

  const handleContactChange = (value: string) => {
    if (method === "email") {
      setEmail(sanitizeEmailInput(value));
    } else {
      setPhone(sanitizePhoneInput(value));
    }

    resetProgress();
  };

  const validateContact = () => {
    if (method === "email") {
      const emailError = getEmailValidationMessage(email, {
        label: "Email",
        required: true,
      });
      if (emailError) throw new Error(emailError);
      return sanitizeEmailInput(email);
    }

    const phoneError = getPhoneValidationMessage(phone, {
      label: "Nomor Telepon",
      required: true,
    });
    if (phoneError) throw new Error(phoneError);
    return normalizePhoneNumber(phone);
  };

  const handleRequestCode = async () => {
    setServerError(null);
    setInfoMessage(null);
    setIsRequesting(true);

    try {
      const normalizedContact = validateContact();

      if (method === "email") {
        const result = await requestTenantRegistrationEmailCode(normalizedContact);
        setEmail(result.email);
        setDebugCode(result.debugCode ?? null);
      } else {
        const result = await requestTenantRegistrationOtp(normalizedContact);
        setPhone(formatPhoneForInput(result.phoneNumber));
        setDebugCode(result.debugCode ?? null);
      }

      setCode("");
      setIsCodeRequested(true);
      setInfoMessage(`Kode verifikasi telah dikirim ke ${contactLabel} kamu.`);
    } catch (error) {
      setServerError(getErrorMessage(error));
    } finally {
      setIsRequesting(false);
    }
  };

  const handleVerifyCode = async () => {
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
      if (method === "email") {
        const verified = await verifyTenantRegistrationEmailCode({
          email: sanitizeEmailInput(email),
          code: code.trim(),
        });
        const result = await completeTenantEmailRegistration({
          emailVerificationToken: verified.emailVerificationToken,
        });
        completeSession(result);
        return;
      }

      const verified = await verifyTenantRegistrationOtp({
        phoneNumber: phone,
        code: code.trim(),
      });
      const result = await completeTenantPhoneRegistration({
        phoneVerificationToken: verified.phoneVerificationToken,
      });
      completeSession(result);
    } catch (error) {
      setServerError(getErrorMessage(error));
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="space-y-5">
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

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-800">
          {method === "email" ? "Email" : "Nomor Telepon"}
        </label>
        <input
          type={method === "email" ? "email" : "tel"}
          autoComplete={method === "email" ? "email" : "tel"}
          inputMode={method === "email" ? "email" : "numeric"}
          pattern={method === "phone" ? "[0-9]*" : undefined}
          maxLength={method === "phone" ? PHONE_INPUT_MAX_LENGTH : undefined}
          disabled={isCodeRequested || isBusy}
          value={contactValue}
          onChange={(event) => handleContactChange(event.target.value)}
          placeholder={
            method === "email" ? "nama@email.com" : "Contoh: 081234567890"
          }
          className={fieldClass}
        />
      </div>

      {isCodeRequested ? (
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
            onChange={(event) => {
              setCode(sanitizeOtpInput(event.target.value));
              setServerError(null);
            }}
            placeholder="000000"
            className={otpFieldClass}
          />
          {debugCode ? (
            <p className="mt-1 text-[11px] text-amber-600">
              Mode dev: kode verifikasi {debugCode}
            </p>
          ) : null}
        </div>
      ) : null}

      {serverError ? (
        <p className="text-center text-sm text-red-600">{serverError}</p>
      ) : null}

      {infoMessage ? (
        <p className="text-center text-sm text-sky-700">{infoMessage}</p>
      ) : null}

      <div className="space-y-2">
        {!isCodeRequested ? (
          <button
            type="button"
            onClick={handleRequestCode}
            disabled={isBusy}
            className="w-full rounded-xl bg-sky-600 py-2.5 text-white transition hover:bg-sky-700 disabled:opacity-50"
          >
            {isRequesting ? "Mengirim..." : "Kirim Kode Verifikasi"}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleVerifyCode}
            disabled={isBusy}
            className="w-full rounded-xl bg-sky-600 py-2.5 text-white transition hover:bg-sky-700 disabled:opacity-50"
          >
            {isVerifying ? "Memverifikasi..." : "Verifikasi & Daftar"}
          </button>
        )}

        {isCodeRequested ? (
          <div className="flex items-center justify-center gap-3 text-xs">
            <button
              type="button"
              onClick={handleRequestCode}
              disabled={isBusy}
              className="font-medium text-sky-700 hover:text-sky-800 disabled:opacity-50"
            >
              Kirim ulang kode
            </button>
            <button
              type="button"
              onClick={resetProgress}
              disabled={isBusy}
              className="font-medium text-slate-500 hover:text-slate-700 disabled:opacity-50"
            >
              Ubah {contactLabel}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
