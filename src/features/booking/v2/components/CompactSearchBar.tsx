"use client";

import { Search } from "lucide-react";

export default function CompactSearchBar({
  location,
  startDate,
  durationLabel,
  onOpen,
}: {
  location: string;
  startDate: string;
  durationLabel: string;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="mx-auto hidden h-12 min-w-[420px] max-w-2xl items-center overflow-hidden rounded-full border border-[#d4d0ff] bg-white text-left shadow-[0_6px_22px_rgba(52,35,184,0.1)] transition hover:border-[#958bea] hover:shadow-[0_10px_28px_rgba(52,35,184,0.16)] md:flex"
    >
      <span className="min-w-0 flex-1 px-5">
        <span className="block text-[11px] font-semibold text-slate-900">Lokasi</span>
        <span className="block truncate text-xs text-[var(--color-text-secondary)]">
          {location || "Cari kost dekat kampus"}
        </span>
      </span>
      <span className="h-6 w-px bg-slate-200" />
      <span className="min-w-0 flex-1 px-5">
        <span className="block text-[11px] font-semibold text-slate-900">
          Mulai tinggal
        </span>
        <span className="block truncate text-xs text-[var(--color-text-secondary)]">
          {startDate || "Tambah tanggal"}
        </span>
      </span>
      <span className="h-6 w-px bg-slate-200" />
      <span className="min-w-0 flex-1 px-5">
        <span className="block text-[11px] font-semibold text-slate-900">Durasi</span>
        <span className="block truncate text-xs text-[var(--color-text-secondary)]">
          {durationLabel}
        </span>
      </span>
      <span className="mr-2 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#3423b8] text-white">
        <Search size={16} />
      </span>
    </button>
  );
}
