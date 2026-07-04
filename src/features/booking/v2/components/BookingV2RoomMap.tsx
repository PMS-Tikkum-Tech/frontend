import { DoorOpen } from "lucide-react";
import {
  getBookingV2RoomStatusClass,
  getBookingV2RoomStatusLabel,
  isBookingV2RoomSelectable,
  type BookingV2RoomStatus,
} from "@/features/booking/shared/adapters/availabilityAdapter";
import {
  groupBookingV2Rooms,
  type BookingV2Room,
} from "@/features/booking/shared/adapters/roomAdapter";
import { formatFilterLabel } from "@/lib/filter-options";

type BookingV2RoomMapProps = {
  rooms: BookingV2Room[];
  selectedRoomId?: number | null;
  onSelectRoom: (room: BookingV2Room) => void;
};

const LEGEND: Array<{ status: BookingV2RoomStatus; label: string }> = [
  { status: "available", label: "Tersedia" },
  { status: "selected", label: "Dipilih" },
  { status: "unavailable", label: "Tidak tersedia" },
  { status: "occupied", label: "Terisi" },
  { status: "maintenance", label: "Perawatan" },
];

export default function BookingV2RoomMap({
  rooms,
  selectedRoomId,
  onSelectRoom,
}: BookingV2RoomMapProps) {
  const groupedRooms = groupBookingV2Rooms(rooms);

  if (rooms.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
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
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${getBookingV2RoomStatusClass(item.status)}`}
          >
            <span className="h-2 w-2 rounded-full bg-current" />
            {item.label}
          </span>
        ))}
      </div>

      {groupedRooms.map((group) => (
        <section key={group.name} className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">{group.name}</h2>
              <p className="text-xs text-slate-500">
                Pilih nomor kamar yang tersedia.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {group.rooms.length} kamar
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6">
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
                  className={`min-h-[92px] rounded-lg border p-3 text-left transition disabled:cursor-not-allowed ${getBookingV2RoomStatusClass(visualStatus)}`}
                >
                  <span className="block text-[11px] font-medium opacity-80">
                    {formatFilterLabel(room.roomType)}
                  </span>
                  <span className="mt-1 block text-lg font-semibold leading-tight">
                    {room.roomNumber}
                  </span>
                  <span className="mt-2 block text-[11px] font-medium opacity-80">
                    {isSelected
                      ? getBookingV2RoomStatusLabel("selected")
                      : room.statusLabel}
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
