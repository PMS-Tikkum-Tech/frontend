"use client";

import { useEffect, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import {
  ArrowDownNarrowWide,
  ArrowUpNarrowWide,
  Building2,
  ChevronLeft,
  ChevronRight,
  Mars,
  Sparkles,
  Venus,
} from "lucide-react";

export type BookingV2FilterValue =
  | "all"
  | "male"
  | "female"
  | "available"
  | "lowest_price"
  | "highest_price";

const FILTERS: Array<{
  label: string;
  value: BookingV2FilterValue;
  icon: ReactNode;
}> = [
  { label: "Semua kost", value: "all", icon: <Building2 size={18} /> },
  { label: "Kost laki-laki", value: "male", icon: <Mars size={18} /> },
  { label: "Kost perempuan", value: "female", icon: <Venus size={18} /> },
  {
    label: "Harga terendah",
    value: "lowest_price",
    icon: <ArrowDownNarrowWide size={18} />,
  },
  {
    label: "Harga tertinggi",
    value: "highest_price",
    icon: <ArrowUpNarrowWide size={18} />,
  },
  { label: "Tersedia sekarang", value: "available", icon: <Sparkles size={18} /> },
];

export default function FilterBar({
  activeFilter,
  onChange,
}: {
  activeFilter: BookingV2FilterValue;
  onChange: (filter: BookingV2FilterValue) => void;
}) {
  const buttonRefs = useRef<Partial<Record<BookingV2FilterValue, HTMLButtonElement | null>>>(
    {}
  );

  const activeIndex = useMemo(
    () => FILTERS.findIndex((filter) => filter.value === activeFilter),
    [activeFilter]
  );

  const moveFilter = (direction: -1 | 1) => {
    if (activeIndex < 0) {
      return;
    }

    const nextIndex = activeIndex + direction;
    if (nextIndex < 0 || nextIndex >= FILTERS.length) {
      return;
    }

    onChange(FILTERS[nextIndex].value);
  };

  useEffect(() => {
    const activeButton = buttonRefs.current[activeFilter];
    activeButton?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [activeFilter]);

  return (
    <div className="sticky top-16 z-40 border-b border-[#e2dfff] bg-white/95 backdrop-blur sm:top-20 md:top-28">
      <div className="mx-auto flex max-w-[1760px] items-center gap-2 px-3 py-2 sm:px-4 md:gap-3 md:px-8 md:py-3">
        <button
          type="button"
          aria-label="Filter sebelumnya"
          onClick={() => moveFilter(-1)}
          disabled={activeIndex <= 0}
          className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#d4d0ff] bg-white text-[#3423b8] transition hover:bg-[#f4f1ff] disabled:cursor-not-allowed disabled:opacity-40 md:inline-flex"
        >
          <ChevronLeft size={16} />
        </button>

        <div className="min-w-0 flex-1 overflow-x-auto">
          <div className="flex w-max gap-2 md:mx-auto md:gap-6">
            {FILTERS.map((filter) => {
              const isActive = activeFilter === filter.value;

              return (
                <button
                  key={filter.value}
                  type="button"
                  ref={(node) => {
                    buttonRefs.current[filter.value] = node;
                  }}
                  onClick={() => onChange(filter.value)}
                  className={`flex min-w-fit flex-none items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition md:flex-col md:gap-1 md:rounded-none md:border-b-2 md:px-1 md:pb-2 md:pt-1 ${
                    isActive
                      ? "bg-[#eeecff] text-[#3423b8] md:bg-transparent md:border-[#3423b8]"
                      : "bg-white text-slate-500 hover:bg-[#f8f7ff] hover:text-[#3423b8] md:bg-transparent md:border-transparent md:hover:border-[#bcb5ff]"
                  }`}
                >
                  {filter.icon}
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          aria-label="Filter berikutnya"
          onClick={() => moveFilter(1)}
          disabled={activeIndex >= FILTERS.length - 1}
          className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#d4d0ff] bg-white text-[#3423b8] transition hover:bg-[#f4f1ff] disabled:cursor-not-allowed disabled:opacity-40 md:inline-flex"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
