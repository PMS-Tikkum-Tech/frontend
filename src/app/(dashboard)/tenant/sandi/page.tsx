"use client";

import axios from "axios";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { CheckCircle2, CircleAlert, KeyRound, LockKeyhole, Shield } from "lucide-react";
import {
  CHANGE_PASSWORD_UNAVAILABLE_MESSAGE,
  changePassword,
} from "@/lib/auth";
import {
  PASSWORD_MIN_LENGTH,
  getPasswordValidationMessage,
  isStrongPassword,
} from "@/lib/form-validation";
const TENANT_PASSWORD_MANAGED_BY_BACKEND = true;

const getErrorMessage = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data as
      | { message?: string; errors?: string[] }
      | undefined;
    return (
      payload?.errors?.[0] ||
      payload?.message ||
      error.message ||
      "Gagal memperbarui kata sandi."
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Gagal memperbarui kata sandi.";
};

export default function TenantSandiPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const rules = useMemo(
    () => [
      {
        label: `Minimal ${PASSWORD_MIN_LENGTH} karakter`,
        passed: newPassword.length >= PASSWORD_MIN_LENGTH,
      },
      {
        label: "Berbeda dari kata sandi saat ini",
        passed: Boolean(newPassword) && newPassword !== currentPassword,
      },
      {
        label: "Mengandung huruf besar, huruf kecil, dan angka",
        passed: isStrongPassword(newPassword),
      },
      {
        label: "Konfirmasi kata sandi cocok",
        passed:
          Boolean(newPasswordConfirmation) && newPassword === newPasswordConfirmation,
      },
    ],
    [currentPassword, newPassword, newPasswordConfirmation]
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (TENANT_PASSWORD_MANAGED_BY_BACKEND) {
      setError(CHANGE_PASSWORD_UNAVAILABLE_MESSAGE);
      return;
    }

    if (!currentPassword || !newPassword || !newPasswordConfirmation) {
      setError("Semua kolom kata sandi wajib diisi.");
      return;
    }

    const newPasswordError = getPasswordValidationMessage(newPassword, {
      label: "Kata sandi baru",
      required: true,
    });
    if (newPasswordError) {
      setError(newPasswordError);
      return;
    }

    if (newPassword === currentPassword) {
      setError("Kata sandi baru tidak boleh sama dengan kata sandi saat ini.");
      return;
    }

    if (newPassword !== newPasswordConfirmation) {
      setError("Konfirmasi kata sandi baru tidak cocok.");
      return;
    }

    setIsSubmitting(true);

    try {
      const message = await changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        new_password_confirmation: newPasswordConfirmation,
      });

      setCurrentPassword("");
      setNewPassword("");
      setNewPasswordConfirmation("");
      setSuccessMessage(message || "Kata sandi berhasil diperbarui.");
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-indigo-700 via-blue-700 to-sky-700 p-6 text-white shadow-sm">
        <div className="pointer-events-none absolute -left-10 top-0 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
        <div className="pointer-events-none absolute -right-12 bottom-0 h-44 w-44 rounded-full bg-white/10 blur-3xl" />

        <div className="relative">
          <h1 className="text-3xl font-semibold">Kata Sandi</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/90">
            Lindungi akunmu dengan kata sandi yang kuat dan tidak mudah ditebak.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <StatCard
              icon={<KeyRound size={15} />}
              label="Panjang Minimum"
              value={`${PASSWORD_MIN_LENGTH} Karakter`}
            />
            <StatCard
              icon={<Shield size={15} />}
              label="Validasi Otomatis"
              value="4 Poin Keamanan"
            />
            <StatCard
              icon={<LockKeyhole size={15} />}
              label="Status Enkripsi"
              value="Aktif"
            />
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="space-y-3 rounded-2xl border bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="text-lg font-semibold text-slate-800">Form Perubahan</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {TENANT_PASSWORD_MANAGED_BY_BACKEND ? (
              <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                {CHANGE_PASSWORD_UNAVAILABLE_MESSAGE}
              </div>
            ) : null}

            <InputField
              label="Kata Sandi Saat Ini"
              value={currentPassword}
              onChange={setCurrentPassword}
              placeholder="Masukkan kata sandi saat ini"
              autoComplete="current-password"
              disabled={TENANT_PASSWORD_MANAGED_BY_BACKEND}
            />

            <InputField
              label="Kata Sandi Baru"
              value={newPassword}
              onChange={setNewPassword}
              placeholder={`Minimal ${PASSWORD_MIN_LENGTH} karakter`}
              maxLength={100}
              autoComplete="new-password"
              disabled={TENANT_PASSWORD_MANAGED_BY_BACKEND}
            />

            <InputField
              label="Konfirmasi Kata Sandi Baru"
              value={newPasswordConfirmation}
              onChange={setNewPasswordConfirmation}
              placeholder="Ulangi kata sandi baru"
              autoComplete="new-password"
              disabled={TENANT_PASSWORD_MANAGED_BY_BACKEND}
            />

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {successMessage && (
              <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                {successMessage}
              </div>
            )}

            <button
              type="submit"
              className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting || TENANT_PASSWORD_MANAGED_BY_BACKEND}
            >
              {TENANT_PASSWORD_MANAGED_BY_BACKEND
                ? "Menunggu Dukungan Sistem"
                : isSubmitting
                  ? "Menyimpan..."
                  : "Simpan Kata Sandi Baru"}
            </button>
          </form>
        </article>

        <article className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800">Checklist Keamanan</h2>
          <div className="mt-3 space-y-2">
            {rules.map((rule) => (
              <RuleItem key={rule.label} passed={rule.passed}>
                {rule.label}
              </RuleItem>
            ))}
          </div>

          <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700">
            Tips: hindari memakai tanggal lahir, nama lengkap, atau pola angka
            sederhana.
          </div>
        </article>
      </section>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/30 bg-white/10 px-4 py-3 backdrop-blur-sm">
      <p className="inline-flex items-center gap-2 text-xs text-white/85">
        {icon}
        {label}
      </p>
      <p className="mt-1 text-base font-semibold text-white">{value}</p>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
  autoComplete,
  disabled = false,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoComplete: string;
  disabled?: boolean;
  maxLength?: number;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        type="password"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500"
        placeholder={placeholder}
        autoComplete={autoComplete}
        maxLength={maxLength}
        disabled={disabled}
      />
    </label>
  );
}

function RuleItem({
  passed,
  children,
}: {
  passed: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
        passed
          ? "border-green-200 bg-green-50 text-green-700"
          : "border-slate-200 bg-slate-50 text-slate-600"
      }`}
    >
      {passed ? <CheckCircle2 size={14} /> : <CircleAlert size={14} />}
      {children}
    </div>
  );
}
