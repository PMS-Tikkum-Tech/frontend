export type BookingV2RoomStatus =
  | "available"
  | "selected"
  | "unavailable"
  | "occupied"
  | "maintenance";

export const mapBackendRoomStatusToBookingV2 = (
  status?: string | null
): Exclude<BookingV2RoomStatus, "selected"> => {
  const normalized = status?.trim().toLowerCase();

  if (!normalized || normalized === "vacant" || normalized === "available") {
    return "available";
  }

  if (normalized === "maintenance" || normalized === "repair") {
    return "maintenance";
  }

  if (normalized === "occupied" || normalized === "full") {
    return "occupied";
  }

  return "unavailable";
};

export const getBookingV2RoomStatusLabel = (status: BookingV2RoomStatus) => {
  if (status === "selected") {
    return "Dipilih";
  }

  if (status === "available") {
    return "Tersedia";
  }

  if (status === "occupied") {
    return "Terisi";
  }

  if (status === "maintenance") {
    return "Maintenance";
  }

  return "Tidak tersedia";
};

export const isBookingV2RoomSelectable = (status: BookingV2RoomStatus) => {
  return status === "available" || status === "selected";
};

export const getBookingV2RoomStatusClass = (status: BookingV2RoomStatus) => {
  if (status === "selected") {
    return "border-emerald-500 bg-emerald-600 text-white shadow-sm";
  }

  if (status === "available") {
    return "border-sky-200 bg-white text-slate-800 hover:border-sky-400 hover:bg-sky-50";
  }

  if (status === "occupied") {
    return "border-slate-200 bg-slate-100 text-slate-400";
  }

  if (status === "maintenance") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-400";
};
