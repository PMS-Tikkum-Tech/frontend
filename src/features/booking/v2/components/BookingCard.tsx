"use client";

import { ArrowRight, CalendarDays, ShieldCheck, Users } from "lucide-react";
import {
  isBookingV2RoomSelectable,
} from "@/features/booking/shared/adapters/availabilityAdapter";
import type { BookingV2Property } from "@/features/booking/shared/adapters/propertyAdapter";
import type { BookingV2Room } from "@/features/booking/shared/adapters/roomAdapter";
import { formatBookingCurrency } from "@/features/booking/shared/utils/bookingFormatters";
import { formatFilterLabel } from "@/lib/filter-options";
import {
  BOOKING_V2_DURATION_OPTIONS,
  getBookingV2DurationLabel,
  getBookingV2DurationPrice,
  type BookingV2DurationPreset,
} from "@/features/booking/v2/store/bookingV2Store";
import type { BookingV2RoomTypeOption } from "./RoomTypeCard";

export default function BookingCard({
  property,
  rooms,
  roomTypes,
  selectedRoomType,
  selectedRoom,
  checkInDate,
  durationPreset,
  occupants,
  minCheckInDate,
  onCheckInDateChange,
  onDurationChange,
  onOccupantsChange,
  onRoomTypeChange,
  onRoomSelect,
  onContinue,
}: {
  property: BookingV2Property;
  rooms: BookingV2Room[];
  roomTypes: BookingV2RoomTypeOption[];
  selectedRoomType: string;
  selectedRoom: BookingV2Room | null;
  checkInDate: string;
  durationPreset: BookingV2DurationPreset;
  occupants: number;
  minCheckInDate: string;
  onCheckInDateChange: (value: string) => void;
  onDurationChange: (value: BookingV2DurationPreset) => void;
  onOccupantsChange: (value: number) => void;
  onRoomTypeChange: (value: string) => void;
  onRoomSelect: (room: BookingV2Room) => void;
  onContinue: () => void;
}) {
  const selectableRooms = rooms.filter((room) =>
    isBookingV2RoomSelectable(room.status)
  );
  const monthlyPrice =
    selectedRoom?.monthlyPrice || property.priceMin || property.priceMax || 0;
  const baseMonthlyPrice =
    selectedRoom?.baseMonthlyPrice || monthlyPrice;
  const estimatedTotal = getBookingV2DurationPrice(monthlyPrice, durationPreset);
  const hasPromo = Boolean(
    selectedRoom &&
      selectedRoom.hasPromo &&
      baseMonthlyPrice > monthlyPrice
  );

  return (
    <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[var(--shadow-medium)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">Mulai dari</p>
          {hasPromo ? (
            <div className="mt-1 flex flex-col">
              <span className="text-sm text-slate-500 line-through">
                {formatBookingCurrency(baseMonthlyPrice)} / bulan
              </span>
              <p className="text-xl font-semibold text-emerald-700">
                {formatBookingCurrency(monthlyPrice)}
                <span className="text-sm font-normal text-slate-500"> / bulan</span>
              </p>
            </div>
          ) : (
            <p className="mt-1 text-xl font-semibold text-slate-950">
              {property.priceLabel}
              <span className="text-sm font-normal text-slate-500"> / bulan</span>
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          {property.hasPromo ? (
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              Promo aktif
            </span>
          ) : null}
          <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
            {property.availableUnits} tersedia
          </span>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
        <label className="block border-b border-slate-200 px-4 py-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-950">
            <CalendarDays size={13} />
            Mulai tinggal
          </span>
          <input
            type="date"
            min={minCheckInDate}
            value={checkInDate}
            onChange={(event) => onCheckInDateChange(event.target.value)}
            className="mt-1 w-full bg-transparent text-sm outline-none"
          />
        </label>
        <label className="block border-b border-slate-200 px-4 py-3">
          <span className="block text-xs font-semibold text-slate-950">
            Durasi sewa
          </span>
          <select
            value={durationPreset}
            onChange={(event) =>
              onDurationChange(event.target.value as BookingV2DurationPreset)
            }
            className="mt-1 w-full bg-transparent text-sm outline-none"
          >
            {BOOKING_V2_DURATION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-950">
              <Users size={13} />
              Penghuni
            </span>
            <span className="mt-1 block text-sm text-slate-500">
              {occupants} penghuni
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOccupantsChange(Math.max(1, occupants - 1))}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 text-sm font-semibold"
              aria-label="Kurangi penghuni"
            >
              -
            </button>
            <button
              type="button"
              onClick={() => onOccupantsChange(Math.min(2, occupants + 1))}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 text-sm font-semibold"
              aria-label="Tambah penghuni"
            >
              +
            </button>
          </div>
        </div>
        <label className="block border-b border-slate-200 px-4 py-3">
          <span className="block text-xs font-semibold text-slate-950">
            Pilih tipe kamar
          </span>
          <select
            value={selectedRoomType}
            onChange={(event) => onRoomTypeChange(event.target.value)}
            className="mt-1 w-full bg-transparent text-sm outline-none"
          >
            {roomTypes.map((roomType) => (
              <option key={roomType.name} value={roomType.name}>
                {formatFilterLabel(roomType.name)}
              </option>
            ))}
          </select>
        </label>
        <label className="block px-4 py-3">
          <span className="block text-xs font-semibold text-slate-950">
            Pilih nomor kamar
          </span>
          <select
            value={selectedRoom?.id || ""}
            onChange={(event) => {
              const nextRoom = rooms.find(
                (room) => room.id === Number(event.target.value)
              );
              if (nextRoom) {
                onRoomSelect(nextRoom);
              }
            }}
            className="mt-1 w-full bg-transparent text-sm outline-none"
          >
            <option value="">Pilih kamar</option>
            {rooms.map((room) => (
              <option
                key={room.id}
                value={room.id}
                disabled={!isBookingV2RoomSelectable(room.status)}
              >
                {room.roomNumber} - {room.statusLabel}
              </option>
            ))}
          </select>
          {selectableRooms.length === 0 ? (
            <span className="mt-2 block text-xs text-[var(--color-error)]">
              Kamar ini baru saja tidak tersedia. Silakan pilih kamar lainnya.
            </span>
          ) : null}
        </label>
      </div>

      <button
        type="button"
        disabled={!selectedRoom}
        onClick={onContinue}
        className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        Lanjut ke kamar
        <ArrowRight size={16} />
      </button>

      <p className="mt-3 text-center text-xs text-slate-500">
        Data pilihan akan dicek ulang saat kamu lanjut ke pembayaran.
      </p>

      <div className="mt-5 space-y-2 border-t border-slate-200 pt-4 text-sm">
        <PriceRow
          label={`Harga paket (${getBookingV2DurationLabel(durationPreset)})`}
          value={formatBookingCurrency(estimatedTotal)}
        />
        {hasPromo ? (
          <PriceRow
            label="Harga dasar per bulan"
            value={formatBookingCurrency(baseMonthlyPrice)}
          />
        ) : (
          <PriceRow
            label="Harga dasar per bulan"
            value={formatBookingCurrency(monthlyPrice)}
          />
        )}
        <PriceRow label="Deposit" value="Mengikuti pengaturan hunian" />
        <PriceRow label="Biaya admin" value="Mengikuti pengaturan hunian" />
        <div className="flex items-center justify-between pt-2 text-base font-semibold text-slate-950">
          <span>Total paket</span>
          <span>{selectedRoom ? formatBookingCurrency(estimatedTotal) : "-"}</span>
        </div>
      </div>

      <p className="mt-4 inline-flex items-start gap-2 rounded-2xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
        <ShieldCheck size={15} className="mt-0.5 shrink-0 text-[var(--color-primary)]" />
        Status pembayaran akan mengikuti data terbaru yang tersimpan.
      </p>
    </aside>
  );
}

function PriceRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-slate-600">
      <span>{label}</span>
      <span className="font-medium text-slate-900">{value}</span>
    </div>
  );
}
