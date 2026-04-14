"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema } from "@/schemas/login.schema";
import { z } from "zod";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { login, loginWithGoogle, resolveRoleRoute } from "@/lib/auth";
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

const getErrorMessage = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return "Tidak bisa terhubung ke server. Pastikan backend aktif di port 3001.";
    }

    if (error.response?.status === 404) {
      return "Endpoint login tidak ditemukan. Cek konfigurasi NEXT_PUBLIC_API_URL.";
    }

    const payload = error.response?.data as
      | { message?: string; errors?: string[] }
      | undefined;
    return (
      payload?.errors?.[0] ??
      payload?.message ??
      "Login gagal. Silakan coba lagi."
    );
  }

  return "Terjadi kesalahan saat login.";
};

const getGoogleErrorMessage = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return "Tidak bisa terhubung ke server. Pastikan backend aktif di port 3001.";
    }

    const payload = error.response?.data as
      | { message?: string; errors?: string[]; data?: { requires_phone_verification?: boolean } }
      | undefined;

    if (
      payload?.message === "Phone verification required" ||
      payload?.data?.requires_phone_verification
    ) {
      return "Akun Google ini membutuhkan verifikasi nomor HP. Silakan daftar manual dulu (OTP WhatsApp), lalu login kembali.";
    }

    if (payload?.errors?.some((item) => item.includes("GOOGLE_OAUTH_CLIENT_IDS"))) {
      return "Login Google belum aktif di server. Hubungi admin sistem.";
    }

    return (
      payload?.errors?.[0] ??
      payload?.message ??
      "Login dengan Google gagal. Silakan coba lagi."
    );
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Login dengan Google gagal. Silakan coba lagi.";
};

export default function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

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
  });

  const onSubmit = async (data: LoginFormData) => {
    setServerError(null);
    setGoogleError(null);

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
        setGoogleError("Token Google tidak ditemukan. Coba ulangi proses login.");
        return;
      }

      setIsGoogleSubmitting(true);

      try {
        const result = await loginWithGoogle({
          id_token: response.credential,
        });
        completeSession(result);
      } catch (error) {
        setGoogleError(getGoogleErrorMessage(error));
      } finally {
        setIsGoogleSubmitting(false);
      }
    },
    [completeSession]
  );

  useEffect(() => {
    if (!googleClientId) {
      return;
    }

    const renderGoogleButton = () => {
      if (
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

      const buttonWidth = Math.max(
        220,
        Math.min(360, (googleButtonRef.current.clientWidth || 360) - 4)
      );

      googleButtonRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "pill",
        width: buttonWidth,
      });

      googleInitializedRef.current = true;
    };

    if (window.google?.accounts?.id) {
      renderGoogleButton();
      return;
    }

    const existingScript = document.querySelector(
      'script[src="https://accounts.google.com/gsi/client"]'
    ) as HTMLScriptElement | null;

    if (existingScript) {
      existingScript.addEventListener("load", renderGoogleButton, { once: true });
      return () => {
        existingScript.removeEventListener("load", renderGoogleButton);
      };
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = renderGoogleButton;
    script.onerror = () => {
      setGoogleError("Gagal memuat komponen Google Sign-In.");
    };
    document.head.appendChild(script);

    return () => {
      script.onload = null;
      script.onerror = null;
    };
  }, [googleClientId, handleGoogleCredential]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* EMAIL */}
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

      {/* PASSWORD */}
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

      {/* ERROR */}
      {serverError && (
        <p className="text-sm text-red-600 text-center">{serverError}</p>
      )}

      {/* BUTTON */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-xl bg-sky-600 py-2.5 text-white transition hover:bg-sky-700 disabled:opacity-50"
      >
        {isSubmitting ? "Memproses..." : "Masuk"}
      </button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-3 text-xs text-slate-500">atau</span>
        </div>
      </div>

      {!googleClientId ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-700">
          Login Google belum dikonfigurasi di frontend. Tambahkan
          `NEXT_PUBLIC_GOOGLE_CLIENT_ID` pada `.env.local`.
        </p>
      ) : (
        <div
          className={`rounded-xl border border-slate-200 bg-white p-2 ${
            isGoogleSubmitting ? "pointer-events-none opacity-70" : ""
          }`}
        >
          <div
            ref={googleButtonRef}
            className="flex min-h-[42px] items-center justify-center"
          />
        </div>
      )}

      {isGoogleSubmitting && (
        <p className="text-center text-xs text-slate-500">
          Memproses login Google...
        </p>
      )}

      {googleError && (
        <p className="text-center text-sm text-red-600">{googleError}</p>
      )}
    </form>
  );
}
