"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema } from "@/schemas/login.schema";
import { z } from "zod";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import {
  login,
  loginWithGoogle,
  requestTenantRegistrationOtp,
  resendTenantRegistrationOtp,
  resolveRoleRoute,
  verifyTenantRegistrationOtp,
} from "@/lib/auth";
import { normalizePhoneNumber } from "@/lib/phone";
import { useAuth } from "@/context/AuthContext";

type LoginFormData = z.infer<typeof loginSchema>;

type GoogleCredentialResponse = {
  credential?: string;
};

type GoogleIdApi = {
  initialize: (options: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
  }) => void;
  renderButton: (
    parent: HTMLElement,
    options: {
      type?: "standard" | "icon";
      theme?: "outline" | "filled_blue" | "filled_black";
      size?: "large" | "medium" | "small";
      text?:
        | "signin_with"
        | "signup_with"
        | "continue_with"
        | "signin";
      shape?: "rectangular" | "pill" | "circle" | "square";
      width?: number;
      logo_alignment?: "left" | "center";
    }
  ) => void;
};

type GoogleApi = {
  accounts: {
    id: GoogleIdApi;
  };
};

declare global {
  interface Window {
    google?: GoogleApi;
  }
}

type GooglePhoneVerificationData = {
  requires_phone_verification?: boolean;
  email?: string;
  full_name?: string;
  picture_url?: string;
};

type GoogleAuthErrorPayload = {
  message?: string;
  errors?: string[];
  data?: GooglePhoneVerificationData;
};

type PendingGoogleVerification = {
  idToken: string;
  email: string;
  fullName: string;
  phoneNumber: string;
  otpCode: string;
  otpRequested: boolean;
  debugCode: string | null;
};

const PHONE_INPUT_PATTERN = /^[0-9+\-\s]+$/;

const GoogleLogo = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    className="h-5 w-5"
  >
    <path
      fill="#4285F4"
      d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.63v2.96h3.88c2.27-2.09 3.54-5.17 3.54-8.83Z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.88-2.96c-1.08.72-2.45 1.14-4.07 1.14-3.13 0-5.78-2.11-6.73-4.95H1.26v3.05A12 12 0 0 0 12 24Z"
    />
    <path
      fill="#FBBC05"
      d="M5.27 14.33A7.2 7.2 0 0 1 4.89 12c0-.81.14-1.6.38-2.33V6.62H1.26A12 12 0 0 0 0 12c0 1.93.46 3.76 1.26 5.38l4.01-3.05Z"
    />
    <path
      fill="#EA4335"
      d="M12 4.72c1.76 0 3.35.61 4.59 1.8l3.44-3.44A11.56 11.56 0 0 0 12 0 12 12 0 0 0 1.26 6.62l4.01 3.05C6.22 6.83 8.87 4.72 12 4.72Z"
    />
  </svg>
);

const getErrorMessage = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return "Tidak bisa terhubung ke layanan KIKOST. Pastikan sistem aktif dan NEXT_PUBLIC_API_URL sudah benar.";
    }

    if (error.response?.status === 404) {
      return "Layanan masuk tidak ditemukan. Periksa konfigurasi NEXT_PUBLIC_API_URL.";
    }

    const payload = error.response?.data as
      | { message?: string; errors?: string[] }
      | undefined;
    return (
      payload?.errors?.[0] ??
      payload?.message ??
      "Masuk gagal. Silakan coba lagi."
    );
  }

  return "Terjadi kesalahan saat masuk.";
};

const getGooglePayload = (error: unknown) => {
  if (!axios.isAxiosError(error)) {
    return undefined;
  }

  return error.response?.data as GoogleAuthErrorPayload | undefined;
};

const getGooglePhoneVerificationData = (error: unknown) => {
  const payload = getGooglePayload(error);

  if (
    payload?.message !== "Phone verification required" &&
    !payload?.data?.requires_phone_verification
  ) {
    return null;
  }

  return payload?.data ?? null;
};

const getGoogleErrorMessage = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return "Tidak bisa terhubung ke layanan KIKOST. Pastikan sistem aktif dan NEXT_PUBLIC_API_URL sudah benar.";
    }

    const payload = error.response?.data as
      | {
          message?: string;
          errors?: string[];
          data?: { requires_phone_verification?: boolean };
        }
      | undefined;

    if (
      payload?.message === "Phone verification required" ||
      payload?.data?.requires_phone_verification
    ) {
      return "Akun Google ini membutuhkan verifikasi nomor HP. Silakan daftar manual terlebih dahulu (OTP WhatsApp), lalu masuk kembali.";
    }

    if (
      payload?.errors?.some((item) => item.includes("GOOGLE_OAUTH_CLIENT_IDS"))
    ) {
      return "Masuk dengan Google belum aktif di layanan. Hubungi administrator sistem.";
    }

    return (
      payload?.errors?.[0] ??
      payload?.message ??
      "Masuk dengan Google gagal. Silakan coba lagi."
    );
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Masuk dengan Google gagal. Silakan coba lagi.";
};

export default function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [googleInfoMessage, setGoogleInfoMessage] = useState<string | null>(null);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [isRequestingGoogleOtp, setIsRequestingGoogleOtp] = useState(false);
  const [isResendingGoogleOtp, setIsResendingGoogleOtp] = useState(false);
  const [isVerifyingGoogleOtp, setIsVerifyingGoogleOtp] = useState(false);
  const [pendingGoogleVerification, setPendingGoogleVerification] =
    useState<PendingGoogleVerification | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const { setSession } = useAuth();
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const googleInitializedRef = useRef(false);
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() || "";
  const isGoogleOtpBusy =
    isRequestingGoogleOtp || isResendingGoogleOtp || isVerifyingGoogleOtp;

  const completeSession = useCallback(
    (result: Awaited<ReturnType<typeof login>>) => {
      setSession({
        user: result.user,
        accessToken: result.token,
        refreshToken: result.refreshToken,
        expiresAt: result.expiresAt,
      });

      router.push(resolveRoleRoute(result.user.role, searchParams.get("next")));
      router.refresh();
    },
    [router, searchParams, setSession]
  );

  const clearPendingGoogleVerification = useCallback(() => {
    setPendingGoogleVerification(null);
    setGoogleError(null);
    setGoogleInfoMessage(null);
  }, []);

  const updatePendingGoogleVerification = useCallback(
    (updates: Partial<PendingGoogleVerification>) => {
      setPendingGoogleVerification((current) =>
        current
          ? {
              ...current,
              ...updates,
            }
          : current
      );
    },
    []
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setServerError(null);
    setGoogleError(null);
    clearPendingGoogleVerification();

    try {
      const result = await login(data);
      completeSession(result);
    } catch (error) {
      setServerError(getErrorMessage(error));
    }
  };

  const handleGoogleCredential = useCallback(
    async (response: GoogleCredentialResponse) => {
      setServerError(null);
      setGoogleError(null);

      if (!response.credential) {
        setGoogleError("Token Google tidak ditemukan. Coba ulangi proses masuk.");
        return;
      }

      setIsGoogleSubmitting(true);

      try {
        const result = await loginWithGoogle({
          id_token: response.credential,
        });
        clearPendingGoogleVerification();
        completeSession(result);
      } catch (error) {
        const phoneVerificationData = getGooglePhoneVerificationData(error);

        if (phoneVerificationData) {
          setPendingGoogleVerification({
            idToken: response.credential,
            email: phoneVerificationData.email ?? "",
            fullName: phoneVerificationData.full_name ?? "",
            phoneNumber: "",
            otpCode: "",
            otpRequested: false,
            debugCode: null,
          });
          setGoogleInfoMessage(
            "Nomor HP diperlukan untuk menyelesaikan proses masuk penyewa melalui Google."
          );
          return;
        }

        setGoogleError(getGoogleErrorMessage(error));
      } finally {
        setIsGoogleSubmitting(false);
      }
    },
    [clearPendingGoogleVerification, completeSession]
  );

  const validateGooglePhoneNumber = () => {
    const rawPhone = pendingGoogleVerification?.phoneNumber?.trim() ?? "";
    if (!rawPhone) {
      throw new Error("Masukkan nomor HP terlebih dahulu.");
    }

    if (!PHONE_INPUT_PATTERN.test(rawPhone)) {
      throw new Error("Nomor HP hanya boleh berisi angka, spasi, atau tanda +.");
    }

    const digitLength = rawPhone.replace(/\D/g, "").length;
    if (digitLength < 10 || digitLength > 20) {
      throw new Error("Nomor HP harus berisi 10 sampai 20 digit.");
    }

    return normalizePhoneNumber(rawPhone);
  };

  const handleGooglePhoneChange = (value: string) => {
    setGoogleError(null);
    setGoogleInfoMessage(null);
    updatePendingGoogleVerification({
      phoneNumber: value,
      otpCode: "",
      otpRequested: false,
      debugCode: null,
    });
  };

  const handleGoogleOtpChange = (value: string) => {
    setGoogleError(null);
    updatePendingGoogleVerification({
      otpCode: value.replace(/\D/g, "").slice(0, 6),
    });
  };

  const handleRequestGoogleOtp = async () => {
    if (!pendingGoogleVerification) {
      return;
    }

    setGoogleError(null);
    setGoogleInfoMessage(null);
    setIsRequestingGoogleOtp(true);

    try {
      const normalizedPhone = validateGooglePhoneNumber();
      const otpResult = await requestTenantRegistrationOtp(normalizedPhone);

      updatePendingGoogleVerification({
        phoneNumber: otpResult.phoneNumber,
        otpCode: "",
        otpRequested: true,
        debugCode: otpResult.debugCode ?? null,
      });
      setGoogleInfoMessage("Kode OTP telah dikirim ke WhatsApp Anda.");
    } catch (error) {
      setGoogleError(
        error instanceof Error
          ? error.message
          : getGoogleErrorMessage(error)
      );
    } finally {
      setIsRequestingGoogleOtp(false);
    }
  };

  const handleResendGoogleOtp = async () => {
    if (!pendingGoogleVerification?.otpRequested) {
      return;
    }

    setGoogleError(null);
    setGoogleInfoMessage(null);
    setIsResendingGoogleOtp(true);

    try {
      const otpResult = await resendTenantRegistrationOtp(
        pendingGoogleVerification.phoneNumber
      );

      updatePendingGoogleVerification({
        phoneNumber: otpResult.phoneNumber,
        debugCode: otpResult.debugCode ?? null,
        otpCode: "",
      });
      setGoogleInfoMessage("Kode OTP baru telah dikirim.");
    } catch (error) {
      setGoogleError(getGoogleErrorMessage(error));
    } finally {
      setIsResendingGoogleOtp(false);
    }
  };

  const handleEditGooglePhoneNumber = () => {
    setGoogleError(null);
    setGoogleInfoMessage("Ubah nomor HP lalu kirim OTP lagi.");
    updatePendingGoogleVerification({
      otpRequested: false,
      otpCode: "",
      debugCode: null,
    });
  };

  const handleVerifyGoogleOtp = async () => {
    if (!pendingGoogleVerification) {
      return;
    }

    if (!pendingGoogleVerification.otpRequested) {
      setGoogleError("Kirim OTP terlebih dahulu.");
      return;
    }

    if (pendingGoogleVerification.otpCode.trim().length !== 6) {
      setGoogleError("Kode OTP harus 6 digit.");
      return;
    }

    setGoogleError(null);
    setGoogleInfoMessage(null);
    setIsVerifyingGoogleOtp(true);

    try {
      const verifyResult = await verifyTenantRegistrationOtp({
        phoneNumber: pendingGoogleVerification.phoneNumber,
        code: pendingGoogleVerification.otpCode.trim(),
      });

      const result = await loginWithGoogle({
        id_token: pendingGoogleVerification.idToken,
        phone_verification_token: verifyResult.phoneVerificationToken,
      });

      clearPendingGoogleVerification();
      completeSession(result);
    } catch (error) {
      setGoogleError(getGoogleErrorMessage(error));
    } finally {
      setIsVerifyingGoogleOtp(false);
    }
  };

  useEffect(() => {
    googleInitializedRef.current = false;

    if (!googleClientId) {
      return;
    }

    let active = true;

    const renderGoogleButton = () => {
      if (
        !active ||
        !window.google?.accounts?.id ||
        !googleButtonRef.current ||
        googleInitializedRef.current
      ) {
        return;
      }

      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleGoogleCredential,
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      googleButtonRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        type: "icon",
        theme: "outline",
        size: "large",
        shape: "circle",
      });

      googleInitializedRef.current = true;
    };

    if (window.google?.accounts?.id) {
      renderGoogleButton();
      return () => {
        active = false;
      };
    }

    const existingScript = document.querySelector(
      'script[src="https://accounts.google.com/gsi/client"]'
    ) as HTMLScriptElement | null;

    if (existingScript) {
      existingScript.addEventListener("load", renderGoogleButton, { once: true });
      return () => {
        active = false;
        existingScript.removeEventListener("load", renderGoogleButton);
      };
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = renderGoogleButton;
    script.onerror = () => {
      if (active) {
        setGoogleError("Gagal memuat komponen Google Sign-In.");
      }
    };
    document.head.appendChild(script);

    return () => {
      active = false;
      script.onload = null;
      script.onerror = null;
    };
  }, [googleClientId, handleGoogleCredential]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-1">Alamat Email</label>

        <input
          {...register("email")}
          type="email"
          autoComplete="email"
          placeholder="Masukkan alamat email Anda"
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-500"
        />

        {!errors.email && (
          <p className="mt-1 text-[11px] text-gray-400">
            Gunakan alamat email yang terdaftar pada akun Anda.
          </p>
        )}

        {errors.email && (
          <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Kata Sandi</label>

        <div className="relative">
          <input
            {...register("password")}
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Masukkan kata sandi Anda"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />

          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-2.5 text-gray-500"
            aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {!errors.password && (
          <p className="mt-1 text-[11px] text-gray-400">
            Pastikan Anda memasukkan kata sandi dengan benar.
          </p>
        )}

        {errors.password && (
          <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
        )}
      </div>

      {serverError && (
        <p className="text-sm text-red-600 text-center">{serverError}</p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-xl bg-sky-600 py-2.5 text-white transition hover:bg-sky-700 disabled:opacity-50"
      >
        {isSubmitting ? "Memproses..." : "Masuk"}
      </button>

      <div className="space-y-3 pt-1">
        <p className="text-center text-xs text-slate-500">atau masuk dengan</p>

        {googleClientId ? (
          <div
            className={`relative flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4 ${
              isGoogleSubmitting ? "pointer-events-none opacity-70" : ""
            }`}
          >
            <div className="pointer-events-none absolute left-1/2 top-4 z-10 flex h-[42px] w-[42px] -translate-x-1/2 items-center justify-center rounded-full bg-white">
              <GoogleLogo />
            </div>
            <div
              ref={googleButtonRef}
              className="relative z-20 flex min-h-[42px] items-center justify-center opacity-[0.02]"
            />
            <p className="text-xs text-slate-500">Google</p>
          </div>
        ) : null}
      </div>

      {isGoogleSubmitting && (
        <p className="text-center text-xs text-slate-500">
          Memproses masuk Google...
        </p>
      )}

      {pendingGoogleVerification && (
        <div className="space-y-4 rounded-2xl border border-sky-200 bg-sky-50/80 p-4">
          <div>
            <p className="text-sm font-medium text-sky-950">
              Lengkapi verifikasi nomor HP
            </p>
            <p className="mt-1 text-xs text-sky-800">
              Sistem hanya menerima data Google dasar. Masukkan nomor HP untuk
              OTP WhatsApp, lalu proses masuk Google akan diselesaikan ke layanan
              sistem yang sama.
            </p>
            {pendingGoogleVerification.fullName && (
              <p className="mt-2 text-xs text-sky-700">
                Nama Google: {pendingGoogleVerification.fullName}
              </p>
            )}
            {pendingGoogleVerification.email && (
              <p className="mt-1 text-xs text-sky-700">
                Email Google: {pendingGoogleVerification.email}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Nomor HP</label>
            <input
              type="tel"
              autoComplete="tel"
              value={pendingGoogleVerification.phoneNumber}
              onChange={(event) => handleGooglePhoneChange(event.target.value)}
              disabled={pendingGoogleVerification.otpRequested || isGoogleOtpBusy}
              placeholder="Contoh: 081234567890"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:bg-slate-100"
            />
            <p className="mt-1 text-[11px] text-sky-700">
              Nomor HP penyewa akan diverifikasi dengan OTP WhatsApp.
            </p>
          </div>

          {pendingGoogleVerification.otpRequested && (
            <div>
              <label className="block text-sm font-medium mb-1">Kode OTP</label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={pendingGoogleVerification.otpCode}
                onChange={(event) => handleGoogleOtpChange(event.target.value)}
                disabled={isGoogleOtpBusy}
                placeholder="Contoh: 123456"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:bg-slate-100"
              />
              <p className="mt-1 text-[11px] text-sky-700">
                Masukkan 6 digit OTP yang dikirim ke nomor tersebut.
              </p>
            </div>
          )}

          {pendingGoogleVerification.debugCode && (
            <div className="rounded-xl border border-sky-200 bg-white px-3 py-2 text-xs text-sky-700">
              Kode OTP (dev): {pendingGoogleVerification.debugCode}
            </div>
          )}

          {googleInfoMessage && (
            <p className="text-center text-sm text-sky-700">
              {googleInfoMessage}
            </p>
          )}

          {!pendingGoogleVerification.otpRequested ? (
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleRequestGoogleOtp}
                disabled={isGoogleOtpBusy}
                className="w-full rounded-xl bg-sky-600 py-2.5 text-white transition hover:bg-sky-700 disabled:opacity-50"
              >
                {isRequestingGoogleOtp ? "Mengirim OTP..." : "Kirim OTP"}
              </button>

              <div className="flex justify-center text-xs">
                <button
                  type="button"
                  onClick={clearPendingGoogleVerification}
                  disabled={isGoogleOtpBusy}
                  className="text-slate-600 transition hover:text-slate-900 disabled:opacity-50"
                >
                  Batalkan masuk Google
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={handleVerifyGoogleOtp}
                  disabled={isGoogleOtpBusy}
                  className="w-full rounded-xl bg-sky-600 py-2.5 text-white transition hover:bg-sky-700 disabled:opacity-50"
                >
                  {isVerifyingGoogleOtp
                    ? "Memverifikasi..."
                    : "Verifikasi & Masuk"}
                </button>

                <button
                  type="button"
                  onClick={handleResendGoogleOtp}
                  disabled={isGoogleOtpBusy}
                  className="w-full rounded-xl border border-slate-300 bg-white py-2.5 text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  {isResendingGoogleOtp ? "Mengirim..." : "Kirim Ulang OTP"}
                </button>
              </div>

              <div className="flex justify-center gap-4 text-xs">
                <button
                  type="button"
                  onClick={handleEditGooglePhoneNumber}
                  disabled={isGoogleOtpBusy}
                  className="text-slate-600 transition hover:text-slate-900 disabled:opacity-50"
                >
                  Ganti nomor HP
                </button>

                <button
                  type="button"
                  onClick={clearPendingGoogleVerification}
                  disabled={isGoogleOtpBusy}
                  className="text-slate-600 transition hover:text-slate-900 disabled:opacity-50"
                >
                  Batalkan masuk Google
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {googleError && (
        <p className="text-center text-sm text-red-600">{googleError}</p>
      )}
    </form>
  );
}
