"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, UserRound } from "lucide-react";
import { BOOKING_V2_ENABLED } from "@/features/booking/shared/config/bookingFeatureFlags";
import { buildExistingPaymentHref } from "@/features/booking/shared/adapters/paymentAdapter";
import BookingVersionBadge from "@/features/booking/shared/components/BookingVersionBadge";
import BookingV2StepBar from "@/features/booking/v2/components/BookingV2StepBar";
import BookingV2Unavailable from "@/features/booking/v2/components/BookingV2Unavailable";
import { loadBookingV2Draft, type BookingV2Draft } from "@/features/booking/v2/store/bookingV2Store";
import { useAuth } from "@/context/AuthContext";

export default function BookingV2CustomerPage() {
  const params = useParams<{ propertySlug: string }>();
  const propertySlug = params.propertySlug;
  const { user } = useAuth();
  const [draft] = useState<BookingV2Draft | null>(() => loadBookingV2Draft());
  const existingPaymentHref = useMemo(() => {
    return buildExistingPaymentHref({
      propertyId: draft?.propertyId,
      unitId: draft?.unitId,
      bookingVersion: "v2",
    });
  }, [draft?.propertyId, draft?.unitId]);

  if (!BOOKING_V2_ENABLED) {
    return <BookingV2Unavailable />;
  }

  const currentHref = `/booking/v2/${propertySlug}/customer`;

  return (
    <div className="pb-14">
      <BookingV2StepBar current="Data" />

      <section className="mx-auto max-w-4xl px-6 py-8">
        <Link
          href={`/booking/v2/${propertySlug}/summary`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-sky-700"
        >
          <ArrowLeft size={15} />
          Kembali ke ringkasan
        </Link>

        <div className="mt-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <BookingVersionBadge version="Versi 2" tone="blue" />
          <h1 className="mt-3 text-2xl font-semibold text-slate-900">
            Data penyewa
          </h1>

          <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
              <UserRound size={16} className="text-sky-700" />
              {user ? user.name : "Masuk sebagai penghuni"}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Data penghuni akan diisi di formulir berikutnya.
            </p>
          </div>

          {!draft?.unitId ? (
            <Link
              href={`/booking/v2/${propertySlug}/rooms`}
              className="mt-5 inline-flex h-10 items-center rounded-lg bg-sky-600 px-4 text-sm font-semibold text-white"
            >
              Pilih Kamar
            </Link>
          ) : !user ? (
            <Link
              href={`/auth?next=${encodeURIComponent(currentHref)}`}
              className="mt-5 inline-flex h-10 items-center rounded-lg bg-sky-600 px-4 text-sm font-semibold text-white"
            >
              Masuk untuk melanjutkan
            </Link>
          ) : user.role !== "tenant" ? (
            <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Pemesanan ini hanya dapat dilanjutkan dengan akun penghuni.
            </div>
          ) : (
            <Link
              href={existingPaymentHref}
              className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-sky-600 px-5 text-sm font-semibold text-white transition hover:bg-sky-700"
            >
              Lanjut ke Pembayaran
              <ArrowRight size={15} />
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
