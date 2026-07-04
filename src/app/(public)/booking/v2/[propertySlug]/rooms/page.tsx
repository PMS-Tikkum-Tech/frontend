"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  LoaderCircle,
  Ticket,
} from "lucide-react";
import { BOOKING_V2_ENABLED } from "@/features/booking/shared/config/bookingFeatureFlags";
import {
  adaptPublicPropertyToBookingV2Property,
  type BookingV2Property,
} from "@/features/booking/shared/adapters/propertyAdapter";
import {
  adaptPublicUnitsToBookingV2Rooms,
  type BookingV2Room,
} from "@/features/booking/shared/adapters/roomAdapter";
import {
  fetchBookingPropertyRooms,
  findBookingPropertyById,
} from "@/features/booking/shared/api/bookingApi";
import { formatBookingCurrency, toDateInputValue } from "@/features/booking/shared/utils/bookingFormatters";
import { parseBookingPropertyId } from "@/features/booking/shared/utils/propertySlug";
import BookingVersionBadge from "@/features/booking/shared/components/BookingVersionBadge";
import BookingV2RoomMap from "@/features/booking/v2/components/BookingV2RoomMap";
import BookingV2StepBar from "@/features/booking/v2/components/BookingV2StepBar";
import BookingV2Unavailable from "@/features/booking/v2/components/BookingV2Unavailable";
import SafeBookingImage from "@/features/booking/v2/components/SafeBookingImage";
import {
  getBookingV2DurationLabel,
  isBookingV2DurationPreset,
  loadBookingV2Draft,
  mergeBookingV2Draft,
  type BookingV2DurationPreset,
} from "@/features/booking/v2/store/bookingV2Store";
import { formatFilterLabel } from "@/lib/filter-options";
import { getApiErrorMessage } from "@/lib/dashboard/tenant.api";

const DURATION_OPTIONS: Array<{
  value: BookingV2DurationPreset;
  label: string;
}> = [
  { value: "7d", label: "7 Hari" },
  { value: "14d", label: "14 Hari" },
  { value: "21d", label: "21 Hari" },
  { value: "1m", label: "1 Bulan" },
  { value: "6m", label: "6 Bulan" },
  { value: "12m", label: "1 Tahun" },
  { value: "custom", label: "Custom" },
];

const getTomorrowInput = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return toDateInputValue(tomorrow);
};

export default function BookingV2RoomsPage() {
  const params = useParams<{ propertySlug: string }>();
  const router = useRouter();
  const propertySlug = params.propertySlug;
  const propertyId = useMemo(
    () => parseBookingPropertyId(propertySlug),
    [propertySlug]
  );
  const minCheckInDate = useMemo(() => toDateInputValue(new Date()), []);
  const defaultCheckInDate = useMemo(() => getTomorrowInput(), []);

  const [property, setProperty] = useState<BookingV2Property | null>(null);
  const [rooms, setRooms] = useState<BookingV2Room[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [roomType, setRoomType] = useState("all");
  const [checkInDate, setCheckInDate] = useState(defaultCheckInDate);
  const [checkOutDate, setCheckOutDate] = useState("");
  const [durationPreset, setDurationPreset] =
    useState<BookingV2DurationPreset>("6m");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const draft = loadBookingV2Draft();
    if (!draft || draft.propertyId !== propertyId) {
      return;
    }

    setSelectedRoomId(draft.unitId || null);
    setCheckInDate(draft.checkInDate || defaultCheckInDate);
    setCheckOutDate(draft.checkOutDate || "");
    if (isBookingV2DurationPreset(draft.durationPreset)) {
      setDurationPreset(draft.durationPreset);
    }
  }, [defaultCheckInDate, propertyId]);

  useEffect(() => {
    if (!BOOKING_V2_ENABLED) {
      setIsLoading(false);
      return;
    }

    let active = true;

    if (!propertyId) {
      setError("Data properti tidak valid.");
      setIsLoading(false);
      return () => {
        active = false;
      };
    }

    const loadRooms = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [loadedProperty, roomResponse] = await Promise.all([
          findBookingPropertyById(propertyId),
          fetchBookingPropertyRooms(propertyId, {
            page: 1,
            per_page: 100,
            sort: "price_asc",
          }),
        ]);

        if (!active) {
          return;
        }

        if (!loadedProperty) {
          setProperty(null);
          setRooms([]);
          setError("Data hunian tidak ditemukan.");
          return;
        }

        setProperty(adaptPublicPropertyToBookingV2Property(loadedProperty));
        setRooms(adaptPublicUnitsToBookingV2Rooms(roomResponse.data, loadedProperty));
      } catch (caughtError) {
        if (!active) {
          return;
        }

        setProperty(null);
        setRooms([]);
        setError(
          getApiErrorMessage(
            caughtError,
            "Gagal memuat kamar. Silakan coba lagi."
          )
        );
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadRooms();

    return () => {
      active = false;
    };
  }, [propertyId]);

  const roomTypeOptions = useMemo(() => {
    return Array.from(new Set(rooms.map((room) => room.roomType).filter(Boolean)));
  }, [rooms]);

  const filteredRooms = useMemo(() => {
    if (roomType === "all") {
      return rooms;
    }

    return rooms.filter((room) => room.roomType === roomType);
  }, [roomType, rooms]);

  const selectedRoom = useMemo(() => {
    return rooms.find((room) => room.id === selectedRoomId) || null;
  }, [rooms, selectedRoomId]);

  const handleSelectRoom = (room: BookingV2Room) => {
    if (!property || !propertyId) {
      return;
    }

    setSelectedRoomId(room.id);
    mergeBookingV2Draft({
      propertyId,
      propertySlug,
      propertyName: property.name,
      unitId: room.id,
      roomNumber: room.roomNumber,
      roomType: room.roomType,
      monthlyPrice: room.monthlyPrice,
      checkInDate,
      checkOutDate,
      durationPreset,
    });
  };

  const handleContinue = () => {
    if (!property || !propertyId || !selectedRoom) {
      return;
    }

    mergeBookingV2Draft({
      propertyId,
      propertySlug,
      propertyName: property.name,
      unitId: selectedRoom.id,
      roomNumber: selectedRoom.roomNumber,
      roomType: selectedRoom.roomType,
      monthlyPrice: selectedRoom.monthlyPrice,
      checkInDate,
      checkOutDate,
      durationPreset,
    });
    router.push(`/booking/v2/${propertySlug}/summary`);
  };

  if (!BOOKING_V2_ENABLED) {
    return <BookingV2Unavailable />;
  }

  return (
    <div className="pb-14">
      <BookingV2StepBar current="Kamar" />

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <button
            type="button"
            onClick={() => router.push("/booking/v2")}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-sky-700"
          >
            <ArrowLeft size={15} />
            Kembali ke properti
          </button>

          <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div>
              <BookingVersionBadge version="Versi 2" tone="blue" />
              <h1 className="mt-3 text-2xl font-semibold text-slate-900">
                Pilih kamar
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                {property?.name || "Memuat properti..."}
              </p>
            </div>

            {property ? (
              <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="relative h-32">
                  <SafeBookingImage
                    src={property.imageUrl}
                    alt={property.name}
                    className="object-cover"
                  />
                </div>
                <div className="p-3">
                  <p className="line-clamp-1 text-sm font-semibold text-slate-900">
                    {property.name}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {property.priceLabel}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 md:grid-cols-3">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Tanggal mulai
                </span>
                <input
                  type="date"
                  min={minCheckInDate}
                  value={checkInDate}
                  onChange={(event) => setCheckInDate(event.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-sky-400"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Durasi
                </span>
                <div className="relative">
                  <select
                    value={durationPreset}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      if (isBookingV2DurationPreset(nextValue)) {
                        setDurationPreset(nextValue);
                        if (nextValue !== "custom") {
                          setCheckOutDate("");
                        }
                      }
                    }}
                    className="h-10 w-full appearance-none rounded-lg border border-slate-200 px-3 pr-9 text-sm outline-none focus:border-sky-400"
                  >
                    {DURATION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={15}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Tipe kamar
                </span>
                <div className="relative">
                  <select
                    value={roomType}
                    onChange={(event) => setRoomType(event.target.value)}
                    className="h-10 w-full appearance-none rounded-lg border border-slate-200 px-3 pr-9 text-sm outline-none focus:border-sky-400"
                  >
                    <option value="all">Semua tipe</option>
                    {roomTypeOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={15}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                </div>
              </label>

              {durationPreset === "custom" ? (
                <label className="block md:col-span-3">
                  <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                    Tanggal keluar
                  </span>
                  <input
                    type="date"
                    min={checkInDate || minCheckInDate}
                    value={checkOutDate}
                    onChange={(event) => setCheckOutDate(event.target.value)}
                    className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-sky-400 md:max-w-xs"
                  />
                </label>
              ) : null}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-950 p-3 text-center text-xs font-semibold uppercase tracking-[0.18em] text-white">
            Peta Kamar
          </div>

          {isLoading ? (
            <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
              <LoaderCircle size={16} className="animate-spin" />
              Memuat kamar...
            </div>
          ) : error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
              <p className="inline-flex items-center gap-2 font-semibold">
                <AlertCircle size={16} />
                Daftar kamar belum bisa dimuat
              </p>
              <p className="mt-2">{error}</p>
            </div>
          ) : (
            <BookingV2RoomMap
              rooms={filteredRooms}
              selectedRoomId={selectedRoomId}
              onSelectRoom={handleSelectRoom}
            />
          )}
        </div>

        <aside className="space-y-4">
          <section className="sticky top-24 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Ticket size={16} className="text-sky-700" />
              Ringkasan pilihan
            </p>

            {selectedRoom ? (
              <div className="mt-4 space-y-3 text-sm">
                <SummaryLine label="Kamar" value={selectedRoom.roomNumber} />
                <SummaryLine label="Tipe" value={formatFilterLabel(selectedRoom.roomType)} />
                <SummaryLine label="Durasi" value={getBookingV2DurationLabel(durationPreset)} />
                <SummaryLine label="Mulai" value={checkInDate} />
                <SummaryLine
                  label="Harga"
                  value={formatBookingCurrency(selectedRoom.monthlyPrice)}
                />
                <button
                  type="button"
                  onClick={handleContinue}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-sky-600 text-sm font-semibold text-white transition hover:bg-sky-700"
                >
                  Lanjut Ringkasan
                  <ArrowRight size={15} />
                </button>
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-500">
                Pilih kamar terlebih dahulu untuk melanjutkan.
              </p>
            )}
          </section>
        </aside>
      </section>
    </div>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-right text-xs font-semibold text-slate-800">{value}</span>
    </div>
  );
}
