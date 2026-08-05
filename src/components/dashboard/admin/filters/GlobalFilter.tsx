"use client";

interface Props {
  value: string;
  onChange: (value: string) => void;
  enableCustom?: boolean;
  customDateFrom?: string;
  customDateTo?: string;
  onCustomDateFromChange?: (value: string) => void;
  onCustomDateToChange?: (value: string) => void;
  customError?: string | null;
}

export default function GlobalFilter({
  value,
  onChange,
  enableCustom = false,
  customDateFrom = "",
  customDateTo = "",
  onCustomDateFromChange,
  onCustomDateToChange,
  customError,
}: Props) {
  const currentYear = new Date().getFullYear();

  return (
    <div className="min-w-0 space-y-2">
      <select
        id="dashboard-period"
        name="dashboard_period"
        aria-label="Periode dasbor"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="
          h-10
          w-full
          min-w-0
          rounded-lg
          border border-slate-300
          bg-white
          px-4
          text-sm font-medium text-slate-700
          transition
          focus:outline-none focus:ring-2 focus:ring-[#1E2746]
        "
      >
        <option value="year">Tahun {currentYear}</option>
        <option value="month">Bulan Ini</option>
        <option value="lastMonth">Bulan Lalu</option>
        <option value="quarter">3 Bulan Terakhir</option>
        <option value="lastYear">Tahun {currentYear - 1}</option>
        {enableCustom && <option value="custom">Custom</option>}
      </select>

      {enableCustom && value === "custom" && (
        <div className="rounded-lg border border-white/30 bg-white/10 p-2.5">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="min-w-0">
              <span className="mb-1 block text-xs font-medium text-white/90">
                Dari tanggal
              </span>
              <input
                id="dashboard-period-from"
                name="dashboard_period_from"
                aria-label="Tanggal mulai periode"
                type="date"
                value={customDateFrom}
                max={customDateTo || undefined}
                onChange={(event) =>
                  onCustomDateFromChange?.(event.target.value)
                }
                className="h-10 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-300"
              />
            </label>
            <label className="min-w-0">
              <span className="mb-1 block text-xs font-medium text-white/90">
                Sampai tanggal
              </span>
              <input
                id="dashboard-period-to"
                name="dashboard_period_to"
                aria-label="Tanggal akhir periode"
                type="date"
                value={customDateTo}
                min={customDateFrom || undefined}
                onChange={(event) => onCustomDateToChange?.(event.target.value)}
                className="h-10 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-300"
              />
            </label>
          </div>
          {customError && (
            <p className="mt-2 text-xs font-medium text-amber-200">
              {customError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
