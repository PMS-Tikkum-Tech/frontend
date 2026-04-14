"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import axios from "axios";
import { useRouter, useSearchParams } from "next/navigation";
import {
  registerTenant,
  resendTenantRegistrationOtp,
  verifyTenantRegistrationOtp,
} from "@/lib/auth";

const PENDING_TENANT_REGISTRATION_STORAGE_KEY =
  "kyra.pending.tenant.registration";

const verifyOtpSchema = z.object({
  phoneNumber: z
    .string()
    .min(10, "Nomor HP minimal 10 digit")
    .max(20, "Nomor HP terlalu panjang"),
  code: z
    .string()
    .min(6, "Kode verifikasi harus 6 digit")
    .max(6, "Kode verifikasi harus 6 digit"),
});

type VerifyOtpFormData = z.infer<typeof verifyOtpSchema>;

type PendingRegistrationData = {
  fullName: string;
  email: string;
  password: string;
  phoneNumber: string;
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data as
      | { message?: string; errors?: string[] }
      | undefined;

    return payload?.errors?.[0] ?? payload?.message ?? fallback;
  }

  if (error instanceof Error) {
    return error.message || fallback;
  }

  return fallback;
};

export default function VerifyEmailForm({ initialEmail }: { initialEmail?: string }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [pendingRegistration, setPendingRegistration] =
    useState<PendingRegistrationData | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultPhone = searchParams.get("phone") || "";
  const debugCode = searchParams.get("debug_code");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const raw = window.sessionStorage.getItem(
        PENDING_TENANT_REGISTRATION_STORAGE_KEY
      );

      if (!raw) {
        setPendingRegistration(null);
        return;
      }

      const parsed = JSON.parse(raw) as PendingRegistrationData;
      setPendingRegistration(parsed);
    } catch {
      setPendingRegistration(null);
    }
  }, []);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<VerifyOtpFormData>({
    resolver: zodResolver(verifyOtpSchema),
    defaultValues: {
      phoneNumber: defaultPhone,
      code: "",
    },
  });

  const onSubmit = async (data: VerifyOtpFormData) => {
    setServerError(null);
    setInfoMessage(null);

    if (!pendingRegistration) {
      setServerError(
        "Data pendaftaran tidak ditemukan. Silakan isi form daftar kembali."
      );
      return;
    }

    const normalizedPhone = data.phoneNumber.trim();
    if (pendingRegistration.phoneNumber !== normalizedPhone) {
      setServerError(
        "Nomor HP tidak sesuai dengan data pendaftaran. Silakan daftar ulang."
      );
      return;
    }

    try {
      const verifyResult = await verifyTenantRegistrationOtp({
        phoneNumber: normalizedPhone,
        code: data.code,
      });

      await registerTenant({
        full_name: pendingRegistration.fullName,
        email: pendingRegistration.email,
        password: pendingRegistration.password,
        phone_number: verifyResult.phoneNumber,
        phone_verification_token: verifyResult.phoneVerificationToken,
      });

      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(PENDING_TENANT_REGISTRATION_STORAGE_KEY);
      }

      const nextQuery = new URLSearchParams({
        mode: "login",
        registered: "1",
        email: pendingRegistration.email,
      });

      router.push(`/auth?${nextQuery.toString()}`);
      router.refresh();
    } catch (error) {
      setServerError(
        getErrorMessage(error, "Verifikasi OTP gagal. Silakan coba lagi.")
      );
    }
  };

  const handleResendCode = async () => {
    const phone = getValues("phoneNumber")?.trim();
    if (!phone) {
      setServerError("Masukkan nomor HP terlebih dahulu.");
      return;
    }

    setIsResending(true);
    setServerError(null);
    setInfoMessage(null);

    try {
      const resendResult = await resendTenantRegistrationOtp(phone);
      const extraCode = resendResult.debugCode
        ? ` Kode OTP (dev): ${resendResult.debugCode}`
        : "";
      setInfoMessage(`Kode OTP baru telah dikirim.${extraCode}`);
    } catch (error) {
      setServerError(getErrorMessage(error, "Gagal mengirim ulang kode OTP."));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-1">Nomor HP</label>

        <input
          {...register("phoneNumber")}
          type="tel"
          autoComplete="tel"
          placeholder="Contoh: +6281234567890"
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-500"
        />

        {errors.phoneNumber && (
          <p className="mt-1 text-xs text-red-500">{errors.phoneNumber.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Kode OTP</label>

        <input
          {...register("code")}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="Contoh: 123456"
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-500"
        />

        {!errors.code && (
          <p className="mt-1 text-[11px] text-gray-400">
            Masukkan 6 digit kode OTP dari WhatsApp.
          </p>
        )}

        {errors.code && (
          <p className="mt-1 text-xs text-red-500">{errors.code.message}</p>
        )}
      </div>

      {debugCode && (
        <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-700">
          Kode OTP (dev): {debugCode}
        </div>
      )}

      {initialEmail && (
        <p className="text-xs text-slate-500">Email pendaftaran: {initialEmail}</p>
      )}

      {serverError && (
        <p className="text-sm text-red-600 text-center">{serverError}</p>
      )}

      {infoMessage && (
        <p className="text-sm text-green-700 text-center">{infoMessage}</p>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-sky-600 py-2.5 text-white transition hover:bg-sky-700 disabled:opacity-50"
        >
          {isSubmitting ? "Memverifikasi..." : "Verifikasi OTP"}
        </button>

        <button
          type="button"
          onClick={handleResendCode}
          disabled={isResending}
          className="w-full border border-slate-300 text-slate-700 py-2 rounded-lg transition hover:bg-slate-50 disabled:opacity-50"
        >
          {isResending ? "Mengirim..." : "Kirim Ulang OTP"}
        </button>
      </div>
    </form>
  );
}
