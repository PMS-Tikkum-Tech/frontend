import Link from "next/link";
import { Lock } from "lucide-react";

export default function BookingV2Unavailable() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-14">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="mx-auto inline-flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
          <Lock size={18} />
        </p>
        <h1 className="mt-4 text-2xl font-semibold text-slate-900">
          Booking Versi 2 belum aktif
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Gunakan flow booking Versi 1 yang sudah tersedia.
        </p>
        <Link
          href="/booking/v1"
          className="mt-5 inline-flex h-10 items-center justify-center rounded-xl bg-sky-600 px-4 text-sm font-semibold text-white transition hover:bg-sky-700"
        >
          Buka Versi 1
        </Link>
      </div>
    </section>
  );
}
