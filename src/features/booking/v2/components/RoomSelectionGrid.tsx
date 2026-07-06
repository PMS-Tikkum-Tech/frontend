"use client";

import { Check, DoorOpen } from "lucide-react";
import {
  getBookingV2RoomStatusLabel,
  isBookingV2RoomSelectable,
  type BookingV2RoomStatus,
} from "@/features/booking/shared/adapters/availabilityAdapter";
import {
  groupBookingV2Rooms,
  type BookingV2Room,
} from "@/features/booking/shared/adapters/roomAdapter";
import { formatFilterLabel } from "@/lib/filter-options";

const LEGEND: Array<{ status: BookingV2RoomStatus; label: string; className: string }> = [
  {
    status: "available",
    label: "Tersedia",
    className: "border-slate-300 bg-white text-slate-700",
  },
  {
    status: "selected",
    label: "Dipilih",
    className: "border-[var(--color-primary)] bg-sky-50 text-sky-800",
  },
  {
    status: "occupied",
    label: "Terisi",
    className: "border-slate-200 bg-slate-100 text-slate-400",
  },
  {
    status: "maintenance",
    label: "Perawatan",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  {
    status: "unavailable",
    label: "Tidak tersedia",
    className: "border-slate-200 bg-slate-50 text-slate-400",
  },
];

const getRoomClassName = (status: BookingV2RoomStatus) => {
  if (status === "selected") {
    return "border-[var(--color-primary)] bg-sky-50 text-sky-950 ring-2 ring-sky-100";
  }

  if (status === "available") {
    return "border-slate-200 bg-white text-slate-900 hover:border-[var(--color-primary)] hover:bg-sky-50";
  }

  if (status === "maintenance") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  if (status === "occupied") {
    return "border-slate-200 bg-slate-100 text-slate-400";
  }

  return "border-slate-200 bg-slate-50 text-slate-400";
};

export default function RoomSelectionGrid({
  rooms,
  selectedRoomId,
  onSelectRoom,
}: {
  rooms: BookingV2Room[];
  selectedRoomId?: number | null;
  onSelectRoom: (room: BookingV2Room) => void;
}) {
  const groupedRooms = groupBookingV2Rooms(rooms);

  if (rooms.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
        <DoorOpen size={22} className="mx-auto text-slate-400" />
        <p className="mt-3 text-sm font-semibold text-slate-800">
          Kamar belum tersedia
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Data kamar akan muncul setelah daftar kamar tersedia.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {LEGEND.map((item) => (
          <span
            key={item.status}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${item.className}`}
          >
            <span className="h-2 w-2 rounded-full bg-current" />
            {item.label}
          </span>
        ))}
      </div>

      {groupedRooms.map((group) => (
        <section key={group.name} className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-950">{group.name}</h3>
              <p className="text-xs text-slate-500">
                Pilih nomor kamar yang tersedia.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {group.rooms.length} kamar
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
            {group.rooms.map((room) => {
              const isSelected = selectedRoomId === room.id;
              const visualStatus: BookingV2RoomStatus = isSelected
                ? "selected"
                : room.status;
              const selectable = isBookingV2RoomSelectable(room.status);

              return (
                <button
                  key={room.id}
                  type="button"
                  disabled={!selectable}
                  onClick={() => onSelectRoom(room)}
                  className={`min-h-[118px] rounded-xl border p-3 text-left transition disabled:cursor-not-allowed ${getRoomClassName(visualStatus)}`}
                >
                  <span className="flex items-start justify-between gap-2">
                    <span>
                      <span className="block text-[11px] font-medium opacity-75">
                        {formatFilterLabel(room.roomType)}
                      </span>
                      <span className="mt-1 block text-lg font-semibold leading-tight">
                        {room.roomNumber}
                      </span>
                    </span>
                    {isSelected ? (
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-primary)] text-white">
                        <Check size={14} />
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-3 block text-[11px] font-medium opacity-80">
                    {isSelected
                      ? getBookingV2RoomStatusLabel("selected")
                      : room.statusLabel}
                  </span>
                  <span className="mt-1 block text-[11px] font-semibold opacity-90">
                    {room.hasPromo ? (
                      <span className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-medium line-through opacity-70">
                          {room.baseMonthlyPriceLabel}
                        </span>
                        <span className="text-[11px] font-semibold text-emerald-300">
                          {room.monthlyPriceLabel}
                        </span>
                      </span>
                    ) : (
                      room.monthlyPriceLabel
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
