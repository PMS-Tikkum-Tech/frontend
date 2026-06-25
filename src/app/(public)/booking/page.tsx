"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ArrowRight, Layers3 } from "lucide-react";
import {
  BOOKING_DEFAULT_VERSION,
  BOOKING_V2_ENABLED,
  SHOW_BOOKING_VERSION_SELECTOR,
  getBookingVersionHref,
} from "@/features/booking/shared/config/bookingFeatureFlags";
import BookingVersionBadge from "@/features/booking/shared/components/BookingVersionBadge";

export default function BookingOptionsPage() {
  const router = useRouter();

  useEffect(() => {
    if (!SHOW_BOOKING_VERSION_SELECTOR) {
      router.replace(getBookingVersionHref(BOOKING_DEFAULT_VERSION));
    }
  }, [router]);

  if (!SHOW_BOOKING_VERSION_SELECTOR) {
    return (
      <section className="mx-auto max-w-3xl px-6 py-14">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-medium text-slate-600">Mengarahkan...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
            <Layers3 size={13} />
            Booking
          </p>
          <h1 className="mt-3 text-2xl font-semibold text-slate-900">
            Pilih versi booking
          </h1>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <BookingVersionBadge version="Versi 1" tone="blue" />
          <h2 className="mt-4 text-lg font-semibold text-slate-900">
            Flow booking existing
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Cari properti, pilih unit dari detail sewa, lalu lanjut ke form
            pembayaran tenant yang sudah berjalan.
          </p>
          <Link
            href="/booking/v1"
            className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-sky-600 px-4 text-sm font-semibold text-white transition hover:bg-sky-700"
          >
            Buka Versi 1
            <ArrowRight size={15} />
          </Link>
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <BookingVersionBadge version="Versi 2" tone="blue" />
          <h2 className="mt-4 text-lg font-semibold text-slate-900">
            Room selection visual
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Pilih properti dan kamar melalui grid visual, lalu teruskan ke flow
            payment tenant existing.
          </p>
          {BOOKING_V2_ENABLED ? (
            <Link
              href="/booking/v2"
              className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Buka Versi 2
              <ArrowRight size={15} />
            </Link>
          ) : (
            <span className="mt-5 inline-flex h-10 items-center rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-400">
              Versi 2 nonaktif
            </span>
          )}
        </article>
      </div>
    </section>
  );
}
