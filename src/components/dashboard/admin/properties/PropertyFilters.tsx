"use client";

import { Filter, RotateCcw, Search } from "lucide-react";
import type { FilterOption } from "@/lib/filter-options";

interface Props {
  search: string;
  setSearch: (value: string) => void;
  status: string;
  setStatus: (value: string) => void;
  statusOptions: FilterOption[];
  resultCount: number;
  totalCount: number;
  onReset: () => void;
}

export default function PropertyFilters({
  search,
  setSearch,
  status,
  setStatus,
  statusOptions,
  resultCount,
  totalCount,
  onReset,
}: Props) {
  const hasActiveFilter = search.trim() !== "" || status !== "";

  return (
    <div className="w-full space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Cari nama atau alamat properti..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm focus:border-blue-400 focus:bg-white focus:outline-none"
          />
        </div>

        <div className="relative min-w-[210px]">
          <Filter
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm focus:border-blue-400 focus:bg-white focus:outline-none"
          >
            <option value="">Semua Status</option>
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={onReset}
          disabled={!hasActiveFilter}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RotateCcw size={14} />
          Atur Ulang
        </button>
      </div>

      <p className="text-xs text-slate-500">
        Menampilkan <span className="font-semibold text-slate-700">{resultCount}</span>{" "}
        dari <span className="font-semibold text-slate-700">{totalCount}</span>{" "}
        properti.
      </p>
    </div>
  );
}
