"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, DoorOpen, LoaderCircle } from "lucide-react";
import { BOOKING_V2_ENABLED } from "@/features/booking/shared/config/bookingFeatureFlags";
import {
  findBookingPropertyById,
  findBookingRoomById,
} from "@/features/booking/shared/api/bookingApi";
import { adaptPublicPropertyToBookingV2Property } from "@/features/booking/shared/adapters/propertyAdapter";
import { adaptPublicUnitToBookingV2Room } from "@/features/booking/shared/adapters/roomAdapter";
import { formatBookingCurrency, formatBookingDate } from "@/features/booking/shared/utils/bookingFormatters";
import { parseBookingPropertyId } from "@/features/booking/shared/utils/propertySlug";
import BookingVersionBadge from "@/features/booking/shared/components/BookingVersionBadge";
import BookingV2StepBar from "@/features/booking/v2/components/BookingV2StepBar";
import BookingV2Unavailable from "@/features/booking/v2/components/BookingV2Unavailable";
import {
  getBookingV2DurationLabel,
  getBookingV2DurationPrice,
  loadBookingV2Draft,
  type BookingV2Draft,
} from "@/features/booking/v2/store/bookingV2Store";
import { formatFilterLabel } from "@/lib/filter-options";

export default function BookingV2SummaryPage() {
  const params = useParams<{ propertySlug: string }>();
  const propertySlug = params.propertySlug;
  const propertyId = useMemo(
    () => parseBookingPropertyId(propertySlug),
    [propertySlug]
  );
  const [draft, setDraft] = useState<BookingV2Draft | null>(null);
  const [propertyName, setPropertyName] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [roomType, setRoomType] = useState("");
  const [monthlyPrice, setMonthlyPrice] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!BOOKING_V2_ENABLED) {
      setIsLoading(false);
      return;
    }

    let active = true;
    const storedDraft = loadBookingV2Draft();
    setDraft(storedDraft);

    const loadLatest = async () => {
      if (!storedDraft?.propertyId || !storedDraft.unitId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const [loadedProperty, loadedRoom] = await Promise.all([
          findBookingPropertyById(storedDraft.propertyId),
          findBookingRoomById(storedDraft.propertyId, storedDraft.unitId),
        ]);

        if (!active) {
          return;
        }

        if (loadedProperty) {
          const adaptedProperty = adaptPublicPropertyToBookingV2Property(loadedProperty);
          setPropertyName(adaptedProperty.name);
        } else {
          setPropertyName(storedDraft.propertyName || "");
        }

        if (loadedRoom) {
          const adaptedRoom = adaptPublicUnitToBookingV2Room(loadedRoom, loadedProperty);
          setRoomNumber(adaptedRoom.roomNumber);
          setRoomType(adaptedRoom.roomType);
          setMonthlyPrice(adaptedRoom.monthlyPrice);
        } else {
          setRoomNumber(storedDraft.roomNumber || "");
          setRoomType(storedDraft.roomType || "");
          setMonthlyPrice(storedDraft.monthlyPrice || 0);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadLatest();

    return () => {
      active = false;
    };
  }, []);

  const existingDraftMatchesRoute =
    draft?.propertyId && propertyId && draft.propertyId === propertyId && draft.unitId;
  const estimatedTotal = getBookingV2DurationPrice(
    monthlyPrice || draft?.monthlyPrice || 0,
    draft?.durationPreset
  );

  if (!BOOKING_V2_ENABLED) {
    return <BookingV2Unavailable />;
  }

  return (
    <div className="pb-14">
      <BookingV2StepBar current="Ringkasan" />

      <section className="mx-auto max-w-4xl px-6 py-8">
        <Link
          href={`/booking/v2/${propertySlug}/rooms`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-sky-700"
        >
          <ArrowLeft size={15} />
          Kembali ke kamar
        </Link>

        <div className="mt-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <BookingVersionBadge version="Versi 2" tone="blue" />
          <h1 className="mt-3 text-2xl font-semibold text-slate-900">
            Ringkasan pemesanan
          </h1>

          {isLoading ? (
            <p className="mt-5 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-600">
              <LoaderCircle size={16} className="animate-spin" />
              Memuat ringkasan...
            </p>
          ) : !existingDraftMatchesRoute ? (
            <div className="mt-5 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
              <DoorOpen size={22} className="mx-auto text-slate-400" />
              <p className="mt-3 text-sm font-semibold text-slate-800">
                Pilihan kamar belum disimpan
              </p>
              <Link
                href={`/booking/v2/${propertySlug}/rooms`}
                className="mt-4 inline-flex h-10 items-center justify-center rounded-lg bg-sky-600 px-4 text-sm font-semibold text-white"
              >
                Pilih Kamar
              </Link>
            </div>
          ) : (
            <>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <SummaryBox label="Properti" value={propertyName || draft?.propertyName || "-"} />
                <SummaryBox label="Kamar" value={roomNumber || draft?.roomNumber || "-"} />
                <SummaryBox
                  label="Tipe kamar"
                  value={formatFilterLabel(roomType || draft?.roomType)}
                />
                <SummaryBox
                  label="Tanggal mulai"
                  value={formatBookingDate(draft?.checkInDate)}
                />
                <SummaryBox
                  label="Durasi"
                  value={getBookingV2DurationLabel(draft?.durationPreset)}
                />
                <SummaryBox
                  label="Harga dasar per bulan"
                  value={formatBookingCurrency(monthlyPrice || draft?.monthlyPrice)}
                />
              </div>

              <div className="mt-5 rounded-lg border border-sky-100 bg-sky-50 p-4">
                <p className="inline-flex items-center gap-2 text-xs font-semibold text-sky-700">
                  <CalendarDays size={14} />
                  Estimasi total paket
                </p>
                <p className="mt-1 text-xl font-semibold text-sky-950">
                  {formatBookingCurrency(estimatedTotal || draft?.monthlyPrice)}
                </p>
              </div>

              <Link
                href={`/booking/v2/${propertySlug}/customer`}
                className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-sky-600 px-5 text-sm font-semibold text-white transition hover:bg-sky-700"
              >
                Lanjut Data Penyewa
                <ArrowRight size={15} />
              </Link>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

function SummaryBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}
