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

type RegistrationMethod = "phone" | "email";

const getErrorMessage = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return "Tidak bisa terhubung ke layanan KIKOST. Pastikan sistem aktif.";
    }

    const payload = error.response?.data as
      | { message?: string; errors?: string[] }
      | undefined;
    return (
      payload?.errors?.[0] ??
      payload?.message ??
      "Pendaftaran gagal. Silakan coba lagi."
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Terjadi kesalahan saat pendaftaran.";
};

export default function RegisterForm() {
  const [method, setMethod] = useState<RegistrationMethod>("phone");
  const [contact, setContact] = useState("");
  const [code, setCode] = useState("");
  const [debugCode, setDebugCode] = useState<string | null>(null);
  const [isCodeRequested, setIsCodeRequested] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const { setSession } = useAuth();
  const isBusy = isRequesting || isVerifying;

  const resetVerificationState = () => {
    setCode("");
    setDebugCode(null);
    setIsCodeRequested(false);
    setServerError(null);
    setInfoMessage(null);
  };

  const handleMethodChange = (nextMethod: RegistrationMethod) => {
    setMethod(nextMethod);
    setContact("");
    resetVerificationState();
  };

  const normalizedContact = () => {
    if (method === "phone") {
      return normalizePhoneNumber(contact);
    }

    return sanitizeEmailInput(contact);
  };

  const validateContact = () => {
    if (method === "phone") {
      const phoneError = getPhoneValidationMessage(contact, {
        label: "Nomor Telepon",
        required: true,
      });
      if (phoneError) {
        throw new Error(phoneError);
      }
      return normalizePhoneNumber(contact);
    }

    const emailError = getEmailValidationMessage(contact, {
      label: "Email",
      required: true,
    });
    if (emailError) {
      throw new Error(emailError);
    }
    return sanitizeEmailInput(contact);
  };

  const completeSession = (
    result: Awaited<ReturnType<typeof completeTenantPhoneRegistration>>
  ) => {
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

  const requestCode = async () => {
    setServerError(null);
    setInfoMessage(null);
    setIsRequesting(true);

    try {
      const target = validateContact();
      let nextDebugCode: string | null = null;

      if (method === "phone") {
        const result = await requestTenantRegistrationOtp(target);
        setContact(sanitizePhoneInput(result.phoneNumber));
        nextDebugCode = result.debugCode ?? null;
      } else {
        const result = await requestTenantRegistrationEmailCode(target);
        setContact(result.email);
        nextDebugCode = result.debugCode ?? null;
      }
      setDebugCode(nextDebugCode);
      setCode("");
      setIsCodeRequested(true);
      setInfoMessage(
        method === "phone"
          ? "Kode OTP telah dikirim ke WhatsApp kamu."
          : "Kode verifikasi telah dikirim ke email kamu."
      );
    } catch (error) {
      setServerError(getErrorMessage(error));
    } finally {
      setIsRequesting(false);
    }
  };

  const verifyCode = async () => {
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
      const target = normalizedContact();

      if (method === "phone") {
        const verified = await verifyTenantRegistrationOtp({
          phoneNumber: target,
          code: code.trim(),
        });
        const result = await completeTenantPhoneRegistration({
          phoneVerificationToken: verified.phoneVerificationToken,
        });
        completeSession(result);
        return;
      }

      const verified = await verifyTenantRegistrationEmailCode({
        email: target,
        code: code.trim(),
      });
      const result = await completeTenantEmailRegistration({
        emailVerificationToken: verified.emailVerificationToken,
      });
      completeSession(result);
    } catch (error) {
      setServerError(getErrorMessage(error));
    } finally {
      setIsVerifying(false);
    }
  };

  const contactLabel = method === "phone" ? "Nomor Telepon" : "Email";
  const contactPlaceholder =
    method === "phone" ? "Contoh: 081234567890" : "nama@email.com";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
        {(["phone", "email"] as const).map((item) => (
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
            {item === "phone" ? "Nomor Telepon" : "Email"}
          </button>
        ))}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">{contactLabel}</label>
        <input
          type={method === "phone" ? "tel" : "email"}
          autoComplete={method === "phone" ? "tel" : "email"}
          inputMode={method === "phone" ? "numeric" : "email"}
          pattern={method === "phone" ? "[0-9]*" : undefined}
          maxLength={method === "phone" ? PHONE_INPUT_MAX_LENGTH : undefined}
          disabled={isCodeRequested || isBusy}
          value={contact}
          onChange={(event) => {
            const nextValue =
              method === "phone"
                ? sanitizePhoneInput(event.target.value)
                : sanitizeEmailInput(event.target.value);
            setContact(nextValue);
            resetVerificationState();
          }}
          placeholder={contactPlaceholder}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:bg-slate-50 disabled:text-slate-500"
        />
        <p className="mt-1 text-[11px] text-gray-400 leading-relaxed">
          {method === "phone"
            ? "Kode OTP akan dikirim ke WhatsApp nomor ini."
            : "Kode verifikasi akan dikirim ke email ini."}
        </p>
      </div>

      {isCodeRequested ? (
        <div>
          <label className="block text-sm font-medium mb-1">
            Kode Verifikasi
          </label>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={OTP_CODE_LENGTH}
            value={code}
            onChange={(event) => setCode(sanitizeOtpInput(event.target.value))}
            placeholder="Masukkan 6 digit kode"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 tracking-[0.35em] focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
          {debugCode ? (
            <p className="mt-1 text-[11px] text-amber-600">
              Mode dev: kode verifikasi {debugCode}
            </p>
          ) : null}
        </div>
      ) : null}

      {serverError ? (
        <p className="text-sm text-red-600 text-center">{serverError}</p>
      ) : null}

      {infoMessage ? (
        <p className="text-sm text-sky-700 text-center">{infoMessage}</p>
      ) : null}

      <div className="space-y-2">
        {!isCodeRequested ? (
          <button
            type="button"
            onClick={requestCode}
            disabled={isBusy}
            className="w-full rounded-xl bg-sky-600 py-2.5 text-white transition hover:bg-sky-700 disabled:opacity-50"
          >
            {isRequesting ? "Mengirim..." : "Kirim Kode Verifikasi"}
          </button>
        ) : (
          <button
            type="button"
            onClick={verifyCode}
            disabled={isBusy}
            className="w-full rounded-xl bg-sky-600 py-2.5 text-white transition hover:bg-sky-700 disabled:opacity-50"
          >
            {isVerifying ? "Memverifikasi..." : "Verifikasi & Masuk"}
          </button>
        )}

        {isCodeRequested ? (
          <div className="flex items-center justify-center gap-3 text-xs">
            <button
              type="button"
              onClick={requestCode}
              disabled={isBusy}
              className="font-medium text-sky-700 hover:text-sky-800 disabled:opacity-50"
            >
              Kirim ulang kode
            </button>
            <button
              type="button"
              onClick={resetVerificationState}
              disabled={isBusy}
              className="font-medium text-slate-500 hover:text-slate-700 disabled:opacity-50"
            >
              Ubah {contactLabel.toLowerCase()}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
