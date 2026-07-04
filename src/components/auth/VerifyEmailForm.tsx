"use client";

import Link from "next/link";

export default function VerifyEmailForm({
  initialEmail,
}: {
  initialEmail?: string;
}) {
  void initialEmail;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
        <p className="font-medium">Metode pendaftaran telah diperbarui</p>
        <p className="mt-2 leading-6">
          Alur verifikasi email tidak lagi digunakan. Pendaftaran akun kini
          dilakukan langsung melalui formulir dengan verifikasi nomor HP via SMS.
        </p>
      </div>

      <Link
        href="/auth?mode=register"
        className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-sky-600 px-4 text-sm font-semibold text-white transition hover:bg-sky-700"
      >
        Kembali ke Formulir Daftar
      </Link>
    </div>
  );
}
