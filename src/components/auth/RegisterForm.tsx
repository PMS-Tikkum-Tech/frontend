"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema } from "@/schemas/register.schema";
import { z } from "zod";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  TENANT_PENDING_APPROVAL_NOTICE_STORAGE_KEY,
} from "@/lib/auth";
import {
  PASSWORD_MIN_LENGTH,
  normalizeTextInput,
  sanitizeEmailInput,
  sanitizePhoneInput,
} from "@/lib/form-validation";
import { normalizePhoneNumber } from "@/lib/phone";
import {
  getTenantEmailVerificationErrorMessage,
  savePendingTenantRegistration,
  startTenantEmailVerification,
} from "@/lib/tenant-email-verification";

type RegisterFormData = z.infer<typeof registerSchema>;

const getErrorMessage = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return "Tidak bisa terhubung ke layanan. Pastikan sistem aktif di port 3001.";
    }

    if (error.response?.status === 404) {
      return "Layanan verifikasi email tidak ditemukan. Periksa konfigurasi sistem.";
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
    mode: "onBlur",
  });

  const fullNameRegistration = register("fullName");
  const emailRegistration = register("email", {
    onChange: (event) => {
      event.target.value = sanitizeEmailInput(event.target.value);
    },
  });
  const phoneRegistration = register("phoneNumber", {
    onChange: (event) => {
      event.target.value = sanitizePhoneInput(event.target.value);
    },
  });
  const passwordRegistration = register("password");
  const confirmPasswordRegistration = register("confirmPassword");

  const onSubmit = async (data: RegisterFormData) => {
    setServerError(null);

    try {
      const normalizedPhone = normalizePhoneNumber(data.phoneNumber);
      const normalizedEmail = data.email.trim().toLowerCase();

      await startTenantEmailVerification(normalizedEmail, data.password);
      savePendingTenantRegistration({
        fullName: normalizeTextInput(data.fullName),
        email: normalizedEmail,
        password: data.password,
        phoneNumber: normalizedPhone,
      });

      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(
          TENANT_PENDING_APPROVAL_NOTICE_STORAGE_KEY
        );
      }

      const nextQuery = new URLSearchParams({
        mode: "verify",
        email: normalizedEmail,
        verification_email_sent: "1",
      });

      router.push(`/auth?${nextQuery.toString()}`);
      router.refresh();
    } catch (error) {
      setServerError(
        axios.isAxiosError(error)
          ? getErrorMessage(error)
          : getTenantEmailVerificationErrorMessage(
              error,
              "Gagal menyiapkan verifikasi email. Silakan coba lagi."
            )
      );
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Nama Lengkap */}
      <div>
        <label className="block text-sm font-medium mb-1">Nama Lengkap</label>

        <input
          {...fullNameRegistration}
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
          {...emailRegistration}
          type="email"
          autoComplete="email"
          inputMode="email"
          maxLength={100}
          placeholder="Masukkan alamat email Anda"
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-500"
        />

        {!errors.email && (
          <p className="mt-1 text-[11px] text-gray-400 leading-relaxed">
            Alamat email ini akan dipakai untuk verifikasi akun kamu.
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
          {...phoneRegistration}
          type="tel"
          autoComplete="tel"
          inputMode="numeric"
          maxLength={16}
          placeholder="Contoh: 081234567890"
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-500"
        />

        {!errors.phoneNumber && (
          <p className="mt-1 text-[11px] text-gray-400 leading-relaxed">
            Nomor ini akan disimpan sebagai kontak utama penyewa.
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
          {...passwordRegistration}
          type="password"
          autoComplete="new-password"
          minLength={PASSWORD_MIN_LENGTH}
          maxLength={100}
          placeholder="Buat kata sandi yang kuat"
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-500"
        />

        {!errors.password && (
          <p className="mt-1 text-[11px] text-gray-400 leading-relaxed">
            Gunakan minimal 8 karakter dengan huruf besar, huruf kecil, dan angka.
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
          {...confirmPasswordRegistration}
          type="password"
          autoComplete="new-password"
          minLength={PASSWORD_MIN_LENGTH}
          maxLength={100}
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
