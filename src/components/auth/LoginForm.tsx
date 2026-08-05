"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { useSearchParams } from "next/navigation";
import axios from "axios";
import { type AuthResult, login, resolveRoleRoute } from "@/lib/auth";
import { sanitizeEmailInput } from "@/lib/form-validation";
import { useAuth } from "@/context/AuthContext";

const getLoginErrorMessage = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return "Tidak bisa terhubung ke layanan KIKOST. Pastikan sistem aktif.";
    }
    if (error.response.status === 429) {
      return "Terlalu banyak percobaan login. Silakan coba lagi nanti.";
    }
    return "Email atau kata sandi tidak valid.";
  }
  return "Email atau kata sandi tidak valid.";
};

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const searchParams = useSearchParams();
  const { setSession } = useAuth();

  const completeSession = useCallback((result: AuthResult) => {
    setSession({
      user: result.user,
      expiresAt: result.expiresAt,
      refreshTokenExpiresAt: result.refreshTokenExpiresAt,
    });
    window.location.replace(
      resolveRoleRoute(result.user.role, searchParams.get("next"))
    );
  }, [searchParams, setSession]);

  const handleLogin = async () => {
    setError(null);
    if (!email.trim()) {
      setError("Email wajib diisi.");
      return;
    }
    if (!password) {
      setError("Kata sandi wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    try {
      completeSession(await login({
        email: sanitizeEmailInput(email),
        password,
      }));
    } catch (loginError) {
      setError(getLoginErrorMessage(loginError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        void handleLogin();
      }}
    >
      <div>
        <label htmlFor="login-email" className="mb-1 block text-sm font-medium">
          Alamat Email
        </label>
        <input
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          maxLength={254}
          value={email}
          onChange={(event) => {
            setEmail(sanitizeEmailInput(event.target.value));
            setError(null);
          }}
          disabled={isSubmitting}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:bg-slate-50"
        />
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <label htmlFor="login-password" className="block text-sm font-medium">
            Kata Sandi
          </label>
          <Link href="/auth/forgot-password" className="text-xs font-medium text-sky-700 hover:underline">
            Lupa kata sandi?
          </Link>
        </div>
        <div className="relative">
          <input
            id="login-password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            maxLength={72}
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setError(null);
            }}
            disabled={isSubmitting}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:bg-slate-50"
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="absolute right-3 top-2.5 text-gray-500"
            aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      {error && <p role="alert" className="text-center text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-xl bg-sky-600 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-50"
      >
        {isSubmitting ? "Memproses..." : "Masuk"}
      </button>

      <p className="text-center text-xs text-slate-500">
        Login Google sudah tidak tersedia. Akun lama dapat membuat kata sandi melalui tautan di atas.
      </p>
    </form>
  );
}
