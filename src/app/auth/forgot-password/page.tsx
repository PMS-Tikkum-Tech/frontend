"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/lib/auth";
import { sanitizeEmailInput } from "@/lib/form-validation";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await requestPasswordReset(sanitizeEmailInput(email));
    } finally {
      setMessage("Jika email terdaftar, instruksi pembuatan kata sandi akan dikirim.");
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-5">
      <section className="w-full max-w-md rounded-3xl bg-white p-7 shadow-xl">
        <h1 className="text-2xl font-semibold text-slate-900">Buat atau atur ulang kata sandi</h1>
        <p className="mt-2 text-sm text-slate-600">Termasuk untuk akun lama yang sebelumnya menggunakan login Google.</p>
        <form className="mt-6 space-y-4" onSubmit={submit}>
          <div>
            <label htmlFor="reset-email" className="mb-1 block text-sm font-medium">Email</label>
            <input id="reset-email" name="email" type="email" autoComplete="email" inputMode="email" maxLength={254} required value={email} onChange={(event) => setEmail(sanitizeEmailInput(event.target.value))} className="w-full rounded-xl border border-slate-300 px-4 py-2.5" />
          </div>
          {message && <p role="status" className="rounded-xl bg-sky-50 p-3 text-sm text-sky-900">{message}</p>}
          <button type="submit" disabled={submitting} className="w-full rounded-xl bg-sky-600 py-2.5 font-semibold text-white disabled:opacity-50">{submitting ? "Mengirim..." : "Kirim instruksi"}</button>
        </form>
        <Link href="/auth" className="mt-5 block text-center text-sm text-sky-700 hover:underline">Kembali ke login</Link>
      </section>
    </main>
  );
}
