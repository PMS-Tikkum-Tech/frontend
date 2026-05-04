"use client";

import { useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import axios from "axios";
import {
  type ConfirmationResult,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "firebase/auth";
import {
  completeTenantEmailRegistration,
  registerTenant,
  requestTenantRegistrationEmailCode,
  resolveRoleRoute,
  verifyTenantRegistrationEmailCode,
} from "@/lib/auth";
import { getPhoneFirebaseAuth } from "@/lib/firebase-phone-auth";
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

type RegistrationMethod = "phone" | "email";
type PhoneStep = "form" | "otp";

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
  if (error instanceof Error) return error.message;
  return "Terjadi kesalahan saat pendaftaran.";
};

export default function RegisterForm() {
  const [method, setMethod] = useState<RegistrationMethod>("phone");
  const [serverError, setServerError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Phone method state
  const [fullName, setFullName] = useState("");
  const [phoneEmail, setPhoneEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState("");
  const [phoneStep, setPhoneStep] = useState<PhoneStep>("form");
  const [otpCode, setOtpCode] = useState("");
  const [confirmationResult, setConfirmationResult] =
    useState<ConfirmationResult | null>(null);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  // Email method state
  const [emailContact, setEmailContact] = useState("");
  const [code, setCode] = useState("");
  const [debugCode, setDebugCode] = useState<string | null>(null);
  const [isCodeRequested, setIsCodeRequested] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const { setSession } = useAuth();

  const isBusy = isSendingOtp || isRegistering || isRequesting || isVerifying;

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

  const clearRecaptcha = () => {
    if (recaptchaVerifierRef.current) {
      try {
        recaptchaVerifierRef.current.clear();
      } catch {
        // ignore
      }
      recaptchaVerifierRef.current = null;
    }
  };

  const handleMethodChange = (nextMethod: RegistrationMethod) => {
    setMethod(nextMethod);
    clearRecaptcha();
    setFullName("");
    setPhoneEmail("");
    setPassword("");
    setPhone("");
    setPhoneStep("form");
    setOtpCode("");
    setConfirmationResult(null);
    setEmailContact("");
    setCode("");
    setDebugCode(null);
    setIsCodeRequested(false);
    setServerError(null);
    setInfoMessage(null);
  };

  // ---- Phone method ----

  const validatePhoneForm = () => {
    if (!fullName.trim()) throw new Error("Nama lengkap wajib diisi.");

    const emailErr = getEmailValidationMessage(phoneEmail, {
      label: "Email",
      required: true,
    });
    if (emailErr) throw new Error(emailErr);

    if (password.length < 8) throw new Error("Kata sandi minimal 8 karakter.");

    const phoneErr = getPhoneValidationMessage(phone, {
      label: "Nomor HP",
      required: true,
    });
    if (phoneErr) throw new Error(phoneErr);

    return normalizePhoneNumber(phone);
  };

  const handleSendPhoneOtp = async () => {
    setServerError(null);
    setInfoMessage(null);
    setIsSendingOtp(true);

    try {
      const normalizedPhone = validatePhoneForm();

      clearRecaptcha();

      const auth = getPhoneFirebaseAuth();
      recaptchaVerifierRef.current = new RecaptchaVerifier(
        auth,
        "recaptcha-phone-register",
        { size: "invisible" }
      );

      const result = await signInWithPhoneNumber(
        auth,
        normalizedPhone,
        recaptchaVerifierRef.current
      );

      setConfirmationResult(result);
      setOtpCode("");
      setPhoneStep("otp");
      setInfoMessage("Kode OTP telah dikirim via SMS ke nomor HP kamu.");
    } catch (error) {
      clearRecaptcha();
      setServerError(getErrorMessage(error));
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyPhoneOtp = async () => {
    if (!confirmationResult) {
      setServerError("Kirim OTP terlebih dahulu.");
      return;
    }

    if (otpCode.trim().length !== OTP_CODE_LENGTH) {
      setServerError(`Kode OTP harus ${OTP_CODE_LENGTH} digit.`);
      return;
    }

    setServerError(null);
    setInfoMessage(null);
    setIsRegistering(true);

    try {
      const firebaseResult = await confirmationResult.confirm(otpCode.trim());
      const firebasePhoneToken = await firebaseResult.user.getIdToken();

      const result = await registerTenant({
        full_name: fullName.trim(),
        email: sanitizeEmailInput(phoneEmail),
        password,
        firebase_phone_token: firebasePhoneToken,
      });

      completeSession(result);
    } catch (error) {
      setServerError(getErrorMessage(error));
    } finally {
      setIsRegistering(false);
    }
  };

  const handleBackToPhoneForm = () => {
    setPhoneStep("form");
    setOtpCode("");
    setConfirmationResult(null);
    clearRecaptcha();
    setServerError(null);
    setInfoMessage(null);
  };

  // ---- Email method ----

  const handleRequestEmailCode = async () => {
    setServerError(null);
    setInfoMessage(null);
    setIsRequesting(true);

    try {
      const emailErr = getEmailValidationMessage(emailContact, {
        label: "Email",
        required: true,
      });
      if (emailErr) throw new Error(emailErr);

      const sanitized = sanitizeEmailInput(emailContact);
      const result = await requestTenantRegistrationEmailCode(sanitized);
      setEmailContact(result.email);
      setDebugCode(result.debugCode ?? null);
      setCode("");
      setIsCodeRequested(true);
      setInfoMessage("Kode verifikasi telah dikirim ke email kamu.");
    } catch (error) {
      setServerError(getErrorMessage(error));
    } finally {
      setIsRequesting(false);
    }
  };

  const handleVerifyEmailCode = async () => {
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
      const verified = await verifyTenantRegistrationEmailCode({
        email: sanitizeEmailInput(emailContact),
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

  return (
    <div className="space-y-6">
      {/* Method tabs */}
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
            {item === "phone" ? "Email + Nomor HP" : "Email Saja"}
          </button>
        ))}
      </div>

      {/* Invisible reCAPTCHA container — must always be in the DOM */}
      <div id="recaptcha-phone-register" />

      {/* ---- Phone method ---- */}
      {method === "phone" && (
        <>
          {phoneStep === "form" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  autoComplete="name"
                  disabled={isBusy}
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    setServerError(null);
                  }}
                  placeholder="Nama lengkap kamu"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  disabled={isBusy}
                  value={phoneEmail}
                  onChange={(e) => {
                    setPhoneEmail(sanitizeEmailInput(e.target.value));
                    setServerError(null);
                  }}
                  placeholder="nama@email.com"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Kata Sandi
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    disabled={isBusy}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setServerError(null);
                    }}
                    placeholder="Minimal 8 karakter"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:bg-slate-50 disabled:text-slate-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-gray-500"
                    aria-label={
                      showPassword
                        ? "Sembunyikan kata sandi"
                        : "Tampilkan kata sandi"
                    }
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Nomor HP
                </label>
                <input
                  type="tel"
                  autoComplete="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={PHONE_INPUT_MAX_LENGTH}
                  disabled={isBusy}
                  value={phone}
                  onChange={(e) => {
                    setPhone(sanitizePhoneInput(e.target.value));
                    setServerError(null);
                  }}
                  placeholder="Contoh: 081234567890"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:bg-slate-50 disabled:text-slate-500"
                />
                <p className="mt-1 text-[11px] text-gray-400">
                  Kode OTP akan dikirim via SMS ke nomor ini.
                </p>
              </div>
            </div>
          )}

          {phoneStep === "otp" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-700">
                Kode OTP telah dikirim ke <span className="font-medium">{phone}</span>. Masukkan
                kode 6 digit di bawah.
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Kode OTP
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={OTP_CODE_LENGTH}
                  disabled={isBusy}
                  value={otpCode}
                  onChange={(e) => {
                    setOtpCode(sanitizeOtpInput(e.target.value));
                    setServerError(null);
                  }}
                  placeholder="Masukkan 6 digit kode"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 tracking-[0.35em] focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:bg-slate-50"
                />
              </div>
            </div>
          )}
        </>
      )}

      {/* ---- Email method ---- */}
      {method === "email" && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              autoComplete="email"
              inputMode="email"
              disabled={isCodeRequested || isBusy}
              value={emailContact}
              onChange={(e) => {
                setEmailContact(sanitizeEmailInput(e.target.value));
                setIsCodeRequested(false);
                setCode("");
                setDebugCode(null);
                setServerError(null);
              }}
              placeholder="nama@email.com"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:bg-slate-50 disabled:text-slate-500"
            />
            <p className="mt-1 text-[11px] text-gray-400">
              Kode verifikasi akan dikirim ke email ini.
            </p>
          </div>

          {isCodeRequested && (
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
                onChange={(e) => setCode(sanitizeOtpInput(e.target.value))}
                placeholder="Masukkan 6 digit kode"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 tracking-[0.35em] focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              {debugCode ? (
                <p className="mt-1 text-[11px] text-amber-600">
                  Mode dev: kode verifikasi {debugCode}
                </p>
              ) : null}
            </div>
          )}
        </div>
      )}

      {serverError ? (
        <p className="text-sm text-red-600 text-center">{serverError}</p>
      ) : null}

      {infoMessage ? (
        <p className="text-sm text-sky-700 text-center">{infoMessage}</p>
      ) : null}

      {/* Action buttons */}
      <div className="space-y-2">
        {method === "phone" && (
          <>
            {phoneStep === "form" && (
              <button
                type="button"
                onClick={handleSendPhoneOtp}
                disabled={isBusy}
                className="w-full rounded-xl bg-sky-600 py-2.5 text-white transition hover:bg-sky-700 disabled:opacity-50"
              >
                {isSendingOtp ? "Mengirim OTP..." : "Kirim OTP ke HP"}
              </button>
            )}

            {phoneStep === "otp" && (
              <>
                <button
                  type="button"
                  onClick={handleVerifyPhoneOtp}
                  disabled={isBusy}
                  className="w-full rounded-xl bg-sky-600 py-2.5 text-white transition hover:bg-sky-700 disabled:opacity-50"
                >
                  {isRegistering ? "Mendaftarkan..." : "Verifikasi & Daftar"}
                </button>

                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={handleBackToPhoneForm}
                    disabled={isBusy}
                    className="text-xs font-medium text-slate-500 hover:text-slate-700 disabled:opacity-50"
                  >
                    Kembali &amp; ubah data
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {method === "email" && (
          <>
            {!isCodeRequested ? (
              <button
                type="button"
                onClick={handleRequestEmailCode}
                disabled={isBusy}
                className="w-full rounded-xl bg-sky-600 py-2.5 text-white transition hover:bg-sky-700 disabled:opacity-50"
              >
                {isRequesting ? "Mengirim..." : "Kirim Kode Verifikasi"}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleVerifyEmailCode}
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
                  onClick={handleRequestEmailCode}
                  disabled={isBusy}
                  className="font-medium text-sky-700 hover:text-sky-800 disabled:opacity-50"
                >
                  Kirim ulang kode
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCodeRequested(false);
                    setCode("");
                    setDebugCode(null);
                    setServerError(null);
                  }}
                  disabled={isBusy}
                  className="font-medium text-slate-500 hover:text-slate-700 disabled:opacity-50"
                >
                  Ubah email
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
