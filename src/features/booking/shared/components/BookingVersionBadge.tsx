import { SHOW_BOOKING_VERSION_BADGE } from "../config/bookingFeatureFlags";

type BookingVersionBadgeProps = {
  version: string;
  tone?: "light" | "dark" | "blue";
};

export default function BookingVersionBadge({
  version,
  tone = "blue",
}: BookingVersionBadgeProps) {
  if (!SHOW_BOOKING_VERSION_BADGE) {
    return null;
  }

  if (version === "Versi 2") {
    return null;
  }

  const className =
    tone === "dark"
      ? "border-white/40 bg-black/35 text-white"
      : tone === "light"
        ? "border-slate-200 bg-white text-slate-700"
        : "border-sky-200 bg-sky-50 text-sky-700";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${className}`}
    >
      {version}
    </span>
  );
}
