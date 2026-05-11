"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema } from "@/schemas/login.schema";
import { z } from "zod";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { type AuthResult, login, loginWithGoogle, resolveRoleRoute, syncFirebaseUser } from "@/lib/auth";
import { sanitizeEmailInput } from "@/lib/form-validation";
import {
  getFirebaseAuthErrorMessage,
  loginWithFirebaseEmail,
  resendFirebaseVerificationEmail,
} from "@/lib/firebase-email-auth";
import { useAuth } from "@/context/AuthContext";

type LoginFormData = z.infer<typeof loginSchema>;
type LoginMode = "tenant" | "admin";

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
      text?: "signin_with" | "signup_with" | "continue_with" | "signin";
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

const GoogleLogo = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
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

const getAdminErrorMessage = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return "Tidak bisa terhubung ke layanan KIKOST. Pastikan sistem aktif dan NEXT_PUBLIC_API_URL sudah benar.";
    }

    const status = error.response.status;

    if (status === 404) {
      return "Layanan masuk tidak ditemukan. Periksa konfigurasi NEXT_PUBLIC_API_URL.";
    }

    const payload = error.response?.data as
      | { message?: string; errors?: string[] }
      | undefined;

    if (
      payload?.errors?.some((item) => item.includes("GOOGLE_OAUTH_CLIENT_IDS"))
    ) {
      return "Masuk dengan Google belum aktif di layanan. Hubungi administrator sistem.";
    }

    const msg = payload?.errors?.[0] ?? payload?.message;
    if (msg) return msg;

    if (status >= 500) {
      return `Layanan masuk sedang bermasalah (HTTP ${status}). Periksa log backend dan konfigurasi API production.`;
    }

    return `Masuk gagal (HTTP ${status}). Periksa konfigurasi API dan kredensial akun.`;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Terjadi kesalahan saat masuk.";
};

export default function LoginForm() {
  const [loginMode, setLoginMode] = useState<LoginMode>("tenant");

  // ── Admin form (react-hook-form) ──
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  // ── Tenant Firebase email form ──
  const [tenantEmail, setTenantEmail] = useState("");
  const [tenantPassword, setTenantPassword] = useState("");
  const [showTenantPassword, setShowTenantPassword] = useState(false);
  const [tenantError, setTenantError] = useState<string | null>(null);
  const [tenantInfo, setTenantInfo] = useState<string | null>(null);
  const [isTenantSubmitting, setIsTenantSubmitting] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [unverifiedPassword, setUnverifiedPassword] = useState<string | null>(null);
  const [isResendingVerification, setIsResendingVerification] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const { setSession } = useAuth();
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const googleInitializedRef = useRef(false);
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() || "";

  const completeSession = useCallback(
    (result: Awaited<ReturnType<typeof login>>) => {
      setSession({
        user: result.user,
        accessToken: result.token,
        refreshToken: result.refreshToken,
        expiresAt: result.expiresAt,
        refreshTokenExpiresAt: result.refreshTokenExpiresAt,
      });
      router.push(resolveRoleRoute(result.user.role, searchParams.get("next")));
      router.refresh();
    },
    [router, searchParams, setSession]
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur",
  });

  const emailRegistration = register("email", {
    onChange: (event) => {
      event.target.value = sanitizeEmailInput(event.target.value);
    },
  });
  const passwordRegistration = register("password");

  const onAdminSubmit = async (data: LoginFormData) => {
    setServerError(null);
    setGoogleError(null);
    try {
      const result = await login(data);
      completeSession(result);
    } catch (error) {
      setServerError(getAdminErrorMessage(error));
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
        const result = await loginWithGoogle({ id_token: response.credential });
        completeSession(result);
      } catch (error) {
        setGoogleError(getAdminErrorMessage(error));
      } finally {
        setIsGoogleSubmitting(false);
      }
    },
    [completeSession]
  );

  // ── Tenant Firebase email login ──────────────────────────────────────────

  const handleTenantLogin = async () => {
    setTenantError(null);
    setTenantInfo(null);
    setUnverifiedEmail(null);
    setUnverifiedPassword(null);

    if (!tenantEmail.trim()) {
      setTenantError("Email wajib diisi.");
      return;
    }
    if (!tenantPassword) {
      setTenantError("Kata sandi wajib diisi.");
      return;
    }

    setIsTenantSubmitting(true);
    try {
      const { idToken, emailVerified } = await loginWithFirebaseEmail(
        sanitizeEmailInput(tenantEmail),
        tenantPassword
      );

      if (!emailVerified) {
        setUnverifiedEmail(sanitizeEmailInput(tenantEmail));
        setUnverifiedPassword(tenantPassword);
        setTenantError(
          "Email belum diverifikasi. Cek inbox dan klik link verifikasi, lalu coba masuk lagi."
        );
        return;
      }

      const syncResult = await syncFirebaseUser(idToken);

      if ("requiresVerification" in syncResult) {
        setTenantError("Email belum diverifikasi. Silakan cek inbox email Anda.");
        return;
      }

      completeSession(syncResult as AuthResult);
    } catch (error) {
      const msg = axios.isAxiosError(error)
        ? getAdminErrorMessage(error)
        : getFirebaseAuthErrorMessage(error);
      setTenantError(msg);
    } finally {
      setIsTenantSubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    if (!unverifiedEmail || !unverifiedPassword) return;
    setIsResendingVerification(true);
    setTenantError(null);
    setTenantInfo(null);
    try {
      await resendFirebaseVerificationEmail(unverifiedEmail, unverifiedPassword);
      setTenantInfo(`Email verifikasi dikirim ulang ke ${unverifiedEmail}.`);
    } catch (error) {
      setTenantError(getFirebaseAuthErrorMessage(error));
    } finally {
      setIsResendingVerification(false);
    }
  };

  const handleModeChange = (mode: LoginMode) => {
    setLoginMode(mode);
    setServerError(null);
    setGoogleError(null);
    setTenantError(null);
    setTenantInfo(null);
    setUnverifiedEmail(null);
    setUnverifiedPassword(null);
  };

  // ── Google button init (admin mode only) ──────────────────────────────────

  useEffect(() => {
    if (loginMode !== "admin") return;
    googleInitializedRef.current = false;
    if (!googleClientId) return;

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
      return () => { active = false; };
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
      if (active) setGoogleError("Gagal memuat komponen Google Sign-In.");
    };
    document.head.appendChild(script);

    return () => {
      active = false;
      script.onload = null;
      script.onerror = null;
    };
  }, [loginMode, googleClientId, handleGoogleCredential]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Mode toggle: Tenant / Admin */}
      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
        {(["tenant", "admin"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => handleModeChange(m)}
            className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
              loginMode === m
                ? "bg-white text-sky-700 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {m === "tenant" ? "Tenant" : "Admin / Owner"}
          </button>
        ))}
      </div>

      {/* ── Tenant Firebase email login ── */}
      {loginMode === "tenant" && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Alamat Email</label>
            <input
              type="email"
              autoComplete="email"
              inputMode="email"
              maxLength={100}
              placeholder="nama@email.com"
              value={tenantEmail}
              onChange={(e) => {
                setTenantEmail(sanitizeEmailInput(e.target.value));
                setTenantError(null);
              }}
              disabled={isTenantSubmitting || isResendingVerification}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:bg-slate-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Kata Sandi</label>
            <div className="relative">
              <input
                type={showTenantPassword ? "text" : "password"}
                autoComplete="current-password"
                maxLength={100}
                placeholder="Kata sandi Anda"
                value={tenantPassword}
                onChange={(e) => {
                  setTenantPassword(e.target.value);
                  setTenantError(null);
                }}
                disabled={isTenantSubmitting || isResendingVerification}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:bg-slate-50"
              />
              <button
                type="button"
                onClick={() => setShowTenantPassword(!showTenantPassword)}
                className="absolute right-3 top-2.5 text-gray-500"
                aria-label={showTenantPassword ? "Sembunyikan" : "Tampilkan"}
              >
                {showTenantPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {tenantError && (
            <p className="text-sm text-red-600 text-center">{tenantError}</p>
          )}

          {tenantInfo && (
            <p className="text-sm text-sky-700 text-center">{tenantInfo}</p>
          )}

          {unverifiedEmail && (
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={isResendingVerification}
              className="w-full text-sm font-medium text-sky-700 hover:text-sky-800 disabled:opacity-50"
            >
              {isResendingVerification
                ? "Mengirim ulang..."
                : "Kirim ulang email verifikasi"}
            </button>
          )}

          <button
            type="button"
            onClick={handleTenantLogin}
            disabled={isTenantSubmitting || isResendingVerification}
            className="w-full rounded-xl bg-sky-600 py-2.5 text-white transition hover:bg-sky-700 disabled:opacity-50"
          >
            {isTenantSubmitting ? "Memproses..." : "Masuk"}
          </button>
        </div>
      )}

      {/* ── Admin / Owner login (existing, unchanged) ── */}
      {loginMode === "admin" && (
        <form onSubmit={handleSubmit(onAdminSubmit)} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1">Alamat Email</label>
            <input
              {...emailRegistration}
              type="email"
              autoComplete="email"
              inputMode="email"
              maxLength={100}
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
                {...passwordRegistration}
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                maxLength={100}
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
            <p className="text-center text-xs text-slate-500">Memproses masuk Google...</p>
          )}

          {googleError && (
            <p className="text-center text-sm text-red-600">{googleError}</p>
          )}
        </form>
      )}
    </div>
  );
}
