"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema } from "@/schemas/register.schema";
import { z } from "zod";
import { useRouter } from "next/navigation";
import axios from "axios";
import { requestTenantRegistrationOtp } from "@/lib/auth";
import { normalizePhoneNumber } from "@/lib/phone";

type RegisterFormData = z.infer<typeof registerSchema>;

export const PENDING_TENANT_REGISTRATION_STORAGE_KEY =
  "kyra.pending.tenant.registration";

const getErrorMessage = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return "Tidak bisa terhubung ke layanan. Pastikan sistem aktif di port 3001.";
    }

    if (error.response?.status === 404) {
      return "Layanan OTP pendaftaran tidak ditemukan. Periksa konfigurasi NEXT_PUBLIC_API_URL.";
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

  return "Terjadi kesalahan saat pendaftaran.";
};

export default function RegisterForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    setServerError(null);

    try {
      const normalizedPhone = normalizePhoneNumber(data.phoneNumber);
      const otpResult = await requestTenantRegistrationOtp(normalizedPhone);

      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(
          PENDING_TENANT_REGISTRATION_STORAGE_KEY,
          JSON.stringify({
            fullName: data.fullName.trim(),
            email: data.email.trim().toLowerCase(),
            password: data.password,
            phoneNumber: otpResult.phoneNumber,
          })
        );
      }

      const nextQuery = new URLSearchParams({
        mode: "verify",
        otp_requested: "1",
        email: data.email.trim().toLowerCase(),
        phone: otpResult.phoneNumber,
      });

      if (otpResult.debugCode) {
        nextQuery.set("debug_code", otpResult.debugCode);
      }

      router.push(`/auth?${nextQuery.toString()}`);

      router.refresh();
    } catch (error) {
      setServerError(getErrorMessage(error));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Nama Lengkap */}
      <div>
        <label className="block text-sm font-medium mb-1">Nama Lengkap</label>

        <input
          {...register("fullName")}
          type="text"
          autoComplete="name"
          placeholder="Masukkan nama lengkap Anda"
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-500"
        />

        {!errors.fullName && (
          <p className="mt-1 text-[11px] text-gray-400 leading-relaxed">
            Gunakan nama sesuai identitas resmi Anda.
          </p>
        )}

        {errors.fullName && (
          <p className="mt-1 text-xs text-red-500">{errors.fullName.message}</p>
        )}
      </div>

      {/* Alamat email */}
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
          <p className="mt-1 text-[11px] text-gray-400 leading-relaxed">
            Alamat email akan digunakan untuk verifikasi akun.
          </p>
        )}

        {errors.email && (
          <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
        )}
      </div>

      {/* Nomor HP */}
      <div>
        <label className="block text-sm font-medium mb-1">Nomor HP</label>

        <input
          {...register("phoneNumber")}
          type="tel"
          autoComplete="tel"
          placeholder="Contoh: 081234567890"
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-500"
        />

        {!errors.phoneNumber && (
          <p className="mt-1 text-[11px] text-gray-400 leading-relaxed">
            Nomor ini akan dipakai untuk verifikasi OTP WhatsApp.
          </p>
        )}

        {errors.phoneNumber && (
          <p className="mt-1 text-xs text-red-500">{errors.phoneNumber.message}</p>
        )}
      </div>

      {/* Kata Sandi */}
      <div>
        <label className="block text-sm font-medium mb-1">Kata Sandi</label>

        <input
          {...register("password")}
          type="password"
          autoComplete="new-password"
          placeholder="Buat kata sandi yang kuat"
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-500"
        />

        {!errors.password && (
          <p className="mt-1 text-[11px] text-gray-400 leading-relaxed">
            Gunakan minimal 8 karakter.
          </p>
        )}

        {errors.password && (
          <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
        )}
      </div>

      {/* Konfirmasi Kata Sandi */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Konfirmasi Kata Sandi
        </label>

        <input
          {...register("confirmPassword")}
          type="password"
          autoComplete="new-password"
          placeholder="Ulangi kata sandi Anda"
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-500"
        />

        {errors.confirmPassword && (
          <p className="mt-1 text-xs text-red-500">
            {errors.confirmPassword.message}
          </p>
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
        {isSubmitting ? "Memproses..." : "Daftar"}
      </button>
    </form>
  );
}
