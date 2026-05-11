"use client";

import { useState } from "react";
import { getEmailValidationMessage, sanitizeEmailInput } from "@/lib/form-validation";
import {
  getFirebaseAuthErrorMessage,
  sendEmailSignInLink,
} from "@/lib/firebase-email-auth";

const fieldClass =
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 transition focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:bg-slate-50 disabled:text-slate-500";

export default function RegisterForm() {
  const [email, setEmail] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [linkSent, setLinkSent] = useState(false);
  const [sentTo, setSentTo] = useState("");

  const handleRegister = async () => {
    setServerError(null);
    const sanitized = sanitizeEmailInput(email);
    const emailError = getEmailValidationMessage(sanitized, {
      label: "Email",
      required: true,
    });
    if (emailError) {
      setServerError(emailError);
      return;
    }

    setIsSubmitting(true);
    try {
      await sendEmailSignInLink(sanitized);
      setSentTo(sanitized);
      setLinkSent(true);
    } catch (error) {
      setServerError(getFirebaseAuthErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    setServerError(null);
    setIsSubmitting(true);
    try {
      await sendEmailSignInLink(sentTo);
      setServerError(null);
    } catch (error) {
      setServerError(getFirebaseAuthErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (linkSent) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          <p className="font-medium">Cek email Anda</p>
          <p className="mt-1">
            Tautan masuk telah dikirim ke <strong>{sentTo}</strong>. Buka email
            dan klik tautan untuk menyelesaikan pendaftaran.
          </p>
        </div>

        {serverError && (
          <p className="text-center text-sm text-red-600">{serverError}</p>
        )}

        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={handleResend}
            disabled={isSubmitting}
            className="text-sm font-medium text-sky-700 hover:text-sky-800 disabled:opacity-50"
          >
            {isSubmitting ? "Mengirim ulang..." : "Kirim ulang tautan"}
          </button>
          <button
            type="button"
            onClick={() => {
              setLinkSent(false);
              setEmail("");
              setSentTo("");
              setServerError(null);
            }}
            disabled={isSubmitting}
            className="text-sm text-slate-500 hover:text-slate-700 disabled:opacity-50"
          >
            Daftar dengan email lain
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-800">
          Email
        </label>
        <input
          type="email"
          autoComplete="email"
          inputMode="email"
          disabled={isSubmitting}
          value={email}
          onChange={(e) => {
            setEmail(sanitizeEmailInput(e.target.value));
            setServerError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") void handleRegister();
          }}
          placeholder="nama@email.com"
          className={fieldClass}
        />
        <p className="mt-1 text-[11px] text-gray-400">
          Kami akan mengirimkan tautan masuk ke email ini.
        </p>
      </div>

      {serverError && (
        <p className="text-center text-sm text-red-600">{serverError}</p>
      )}

      <button
        type="button"
        onClick={handleRegister}
        disabled={isSubmitting}
        className="w-full rounded-xl bg-sky-600 py-2.5 text-white transition hover:bg-sky-700 disabled:opacity-50"
      >
        {isSubmitting ? "Mengirim tautan..." : "Daftar"}
      </button>
    </div>
  );
}
