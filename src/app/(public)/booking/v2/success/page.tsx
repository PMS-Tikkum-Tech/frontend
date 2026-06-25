import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import BookingVersionBadge from "@/features/booking/shared/components/BookingVersionBadge";

export default function BookingV2SuccessPage() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-14">
      <div className="rounded-lg border border-emerald-200 bg-white p-8 text-center shadow-sm">
        <CheckCircle2 size={28} className="mx-auto text-emerald-600" />
        <div className="mt-4">
          <BookingVersionBadge version="Versi 2" tone="blue" />
        </div>
        <h1 className="mt-4 text-2xl font-semibold text-slate-900">
          Booking berhasil diproses
        </h1>
        <Link
          href="/tenant/pembayaran"
          className="mt-5 inline-flex h-10 items-center rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white"
        >
          Lihat Status Pembayaran
        </Link>
      </div>
    </section>
  );
}
