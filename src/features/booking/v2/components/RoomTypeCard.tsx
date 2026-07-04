"use client";

import { ArrowRight } from "lucide-react";
import { formatFacilityLabel } from "@/lib/facility-labels";
import { formatFilterLabel } from "@/lib/filter-options";
import SafeBookingImage from "./SafeBookingImage";

export type BookingV2RoomTypeOption = {
  name: string;
  imageUrl: string;
  priceLabel: string;
  availableCount: number;
  facilities: string[];
};

export default function RoomTypeCard({
  option,
  selected,
  onSelect,
}: {
  option: BookingV2RoomTypeOption;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`grid overflow-hidden rounded-2xl border bg-white text-left transition hover:border-slate-950 sm:grid-cols-[140px_minmax(0,1fr)] ${
        selected
          ? "border-[var(--color-primary)] ring-2 ring-sky-100"
          : "border-slate-200"
      }`}
    >
      <span className="relative block aspect-[4/3] bg-slate-100 sm:aspect-auto sm:min-h-[150px]">
        <SafeBookingImage
          src={option.imageUrl}
          alt={option.name}
          sizes="(min-width: 640px) 140px, 100vw"
          className="object-cover"
        />
      </span>
      <span className="block p-4">
        <span className="flex items-start justify-between gap-3">
          <span>
            <span className="block text-sm font-semibold text-slate-950">
              {formatFilterLabel(option.name)}
            </span>
            <span className="mt-1 block text-xs text-slate-500">
              {option.availableCount} kamar tersedia
            </span>
          </span>
          <span className="rounded-full bg-slate-100 p-2 text-slate-700">
            <ArrowRight size={14} />
          </span>
        </span>
        <span className="mt-3 block text-sm text-slate-950">
          <strong>{option.priceLabel}</strong>{" "}
          <span className="font-normal text-slate-500">per bulan</span>
        </span>
        {option.facilities.length > 0 ? (
          <span className="mt-3 flex flex-wrap gap-1.5">
            {option.facilities.slice(0, 3).map((facility) => (
              <span
                key={facility}
                className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600"
              >
                {formatFacilityLabel(facility)}
              </span>
            ))}
          </span>
        ) : null}
      </span>
    </button>
  );
}
