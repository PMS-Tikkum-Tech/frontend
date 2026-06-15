"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { type AuthResult, login, loginWithGoogle, resolveRoleRoute, syncFirebaseUser } from "@/lib/auth";
import { sanitizeEmailInput } from "@/lib/form-validation";
import {
  getFirebaseAuthErrorMessage,
  isFirebaseUserNotFoundError,
  loginWithFirebaseEmail,
} from "@/lib/firebase-email-auth";
import {
  completeTenantEmailRegistration,
  requestTenantRegistrationEmailCode,
  verifyTenantRegistrationEmailCode,
} from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";

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
    __kyraGoogleCredentialHandler?: (response: GoogleCredentialResponse) => void;
    __kyraGoogleInitializedClientId?: string;
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

const getLoginErrorMessage = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return "Tidak bisa terhubung ke layanan KIKOST. Pastikan sistem aktif.";
    }
    const status = error.response.status;
    if (status === 404) {
      return "Layanan masuk tidak ditemukan. Periksa konfigurasi sistem.";
    }
    const payload = error.response?.data as
      | { message?: string; errors?: string[] }
      | undefined;
    if (payload?.errors?.some((item) => item.includes("GOOGLE_OAUTH_CLIENT_IDS"))) {
      return "Masuk dengan Google belum aktif. Hubungi administrator.";
    }
    const msg = payload?.errors?.[0] ?? payload?.message;
    if (msg) return msg;
    if (status >= 500) {
      return `Layanan bermasalah (HTTP ${status}). Periksa log backend.`;
    }
    return `Masuk gagal (HTTP ${status}).`;
  }
  if (error instanceof Error && error.message) return error.message;
  return "Terjadi kesalahan saat masuk.";
};

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);

  // Passwordless OTP section
  const [showLinkSection, setShowLinkSection] = useState(false);
  const [linkStep, setLinkStep] = useState<"email" | "otp">("email");
  const [linkEmail, setLinkEmail] = useState("");
  const [linkCode, setLinkCode] = useState("");
  const [isSendingLink, setIsSendingLink] = useState(false);
  const [isVerifyingLink, setIsVerifyingLink] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  // Google
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const { setSession } = useAuth();
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const googleButtonRenderedRef = useRef(false);
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() || "";

  const completeSession = useCallback(
    (result: AuthResult) => {
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

  const handleLogin = async () => {
    setError(null);
    setUnverifiedEmail(null);

    if (!email.trim()) { setError("Email wajib diisi."); return; }
    if (!password) { setError("Kata sandi wajib diisi."); return; }

    setIsSubmitting(true);
    try {
      // Try Firebase first (for tenant/Firebase users)
      const { idToken, emailVerified } = await loginWithFirebaseEmail(
        sanitizeEmailInput(email),
        password
      );

      if (!emailVerified) {
        setUnverifiedEmail(sanitizeEmailInput(email));
        setError(
          "Email belum diverifikasi. Daftar ulang dengan email ini untuk mendapatkan tautan baru."
        );
        return;
      }

      const syncResult = await syncFirebaseUser(idToken);
      if ("requiresVerification" in syncResult) {
        setUnverifiedEmail(sanitizeEmailInput(email));
        setError("Email belum diverifikasi. Silakan cek inbox email Anda.");
        return;
      }

      completeSession(syncResult as AuthResult);
    } catch (firebaseError) {
      // Firebase user not found → try backend (for admin/owner accounts)
      if (isFirebaseUserNotFoundError(firebaseError)) {
        try {
          const result = await login({
            email: sanitizeEmailInput(email),
            password,
          });
          completeSession(result);
        } catch (backendError) {
          setError(getLoginErrorMessage(backendError));
        }
      } else {
        setError(getFirebaseAuthErrorMessage(firebaseError));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendOtpCode = async () => {
    setLinkError(null);
    const sanitized = sanitizeEmailInput(linkEmail);
    if (!sanitized) { setLinkError("Email wajib diisi."); return; }

    setIsSendingLink(true);
    try {
      await requestTenantRegistrationEmailCode(sanitized);
      setLinkStep("otp");
    } catch (err) {
      const axErr = err as { response?: { data?: { errors?: string[]; message?: string } } };
      setLinkError(
        axErr?.response?.data?.errors?.[0] ??
        axErr?.response?.data?.message ??
        "Gagal mengirim kode. Coba lagi."
      );
    } finally {
      setIsSendingLink(false);
    }
  };

  const handleVerifyOtpCode = async () => {
    setLinkError(null);
    const trimmed = linkCode.replace(/\D/g, "");
    if (trimmed.length !== 6) { setLinkError("Kode verifikasi harus 6 digit."); return; }

    setIsVerifyingLink(true);
    try {
      const verified = await verifyTenantRegistrationEmailCode({
        email: sanitizeEmailInput(linkEmail),
        code: trimmed,
      });
      const authResult = await completeTenantEmailRegistration({
        emailVerificationToken: verified.emailVerificationToken,
      });
      completeSession(authResult);
    } catch (err) {
      const axErr = err as { response?: { data?: { errors?: string[]; message?: string } } };
      setLinkError(
        axErr?.response?.data?.errors?.[0] ??
        axErr?.response?.data?.message ??
        "Kode salah atau sudah kadaluarsa."
      );
    } finally {
      setIsVerifyingLink(false);
    }
  };

  const handleGoogleCredential = useCallback(
    async (response: GoogleCredentialResponse) => {
      setError(null);
      setGoogleError(null);
      if (!response.credential) {
        setGoogleError("Token Google tidak ditemukan. Coba ulangi proses masuk.");
        return;
      }
      setIsGoogleSubmitting(true);
      try {
        const result = await loginWithGoogle({ id_token: response.credential });
        completeSession(result);
      } catch (err) {
        setGoogleError(getLoginErrorMessage(err));
      } finally {
        setIsGoogleSubmitting(false);
      }
    },
    [completeSession]
  );

  useEffect(() => {
    googleButtonRenderedRef.current = false;
    if (!googleClientId) return;

    let active = true;
    window.__kyraGoogleCredentialHandler = handleGoogleCredential;

    const initializeGoogle = () => {
      if (!window.google?.accounts?.id) {
        return false;
      }

      if (window.__kyraGoogleInitializedClientId !== googleClientId) {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: (response) => {
            window.__kyraGoogleCredentialHandler?.(response);
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        });
        window.__kyraGoogleInitializedClientId = googleClientId;
      }

      return true;
    };

    const renderGoogleButton = () => {
      if (
        !active ||
        !googleButtonRef.current ||
        googleButtonRenderedRef.current ||
        !initializeGoogle()
      ) return;

      googleButtonRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        type: "icon",
        theme: "outline",
        size: "large",
        shape: "circle",
      });
      googleButtonRenderedRef.current = true;
    };

    if (window.google?.accounts?.id) {
      renderGoogleButton();
      return () => {
        active = false;
        if (window.__kyraGoogleCredentialHandler === handleGoogleCredential) {
          window.__kyraGoogleCredentialHandler = undefined;
        }
      };
    }

    const existingScript = document.querySelector(
      'script[src="https://accounts.google.com/gsi/client"]'
    ) as HTMLScriptElement | null;

    if (existingScript) {
      existingScript.addEventListener("load", renderGoogleButton, { once: true });
      return () => {
        active = false;
        if (window.__kyraGoogleCredentialHandler === handleGoogleCredential) {
          window.__kyraGoogleCredentialHandler = undefined;
        }
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
      if (window.__kyraGoogleCredentialHandler === handleGoogleCredential) {
        window.__kyraGoogleCredentialHandler = undefined;
      }
      script.onload = null;
      script.onerror = null;
    };
  }, [googleClientId, handleGoogleCredential]);

  return (
    <div className="space-y-4">
      {/* Email */}
      <div>
        <label className="block text-sm font-medium mb-1">Alamat Email</label>
        <input
          type="email"
          autoComplete="email"
          inputMode="email"
          maxLength={100}
          placeholder="nama@email.com"
          value={email}
          onChange={(e) => {
            setEmail(sanitizeEmailInput(e.target.value));
            setError(null);
          }}
          onKeyDown={(e) => { if (e.key === "Enter") void handleLogin(); }}
          disabled={isSubmitting}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:bg-slate-50"
        />
      </div>

      {/* Password */}
      <div>
        <label className="block text-sm font-medium mb-1">Kata Sandi</label>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            maxLength={100}
            placeholder="Kata sandi Anda"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => { if (e.key === "Enter") void handleLogin(); }}
            disabled={isSubmitting}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:bg-slate-50"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-2.5 text-gray-500"
            aria-label={showPassword ? "Sembunyikan" : "Tampilkan"}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-center text-sm text-red-600">{error}</p>
      )}

      {unverifiedEmail && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Belum punya kata sandi?{" "}
          <button
            type="button"
            onClick={() => {
              setShowLinkSection(true);
              setLinkStep("email");
              setLinkEmail(unverifiedEmail);
              setLinkCode("");
              setLinkError(null);
            }}
            className="font-semibold underline"
          >
            Masuk dengan kode email
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={handleLogin}
        disabled={isSubmitting}
        className="w-full rounded-xl bg-sky-600 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-50"
      >
        {isSubmitting ? "Memproses..." : "Masuk"}
      </button>

      {/* Google sign-in */}
      {googleClientId ? (
        <div className="space-y-3 pt-1">
          <p className="text-center text-xs text-slate-500">atau masuk dengan</p>
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
        </div>
      ) : null}

      {isGoogleSubmitting && (
        <p className="text-center text-xs text-slate-500">Memproses masuk Google...</p>
      )}
      {googleError && (
        <p className="text-center text-sm text-red-600">{googleError}</p>
      )}

      {/* Passwordless OTP section */}
      <div className="border-t border-slate-100 pt-3">
        {!showLinkSection ? (
          <button
            type="button"
            onClick={() => {
              setShowLinkSection(true);
              setLinkStep("email");
              setLinkEmail("");
              setLinkCode("");
              setLinkError(null);
            }}
            className="w-full text-center text-sm text-slate-500 hover:text-sky-700"
          >
            Masuk tanpa kata sandi
          </button>
        ) : linkStep === "otp" ? (
          <div className="space-y-2">
            <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900">
              Kode 6 digit dikirim ke <strong>{sanitizeEmailInput(linkEmail)}</strong>. Berlaku 5 menit.
            </div>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              autoComplete="one-time-code"
              placeholder="123456"
              value={linkCode}
              onChange={(e) => {
                setLinkCode(e.target.value.replace(/\D/g, ""));
                setLinkError(null);
              }}
              onKeyDown={(e) => { if (e.key === "Enter") void handleVerifyOtpCode(); }}
              disabled={isVerifyingLink}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-center text-base tracking-widest focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:bg-slate-50"
            />
            {linkError && <p className="text-xs text-red-600">{linkError}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleVerifyOtpCode}
                disabled={isVerifyingLink}
                className="flex-1 rounded-xl bg-sky-600 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-50"
              >
                {isVerifyingLink ? "Memverifikasi..." : "Verifikasi & Masuk"}
              </button>
              <button
                type="button"
                onClick={() => { setLinkStep("email"); setLinkCode(""); setLinkError(null); }}
                disabled={isVerifyingLink}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-500 hover:bg-slate-50"
              >
                Ganti
              </button>
            </div>
            <button
              type="button"
              onClick={() => void handleSendOtpCode()}
              disabled={isSendingLink || isVerifyingLink}
              className="w-full text-xs text-sky-700 hover:text-sky-800 disabled:opacity-50"
            >
              {isSendingLink ? "Mengirim ulang..." : "Kirim ulang kode"}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-700">
              Masuk dengan kode email (tanpa kata sandi)
            </p>
            <input
              type="email"
              autoComplete="email"
              inputMode="email"
              maxLength={100}
              placeholder="nama@email.com"
              value={linkEmail}
              onChange={(e) => {
                setLinkEmail(sanitizeEmailInput(e.target.value));
                setLinkError(null);
              }}
              onKeyDown={(e) => { if (e.key === "Enter") void handleSendOtpCode(); }}
              disabled={isSendingLink}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:bg-slate-50"
            />
            {linkError && <p className="text-xs text-red-600">{linkError}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSendOtpCode}
                disabled={isSendingLink}
                className="flex-1 rounded-xl bg-sky-600 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-50"
              >
                {isSendingLink ? "Mengirim..." : "Kirim kode"}
              </button>
              <button
                type="button"
                onClick={() => setShowLinkSection(false)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-500 hover:bg-slate-50"
              >
                Batal
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
