"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CreditCard } from "lucide-react";
import { BOOKING_V2_ENABLED } from "@/features/booking/shared/config/bookingFeatureFlags";
import { buildExistingPaymentHref } from "@/features/booking/shared/adapters/paymentAdapter";
import BookingVersionBadge from "@/features/booking/shared/components/BookingVersionBadge";
import BookingV2StepBar from "@/features/booking/v2/components/BookingV2StepBar";
import BookingV2Unavailable from "@/features/booking/v2/components/BookingV2Unavailable";
import { loadBookingV2Draft, type BookingV2Draft } from "@/features/booking/v2/store/bookingV2Store";
import { useAuth } from "@/context/AuthContext";

export default function BookingV2PaymentPage() {
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

  return (
    <div className="pb-14">
      <BookingV2StepBar current="Payment" />

      <section className="mx-auto max-w-4xl px-6 py-8">
        <Link
          href={`/booking/v2/${propertySlug}/customer`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-sky-700"
        >
          <ArrowLeft size={15} />
          Kembali ke data
        </Link>

        <div className="mt-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <BookingVersionBadge version="Versi 2" tone="blue" />
          <h1 className="mt-3 text-2xl font-semibold text-slate-900">
            Payment
          </h1>

          <div className="mt-5 rounded-lg border border-sky-100 bg-sky-50 p-4">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-sky-900">
              <CreditCard size={16} />
              Flow payment existing
            </p>
            <p className="mt-2 text-sm text-sky-800">
              Booking akan dilanjutkan ke form pembayaran tenant yang sudah
              terhubung ke endpoint manual rental existing.
            </p>
          </div>

          {!draft?.propertyId || !draft.unitId ? (
            <Link
              href={`/booking/v2/${propertySlug}/rooms`}
              className="mt-5 inline-flex h-10 items-center rounded-lg bg-sky-600 px-4 text-sm font-semibold text-white"
            >
              Pilih Kamar
            </Link>
          ) : !user ? (
            <Link
              href={`/auth?next=${encodeURIComponent(`/booking/v2/${propertySlug}/payment`)}`}
              className="mt-5 inline-flex h-10 items-center rounded-lg bg-sky-600 px-4 text-sm font-semibold text-white"
            >
              Masuk untuk payment
            </Link>
          ) : (
            <Link
              href={existingPaymentHref}
              className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-sky-600 px-5 text-sm font-semibold text-white transition hover:bg-sky-700"
            >
              Buka Form Pembayaran
              <ArrowRight size={15} />
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
