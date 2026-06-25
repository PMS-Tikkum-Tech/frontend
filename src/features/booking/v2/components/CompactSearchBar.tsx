"use client";

import { Search } from "lucide-react";

export default function CompactSearchBar({
  location,
  startDate,
  durationLabel,
  occupants,
  onOpen,
}: {
  location: string;
  startDate: string;
  durationLabel: string;
  occupants: number;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="mx-auto hidden h-12 min-w-[420px] max-w-2xl items-center overflow-hidden rounded-full border border-[var(--color-border)] bg-white text-left shadow-[var(--shadow-small)] transition hover:shadow-[var(--shadow-medium)] md:flex"
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
      <span className="h-6 w-px bg-slate-200" />
      <span className="flex min-w-[120px] items-center justify-between gap-2 pl-5 pr-2">
        <span>
          <span className="block text-[11px] font-semibold text-slate-900">
            Penghuni
          </span>
          <span className="block text-xs text-[var(--color-text-secondary)]">
            {occupants} orang
          </span>
        </span>
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-white">
          <Search size={16} />
        </span>
      </span>
    </button>
  );
}
