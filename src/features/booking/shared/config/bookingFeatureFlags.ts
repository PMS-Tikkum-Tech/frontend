export type BookingVersion = "v1" | "v2";

const readBooleanFlag = (raw: string | undefined, fallback: boolean) => {
  if (raw == null || raw === "") {
    return fallback;
  }

  return raw.toLowerCase() !== "false";
};

const readDefaultVersion = (): BookingVersion => {
  const raw =
    process.env.NEXT_PUBLIC_BOOKING_DEFAULT_VERSION ??
    process.env.VITE_BOOKING_DEFAULT_VERSION;

  return raw === "v2" ? "v2" : "v1";
};

export const BOOKING_V2_ENABLED = readBooleanFlag(
  process.env.NEXT_PUBLIC_BOOKING_V2_ENABLED ??
    process.env.VITE_BOOKING_V2_ENABLED,
  true
);

export const SHOW_BOOKING_VERSION_SELECTOR = readBooleanFlag(
  process.env.NEXT_PUBLIC_SHOW_BOOKING_VERSION_SELECTOR ??
    process.env.VITE_SHOW_BOOKING_VERSION_SELECTOR,
  true
);

export const SHOW_BOOKING_VERSION_BADGE = readBooleanFlag(
  process.env.NEXT_PUBLIC_SHOW_BOOKING_VERSION_BADGE ??
    process.env.VITE_SHOW_BOOKING_VERSION_BADGE,
  true
);

export const BOOKING_DEFAULT_VERSION = readDefaultVersion();

export const getBookingVersionHref = (version: BookingVersion) => {
  if (version === "v2" && BOOKING_V2_ENABLED) {
    return "/booking/v2";
  }

  return "/booking/v1";
};
