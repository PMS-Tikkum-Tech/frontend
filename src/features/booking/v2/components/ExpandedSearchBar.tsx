"use client";

import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  BOOKING_V2_DURATION_OPTIONS,
  type BookingV2DurationPreset,
} from "../store/bookingV2Store";

const LOCATION_SUGGESTIONS = [
  "Kinara Signature Kost",
  "KIKOST Classic",
  "KIKOST Cozy",
  "KIKOST Manunggal",
  "KIKOST Cimanggu",
  "KIKOST Cifor",
];

export default function ExpandedSearchBar({
  open,
  initialLocation,
  initialStartDate,
  initialDuration,
  onClose,
  onSubmit,
}: {
  open: boolean;
  initialLocation: string;
  initialStartDate: string;
  initialDuration: BookingV2DurationPreset;
  onClose: () => void;
  onSubmit: (value: {
    location: string;
    startDate: string;
    duration: BookingV2DurationPreset;
  }) => void;
}) {
  const [location, setLocation] = useState(initialLocation);
  const [startDate, setStartDate] = useState(initialStartDate);
  const [duration, setDuration] = useState<BookingV2DurationPreset>(initialDuration);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[90] bg-black/30 px-3 py-4 sm:px-4 md:pt-24">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit({ location, startDate, duration });
        }}
        className="mx-auto max-w-5xl rounded-[24px] border border-slate-200 bg-white p-3 shadow-[0_24px_80px_rgba(15,23,42,0.2)] sm:p-4 md:rounded-[28px] md:p-5"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-slate-950">
            Mau tinggal di mana?
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup pencarian"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-700"
          >
            <X size={16} />
          </button>
        </div>

        <div className="grid overflow-hidden rounded-[20px] border border-slate-200 md:grid-cols-[minmax(0,1.2fr)_180px_170px_76px]">
          <label className="block border-b border-slate-200 px-4 py-3 md:border-b-0 md:border-r md:px-5 md:py-4">
            <span className="block text-xs font-semibold text-slate-950">Lokasi</span>
            <input
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="Cari kost dekat kampus"
              className="mt-1 w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
              autoFocus
            />
          </label>
          <label className="block border-b border-slate-200 px-4 py-3 md:border-b-0 md:border-r md:px-5 md:py-4">
            <span className="block text-xs font-semibold text-slate-950">
              Mulai tinggal
            </span>
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="mt-1 w-full bg-transparent text-sm outline-none"
            />
          </label>
          <label className="block border-b border-slate-200 px-4 py-3 md:border-b-0 md:border-r md:px-5 md:py-4">
            <span className="block text-xs font-semibold text-slate-950">
              Durasi sewa
            </span>
            <select
              value={duration}
              onChange={(event) =>
                setDuration(event.target.value as BookingV2DurationPreset)
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
          <button
            type="submit"
            className="m-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#3423b8] px-5 text-sm font-semibold text-white transition hover:bg-[#24147d] md:m-2"
          >
            <Search size={16} />
            Cari
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {LOCATION_SUGGESTIONS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setLocation(item)}
              className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-[#8176df] hover:bg-[#f4f2ff] hover:text-[#3423b8]"
            >
              {item}
            </button>
          ))}
        </div>
      </form>
    </div>
  );
}
