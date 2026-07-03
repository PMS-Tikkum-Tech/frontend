export const BOOKING_V2_STORAGE_KEY = "kikost_booking_v2_draft";
export const BOOKING_V2_FAVORITES_STORAGE_KEY =
  "kyra.tenant.favorite.property.ids";
const LEGACY_BOOKING_V2_FAVORITES_STORAGE_KEY = "kikost_booking_v2_favorites";

export type BookingV2DurationPreset =
  | "7d"
  | "14d"
  | "21d"
  | "1m"
  | "6m"
  | "12m"
  | "custom";

export type BookingV2Draft = {
  propertyId?: number;
  propertySlug?: string;
  propertyName?: string;
  unitId?: number;
  roomNumber?: string;
  roomType?: string;
  monthlyPrice?: number;
  checkInDate?: string;
  checkOutDate?: string;
  durationPreset?: BookingV2DurationPreset;
  updatedAt?: string;
};

const canUseStorage = () => typeof window !== "undefined" && window.localStorage;

export const loadBookingV2Draft = (): BookingV2Draft | null => {
  if (!canUseStorage()) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(BOOKING_V2_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as BookingV2Draft;
  } catch {
    return null;
  }
};

export const saveBookingV2Draft = (draft: BookingV2Draft) => {
  if (!canUseStorage()) {
    return draft;
  }

  const nextDraft = {
    ...draft,
    updatedAt: new Date().toISOString(),
  };

  window.localStorage.setItem(BOOKING_V2_STORAGE_KEY, JSON.stringify(nextDraft));
  return nextDraft;
};

export const mergeBookingV2Draft = (draft: BookingV2Draft) => {
  const current = loadBookingV2Draft() || {};
  return saveBookingV2Draft({
    ...current,
    ...draft,
  });
};

export const clearBookingV2Draft = () => {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(BOOKING_V2_STORAGE_KEY);
};

export const loadBookingV2FavoriteIds = () => {
  if (!canUseStorage()) {
    return new Set<number>();
  }

  try {
    const currentRaw = window.localStorage.getItem(
      BOOKING_V2_FAVORITES_STORAGE_KEY
    );
    const legacyRaw = window.localStorage.getItem(
      LEGACY_BOOKING_V2_FAVORITES_STORAGE_KEY
    );
    const current = currentRaw ? (JSON.parse(currentRaw) as unknown) : [];
    const legacy = legacyRaw ? (JSON.parse(legacyRaw) as unknown) : [];
    const values = [
      ...(Array.isArray(current) ? current : []),
      ...(Array.isArray(legacy) ? legacy : []),
    ];
    const ids = new Set(
      values.map(Number).filter((id) => Number.isFinite(id) && id > 0)
    );

    if (legacyRaw) {
      window.localStorage.setItem(
        BOOKING_V2_FAVORITES_STORAGE_KEY,
        JSON.stringify(Array.from(ids))
      );
      window.localStorage.removeItem(LEGACY_BOOKING_V2_FAVORITES_STORAGE_KEY);
    }

    return ids;
  } catch {
    return new Set<number>();
  }
};

export const saveBookingV2FavoriteIds = (ids: Set<number>) => {
  if (!canUseStorage()) {
    return;
  }

  // Favorite V2 masih lokal karena API favorite account-level belum menjadi
  // bagian kontrak Booking V2.
  window.localStorage.setItem(
    BOOKING_V2_FAVORITES_STORAGE_KEY,
    JSON.stringify(Array.from(ids))
  );
  window.localStorage.removeItem(LEGACY_BOOKING_V2_FAVORITES_STORAGE_KEY);
};

export const isBookingV2DurationPreset = (
  value?: string | null
): value is BookingV2DurationPreset => {
  return (
    value === "7d" ||
    value === "14d" ||
    value === "21d" ||
    value === "1m" ||
    value === "6m" ||
    value === "12m" ||
    value === "custom"
  );
};

export const getBookingV2DurationLabel = (
  preset?: BookingV2DurationPreset | null
) => {
  if (preset === "7d") {
    return "7 Hari";
  }

  if (preset === "14d") {
    return "14 Hari";
  }

  if (preset === "21d") {
    return "21 Hari";
  }

  if (preset === "1m") {
    return "1 Bulan";
  }

  if (preset === "12m") {
    return "1 Tahun";
  }

  if (preset === "custom") {
    return "Custom";
  }

  return "6 Bulan";
};

export const getBookingV2DurationMonths = (
  preset?: BookingV2DurationPreset | null
) => {
  if (preset === "12m") {
    return 12;
  }

  if (preset === "1m") {
    return 1;
  }

  return 6;
};

export const isBookingV2DailyDuration = (
  preset?: BookingV2DurationPreset | null
) => {
  return preset === "7d" || preset === "14d" || preset === "21d" || preset === "custom";
};
