"use client";

import { Filter, RotateCcw, Search } from "lucide-react";
import type { FilterOption } from "@/lib/filter-options";

interface Props {
  search: string;
  setSearch: (value: string) => void;
  status: string;
  setStatus: (value: string) => void;
  statusOptions: FilterOption[];
  sortBy: string;
  setSortBy: (value: string) => void;
  sortOptions: FilterOption[];
  defaultSortBy: string;
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
  sortBy,
  setSortBy,
  sortOptions,
  defaultSortBy,
  resultCount,
  totalCount,
  onReset,
}: Props) {
  const hasActiveFilter =
    search.trim() !== "" || status !== "" || sortBy !== defaultSortBy;

  return (
    <section className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <Filter size={17} className="shrink-0 text-slate-500" />
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-800">
              Filter Properti
            </h2>
            <p className="hidden text-xs text-slate-500 sm:block">
              Saring properti berdasarkan status dan urutan data.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onReset}
          disabled={!hasActiveFilter}
          className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RotateCcw size={14} />
          Atur Ulang
        </button>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-slate-600">
            Pencarian
          </span>
          <span className="relative block">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Cari nama atau alamat properti..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-800 transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:outline-none"
            />
          </span>
        </label>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="min-w-0">
            <span className="mb-1.5 block text-xs font-medium text-slate-600">
              Status
            </span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 focus:border-blue-400 focus:bg-white focus:outline-none"
            >
              <option value="">Semua Status</option>
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="min-w-0">
            <span className="mb-1.5 block text-xs font-medium text-slate-600">
              Urutkan
            </span>
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 focus:border-blue-400 focus:bg-white focus:outline-none"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-3 sm:px-5">
        <p className="text-xs leading-5 text-slate-500">
          Menampilkan{" "}
          <span className="font-semibold text-slate-700">{resultCount}</span>{" "}
          dari <span className="font-semibold text-slate-700">{totalCount}</span>{" "}
          properti.
        </p>
      </div>
    </section>
  );
}
