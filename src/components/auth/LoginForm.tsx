"use client";

import { useCallback, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useSearchParams } from "next/navigation";
import axios from "axios";
import { type AuthResult, login, resolveRoleRoute, syncFirebaseUser } from "@/lib/auth";
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

  const searchParams = useSearchParams();
  const { setSession } = useAuth();

  const completeSession = useCallback(
    (result: AuthResult) => {
      setSession({
        user: result.user,
        expiresAt: result.expiresAt,
        refreshTokenExpiresAt: result.refreshTokenExpiresAt,
      });
      window.location.replace(resolveRoleRoute(result.user.role, searchParams.get("next")));
    },
    [searchParams, setSession]
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
