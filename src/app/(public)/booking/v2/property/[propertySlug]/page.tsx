"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  LoaderCircle,
  MapPin,
  Share2,
  X,
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
import { isBookingV2RoomSelectable } from "@/features/booking/shared/adapters/availabilityAdapter";
import BookingVersionBadge from "@/features/booking/shared/components/BookingVersionBadge";
import { formatBookingCurrency, toDateInputValue } from "@/features/booking/shared/utils/bookingFormatters";
import { parseBookingPropertyId } from "@/features/booking/shared/utils/propertySlug";
import AmenitiesGrid from "@/features/booking/v2/components/AmenitiesGrid";
import BookingCard from "@/features/booking/v2/components/BookingCard";
import BookingV2Unavailable from "@/features/booking/v2/components/BookingV2Unavailable";
import FavoriteButton from "@/features/booking/v2/components/FavoriteButton";
import MobileBookingBar from "@/features/booking/v2/components/MobileBookingBar";
import PropertyGallery from "@/features/booking/v2/components/PropertyGallery";
import RoomSelectionGrid from "@/features/booking/v2/components/RoomSelectionGrid";
import RoomTypeCard, {
  type BookingV2RoomTypeOption,
} from "@/features/booking/v2/components/RoomTypeCard";
import VisitRequestModal from "@/components/sewa/VisitRequestModal";
import { useAuth } from "@/context/AuthContext";
import type { BookingV2MapLocation } from "@/features/booking/v2/components/BookingV2PropertyMap";
import {
  isBookingV2DurationPreset,
  getBookingV2DurationPrice,
  loadBookingV2Draft,
  loadBookingV2FavoriteIds,
  mergeBookingV2Draft,
  saveBookingV2FavoriteIds,
  type BookingV2DurationPreset,
} from "@/features/booking/v2/store/bookingV2Store";
import {
  createTenantVisitRequest,
  getApiErrorMessage,
  getTenantProfile,
} from "@/lib/dashboard/tenant.api";
import { formatFilterLabel } from "@/lib/filter-options";
import {
  resolveBackendCoordinate,
  resolveKnownPropertyCoordinate,
} from "@/lib/maps/property-coordinate";

const BookingV2PropertyMap = dynamic(
  () => import("@/features/booking/v2/components/BookingV2PropertyMap"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-slate-100 text-sm text-slate-500">
        Memuat peta...
      </div>
    ),
  }
);

const getTomorrowInput = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return toDateInputValue(tomorrow);
};

const formatMarkerPrice = (value?: number | null) => {
  if (!value || value <= 0) {
    return "Info";
  }

  if (value >= 1_000_000) {
    const jt = value / 1_000_000;
    const decimal = jt % 1 === 0 ? 0 : 1;
    return `Rp${jt.toFixed(decimal).replace(".", ",")}jt`;
  }

  return `Rp${Math.round(value / 1_000)}rb`;
};

const buildRoomTypeOptions = (
  rooms: BookingV2Room[],
  property: BookingV2Property | null
): BookingV2RoomTypeOption[] => {
  const map = new Map<
    string,
    {
      name: string;
      imageUrl: string;
      minPrice: number;
      availableCount: number;
      facilities: Set<string>;
    }
  >();

  rooms.forEach((room) => {
    const key = room.roomType || "Tipe kamar";
    const current = map.get(key);
    const nextFacilities = new Set(current?.facilities || []);
    room.facilities.forEach((facility) => nextFacilities.add(facility));

    map.set(key, {
      name: key,
      imageUrl: current?.imageUrl || room.imageUrl || property?.imageUrl || "/bg-1200.webp",
      minPrice:
        current?.minPrice && current.minPrice > 0
          ? Math.min(current.minPrice, room.monthlyPrice || current.minPrice)
          : room.monthlyPrice || property?.priceMin || property?.priceMax || 0,
      availableCount:
        (current?.availableCount || 0) +
        (isBookingV2RoomSelectable(room.status) ? 1 : 0),
      facilities: nextFacilities,
    });
  });

  return Array.from(map.values()).map((item) => ({
    name: item.name,
    imageUrl: item.imageUrl,
    priceLabel: formatBookingCurrency(item.minPrice),
    availableCount: item.availableCount,
    facilities: Array.from(item.facilities),
  }));
};

export default function BookingV2PropertyDetailPage() {
  const params = useParams<{ propertySlug: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const propertySlug = params.propertySlug;
  const propertyId = useMemo(
    () => parseBookingPropertyId(propertySlug),
    [propertySlug]
  );
  const minCheckInDate = useMemo(() => toDateInputValue(new Date()), []);
  const defaultCheckInDate = useMemo(() => getTomorrowInput(), []);

  const [property, setProperty] = useState<BookingV2Property | null>(null);
  const [rooms, setRooms] = useState<BookingV2Room[]>([]);
  const [selectedRoomType, setSelectedRoomType] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [checkInDate, setCheckInDate] = useState(defaultCheckInDate);
  const [durationPreset, setDurationPreset] =
    useState<BookingV2DurationPreset>("1m");
  const [occupants, setOccupants] = useState(1);
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(() => new Set());
  const [mobileBookingOpen, setMobileBookingOpen] = useState(false);
  const [isVisitModalOpen, setIsVisitModalOpen] = useState(false);
  const [isSubmittingVisit, setIsSubmittingVisit] = useState(false);
  const [visitNotice, setVisitNotice] = useState<{
    variant: "success" | "error";
    message: string;
    actionHref?: string;
    actionLabel?: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFavoriteIds(loadBookingV2FavoriteIds());
  }, []);

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

    const loadDetail = async () => {
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

        const adaptedProperty = adaptPublicPropertyToBookingV2Property(loadedProperty);
        const adaptedRooms = adaptPublicUnitsToBookingV2Rooms(
          roomResponse.data,
          loadedProperty
        );
        const draft = loadBookingV2Draft();

        setProperty(adaptedProperty);
        setRooms(adaptedRooms);

        if (draft?.propertyId === propertyId) {
          setSelectedRoomId(draft.unitId || null);
          setCheckInDate(draft.checkInDate || defaultCheckInDate);
          if (isBookingV2DurationPreset(draft.durationPreset)) {
            setDurationPreset(draft.durationPreset);
          }
          setSelectedRoomType(draft.roomType || "");
        }
      } catch (caughtError) {
        if (!active) {
          return;
        }

        setProperty(null);
        setRooms([]);
        setError(
          getApiErrorMessage(
            caughtError,
            "Kami belum bisa memuat data kamar. Silakan coba lagi."
          )
        );
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadDetail();

    return () => {
      active = false;
    };
  }, [defaultCheckInDate, propertyId]);

  const roomTypeOptions = useMemo(
    () => buildRoomTypeOptions(rooms, property),
    [property, rooms]
  );

  useEffect(() => {
    if (roomTypeOptions.length === 0) {
      return;
    }

    if (
      !selectedRoomType ||
      !roomTypeOptions.some((option) => option.name === selectedRoomType)
    ) {
      setSelectedRoomType(roomTypeOptions[0].name);
    }
  }, [roomTypeOptions, selectedRoomType]);

  const filteredRooms = useMemo(() => {
    if (!selectedRoomType) {
      return rooms;
    }

    return rooms.filter((room) => room.roomType === selectedRoomType);
  }, [rooms, selectedRoomType]);

  const selectedRoom = useMemo(() => {
    return rooms.find((room) => room.id === selectedRoomId) || null;
  }, [rooms, selectedRoomId]);

  const exactCoordinate = useMemo(() => {
    if (!property) {
      return null;
    }

    const knownCoordinate = resolveKnownPropertyCoordinate(
      property.name,
      property.address
    );
    if (knownCoordinate) {
      return knownCoordinate;
    }

    return resolveBackendCoordinate(property.raw.latitude, property.raw.longitude);
  }, [property]);

  const mapLocations = useMemo<BookingV2MapLocation[]>(() => {
    if (!property || !exactCoordinate) {
      return [];
    }

    return [
      {
        id: property.id,
        name: property.name,
        address: property.address,
        lat: exactCoordinate.lat,
        lng: exactCoordinate.lng,
        priceLabel: property.priceLabel,
        markerLabel: formatMarkerPrice(property.priceMin || property.priceMax),
        availabilityLabel: property.availabilityLabel,
        availableUnits: property.availableUnits,
        imageUrl: property.imageUrl,
        propertyTypeLabel: property.propertyTypeLabel,
        href: `/booking/v2/${property.slug}/rooms`,
      },
    ];
  }, [exactCoordinate, property]);

  const handleFavoriteChange = (propertyIdValue: number, isFavorite: boolean) => {
    setFavoriteIds((current) => {
      const next = new Set(current);
      if (isFavorite) {
        next.add(propertyIdValue);
      } else {
        next.delete(propertyIdValue);
      }
      saveBookingV2FavoriteIds(next);
      return next;
    });
  };

  const persistSelection = (room: BookingV2Room | null = selectedRoom) => {
    if (!property || !propertyId || !room) {
      return false;
    }

    mergeBookingV2Draft({
      propertyId,
      propertySlug,
      propertyName: property.name,
      unitId: room.id,
      roomNumber: room.roomNumber,
      roomType: room.roomType,
      monthlyPrice: room.monthlyPrice,
      checkInDate,
      durationPreset,
    });

    return true;
  };

  const handleSelectRoom = (room: BookingV2Room) => {
    setSelectedRoomId(room.id);
    persistSelection(room);
  };

  const handleContinue = () => {
    if (!persistSelection()) {
      return;
    }

    router.push(`/booking/v2/property/${propertySlug}/checkout`);
  };

  const handleOpenVisitRequest = async () => {
    setVisitNotice(null);

    try {
      const profileResponse = await getTenantProfile();
      const profile = profileResponse.data;
      if (!profile.email?.trim() || !profile.phone_number?.toString().trim()) {
        setVisitNotice({
          variant: "error",
          message:
            "Lengkapi email dan nomor HP di profil sebelum mengajukan jadwal survei.",
          actionHref: "/tenant/akun",
          actionLabel: "Lengkapi Profil",
        });
        return;
      }
    } catch {
      // Validasi yang sama tetap dijalankan ketika permintaan dikirim.
    }

    setIsVisitModalOpen(true);
  };

  const handleSubmitVisitRequest = async (payload: {
    preferredDate: string;
    preferredTime: string;
    note: string;
  }) => {
    if (!property) {
      throw new Error("Kost belum tersedia.");
    }

    setIsSubmittingVisit(true);
    setVisitNotice(null);

    try {
      await createTenantVisitRequest({
        property_id: property.id,
        preferred_date: payload.preferredDate,
        preferred_time: payload.preferredTime,
        note: payload.note,
      });
      setVisitNotice({
        variant: "success",
        message:
          "Permintaan jadwal survei berhasil dikirim dan dapat dipantau di Jadwal Kunjungan.",
        actionHref: "/tenant/jadwal-visit",
        actionLabel: "Lihat Jadwal Kunjungan",
      });
      setIsVisitModalOpen(false);
    } catch (submitError) {
      const message = getApiErrorMessage(
        submitError,
        "Gagal mengirim permintaan survei. Silakan coba lagi."
      );
      setVisitNotice({ variant: "error", message });
      throw new Error(message);
    } finally {
      setIsSubmittingVisit(false);
    }
  };

  if (!BOOKING_V2_ENABLED) {
    return <BookingV2Unavailable />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-5 py-12 text-sm text-slate-600">
          <LoaderCircle size={16} className="animate-spin" />
          Memuat detail properti...
        </div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-screen bg-white">
        <main className="mx-auto max-w-4xl px-5 py-10">
          <Link
            href="/booking/v2"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600"
          >
            <ArrowLeft size={15} />
            Kembali ke pencarian
          </Link>
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            <p className="inline-flex items-center gap-2 font-semibold">
              <AlertCircle size={16} />
              Data properti belum bisa dimuat
            </p>
            <p className="mt-2">{error || "Properti tidak ditemukan."}</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-24 text-[var(--color-text-primary)] lg:pb-0">
      <main className="mx-auto max-w-6xl px-5 py-6 md:px-8">
        <nav aria-label="Breadcrumb" className="mb-5 flex items-center gap-2 text-sm">
          <Link href="/booking/v2" className="font-semibold text-slate-600">
            Pemesanan KIKOST
          </Link>
          <ChevronRight size={14} className="text-slate-400" />
          <span className="line-clamp-1 text-slate-500">{property.name}</span>
        </nav>

        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <BookingVersionBadge version="Versi 2" tone="blue" />
            <h1 className="mt-3 text-2xl font-semibold tracking-normal text-slate-950 md:text-3xl">
              {property.name}
            </h1>
            <p className="mt-2 inline-flex items-start gap-2 text-sm text-slate-600">
              <MapPin size={16} className="mt-0.5 shrink-0 text-slate-500" />
              {property.address}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {user?.role === "tenant" ? (
              <button
                type="button"
                onClick={() => void handleOpenVisitRequest()}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-sky-300 bg-sky-50 px-4 text-xs font-semibold text-sky-700 transition hover:bg-sky-100"
              >
                <CalendarDays size={15} />
                Ajukan Survei
              </button>
            ) : !user ? (
              <Link
                href={`/auth?next=${encodeURIComponent(`/booking/v2/property/${propertySlug}`)}`}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-sky-300 bg-sky-50 px-4 text-xs font-semibold text-sky-700 transition hover:bg-sky-100"
              >
                <CalendarDays size={15} />
                Masuk untuk Survei
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() => {
                if (navigator.share) {
                  void navigator.share({
                    title: property.name,
                    url: window.location.href,
                  });
                } else {
                  void navigator.clipboard?.writeText(window.location.href);
                }
              }}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-300 px-4 text-xs font-semibold text-slate-800"
            >
              <Share2 size={15} />
              Bagikan
            </button>
            <FavoriteButton
              propertyId={property.id}
              isFavorite={favoriteIds.has(property.id)}
              onToggle={(nextValue) => handleFavoriteChange(property.id, nextValue)}
              className="relative"
            />
          </div>
        </div>

        {visitNotice ? (
          <div
            className={`mb-5 rounded-xl border px-4 py-3 text-sm ${
              visitNotice.variant === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            <p>{visitNotice.message}</p>
            {visitNotice.actionHref ? (
              <Link
                href={visitNotice.actionHref}
                className="mt-1 inline-flex font-semibold underline underline-offset-2"
              >
                {visitNotice.actionLabel || "Buka"}
              </Link>
            ) : null}
          </div>
        ) : null}

        <PropertyGallery images={property.images} propertyName={property.name} />

        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="min-w-0 space-y-10">
            <section className="border-b border-slate-200 pb-8">
              <h2 className="text-xl font-semibold text-slate-950">
                Tentang kost ini
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <InfoPill label="Tipe" value={property.propertyTypeLabel} />
                <InfoPill label="Status" value={property.availabilityLabel} />
                <InfoPill
                  label="Kamar"
                  value={`${property.availableUnits} dari ${property.totalUnits} tersedia`}
                />
              </div>
              <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-700">
                {property.raw.description?.trim() ||
                  "Deskripsi properti belum tersedia. Gunakan informasi fasilitas, alamat, dan kamar untuk membantu memilih."}
              </p>
            </section>

            <section className="border-b border-slate-200 pb-8">
              <h2 className="text-xl font-semibold text-slate-950">
                Fasilitas yang tersedia
              </h2>
              <div className="mt-5">
                <AmenitiesGrid facilities={property.facilities} />
              </div>
            </section>

            <section className="border-b border-slate-200 pb-8">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-slate-950">
                    Pilih tipe kamar
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Tipe kamar mengikuti data kamar yang diisi admin.
                  </p>
                </div>
              </div>
              <div className="mt-5 grid gap-4">
                {roomTypeOptions.length > 0 ? (
                  roomTypeOptions.map((option) => (
                    <RoomTypeCard
                      key={option.name}
                      option={option}
                      selected={selectedRoomType === option.name}
                      onSelect={() => setSelectedRoomType(option.name)}
                    />
                  ))
                ) : (
                  <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
                    Tipe kamar belum tersedia.
                  </p>
                )}
              </div>
            </section>

            <section className="border-b border-slate-200 pb-8">
              <h2 className="text-xl font-semibold text-slate-950">
                Pilih nomor kamar
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Grid dibuat dari urutan kamar, lantai, dan blok yang tersedia di
                sistem.
              </p>
              <div className="mt-5">
                <RoomSelectionGrid
                  rooms={filteredRooms}
                  selectedRoomId={selectedRoomId}
                  onSelectRoom={handleSelectRoom}
                />
              </div>
            </section>

            <section className="border-b border-slate-200 pb-8">
              <h2 className="text-xl font-semibold text-slate-950">Lokasi</h2>
              <p className="mt-2 text-sm text-slate-600">{property.address}</p>
              {mapLocations.length > 0 ? (
                <div className="mt-5 h-[360px] overflow-hidden rounded-2xl border border-slate-200">
                  <BookingV2PropertyMap
                    locations={mapLocations}
                    selectedId={property.id}
                    onSelect={() => undefined}
                  />
                </div>
              ) : (
                <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
                  Koordinat belum tersedia, jadi peta detail belum ditampilkan.
                </div>
              )}
            </section>

            <section className="pb-8">
              <h2 className="text-xl font-semibold text-slate-950">Aturan kost</h2>
              <p className="mt-4 max-w-3xl whitespace-pre-line text-sm leading-7 text-slate-700">
                {property.raw.rules?.trim() ||
                  "Aturan kost belum tersedia."}
              </p>
            </section>
          </div>

          <div className="hidden lg:sticky lg:top-32 lg:block lg:self-start">
            <BookingCard
        property={property}
        rooms={filteredRooms}
        roomTypes={roomTypeOptions}
                selectedRoomType={selectedRoomType}
                selectedRoom={selectedRoom}
                checkInDate={checkInDate}
                durationPreset={durationPreset}
                occupants={occupants}
                minCheckInDate={minCheckInDate}
                onCheckInDateChange={setCheckInDate}
                onDurationChange={setDurationPreset}
                onOccupantsChange={setOccupants}
                onRoomTypeChange={(value) => {
                  setSelectedRoomType(value);
                  setSelectedRoomId(null);
                }}
                onRoomSelect={handleSelectRoom}
                onContinue={handleContinue}
            />
          </div>
        </div>
      </main>

        <MobileBookingBar
        priceLabel={formatBookingCurrency(
          getBookingV2DurationPrice(
            selectedRoom?.monthlyPrice || property.priceMin || property.priceMax || 0,
            durationPreset
          )
        )}
        selectedRoomLabel={
          selectedRoom
            ? `${selectedRoom.roomNumber} - ${formatFilterLabel(selectedRoom.roomType)}`
            : null
        }
        onOpen={() => setMobileBookingOpen(true)}
      />

      {mobileBookingOpen ? (
        <div className="fixed inset-0 z-[90] bg-black/35 lg:hidden">
          <div className="absolute inset-x-0 bottom-0 max-h-[90vh] overflow-y-auto rounded-t-3xl bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-950">
                Detail pemesanan
              </p>
              <button
                type="button"
                onClick={() => setMobileBookingOpen(false)}
                aria-label="Tutup pemesanan"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-700"
              >
                <X size={16} />
              </button>
            </div>
            <BookingCard
              property={property}
              rooms={filteredRooms}
              roomTypes={roomTypeOptions}
              selectedRoomType={selectedRoomType}
              selectedRoom={selectedRoom}
              checkInDate={checkInDate}
              durationPreset={durationPreset}
              occupants={occupants}
              minCheckInDate={minCheckInDate}
              onCheckInDateChange={setCheckInDate}
              onDurationChange={setDurationPreset}
              onOccupantsChange={setOccupants}
              onRoomTypeChange={(value) => {
                setSelectedRoomType(value);
                setSelectedRoomId(null);
              }}
              onRoomSelect={handleSelectRoom}
              onContinue={handleContinue}
            />
          </div>
        </div>
      ) : null}

      <VisitRequestModal
        isOpen={isVisitModalOpen}
        propertyName={property.name}
        isSubmitting={isSubmittingVisit}
        onClose={() => {
          if (!isSubmittingVisit) {
            setIsVisitModalOpen(false);
          }
        }}
        onSubmit={handleSubmitVisitRequest}
      />
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-950">{value}</p>
    </div>
  );
}
