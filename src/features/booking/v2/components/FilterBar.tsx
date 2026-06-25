"use client";

import type { ReactNode } from "react";
import {
  Armchair,
  Bath,
  Building2,
  Camera,
  Car,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Snowflake,
  Sparkles,
  Wifi,
} from "lucide-react";

export type BookingV2FilterValue =
  | "all"
  | "available"
  | "wifi"
  | "furnished"
  | "ac"
  | "parking_area"
  | "cctv"
  | "lowest_price";

const FILTERS: Array<{
  label: string;
  value: BookingV2FilterValue;
  icon: ReactNode;
}> = [
  { label: "Semua kost", value: "all", icon: <Building2 size={18} /> },
  { label: "Tersedia sekarang", value: "available", icon: <Sparkles size={18} /> },
  { label: "WiFi", value: "wifi", icon: <Wifi size={18} /> },
  { label: "Fully furnished", value: "furnished", icon: <Armchair size={18} /> },
  { label: "AC", value: "ac", icon: <Snowflake size={18} /> },
  { label: "Parkir", value: "parking_area", icon: <Car size={18} /> },
  { label: "CCTV", value: "cctv", icon: <Camera size={18} /> },
  { label: "Harga terendah", value: "lowest_price", icon: <Bath size={18} /> },
];

export default function FilterBar({
  activeFilter,
  onChange,
  onOpenFilter,
}: {
  activeFilter: BookingV2FilterValue;
  onChange: (filter: BookingV2FilterValue) => void;
  onOpenFilter?: () => void;
}) {
  return (
    <div className="sticky top-20 z-40 border-b border-slate-200 bg-white md:top-28">
      <div className="mx-auto flex max-w-[1760px] items-center gap-3 px-5 py-3 md:px-8">
        <button
          type="button"
          aria-label="Filter sebelumnya"
          className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 md:inline-flex"
        >
          <ChevronLeft size={16} />
        </button>

        <div className="flex min-w-0 flex-1 gap-6 overflow-x-auto">
          {FILTERS.map((filter) => {
            const isActive = activeFilter === filter.value;

            return (
              <button
                key={filter.value}
                type="button"
                onClick={() => onChange(filter.value)}
                className={`flex min-w-fit flex-col items-center gap-1 border-b-2 px-1 pb-2 pt-1 text-xs font-semibold transition ${
                  isActive
                    ? "border-slate-950 text-slate-950"
                    : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-950"
                }`}
              >
                {filter.icon}
                {filter.label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          aria-label="Filter berikutnya"
          className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 md:inline-flex"
        >
          <ChevronRight size={16} />
        </button>
        <button
          type="button"
          onClick={onOpenFilter}
          className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-slate-300 px-4 text-xs font-semibold text-slate-900"
        >
          <SlidersHorizontal size={15} />
          Filter
        </button>
      </div>
    </div>
  );
}
