"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { resetPassword } from "@/lib/auth";

export default function ResetPasswordPage() {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    setToken(fragment.get("token") ?? "");
    window.history.replaceState(null, "", window.location.pathname);
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!token) {
      setError("Tautan pembuatan kata sandi tidak valid atau telah kedaluwarsa.");
      return;
    }
    if (password.length < 12 || new TextEncoder().encode(password).length > 72) {
      setError("Kata sandi minimal 12 karakter dan maksimal 72 byte.");
      return;
    }
    if (password !== confirmation) {
      setError("Konfirmasi kata sandi tidak cocok.");
      return;
    }
    setSubmitting(true);
    try {
      setMessage(await resetPassword({ token, password, passwordConfirmation: confirmation }));
      setToken("");
      setPassword("");
      setConfirmation("");
    } catch (requestError) {
      const payload = axios.isAxiosError(requestError)
        ? requestError.response?.data as { errors?: string[] } | undefined
        : undefined;
      setError(payload?.errors?.[0] ?? "Tautan pembuatan kata sandi tidak valid atau telah kedaluwarsa.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-5">
      <section className="w-full max-w-md rounded-3xl bg-white p-7 shadow-xl">
        <h1 className="text-2xl font-semibold text-slate-900">Kata sandi baru</h1>
        {message ? (
          <div className="mt-5 space-y-4">
            <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">{message}</p>
            <Link href="/auth" className="block text-center text-sm font-medium text-sky-700 hover:underline">Masuk sekarang</Link>
          </div>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={submit}>
            <div>
              <label htmlFor="new-password" className="mb-1 block text-sm font-medium">Kata sandi</label>
              <input id="new-password" name="password" type="password" autoComplete="new-password" minLength={12} maxLength={72} required value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-2.5" />
            </div>
            <div>
              <label htmlFor="new-password-confirmation" className="mb-1 block text-sm font-medium">Konfirmasi kata sandi</label>
              <input id="new-password-confirmation" name="password_confirmation" type="password" autoComplete="new-password" minLength={12} maxLength={72} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-2.5" />
            </div>
            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={submitting} className="w-full rounded-xl bg-sky-600 py-2.5 font-semibold text-white disabled:opacity-50">{submitting ? "Menyimpan..." : "Simpan kata sandi"}</button>
          </form>
        )}
      </section>
    </main>
  );
}
