"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LoaderCircle } from "lucide-react";
import { loadBookingV2Draft } from "@/features/booking/v2/store/bookingV2Store";

export default function BookingV2PaymentAliasPage() {
  const router = useRouter();

  useEffect(() => {
    const draft = loadBookingV2Draft();
    if (draft?.propertySlug) {
      router.replace(`/booking/v2/${draft.propertySlug}/payment`);
      return;
    }

    router.replace("/booking/v2");
  }, [router]);

  return (
    <section className="mx-auto flex max-w-3xl items-center gap-2 px-6 py-14 text-sm text-slate-600">
      <LoaderCircle size={16} className="animate-spin" />
      Mengarahkan ke halaman pembayaran...
    </section>
  );
}
