"use client";

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export default function GlobalFilter({ value, onChange }: Props) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="
        h-10
        w-full
        min-w-0
        px-4
        bg-white
        border border-slate-300
        rounded-lg
        text-sm font-medium text-slate-700
        focus:outline-none focus:ring-2 focus:ring-[#1E2746]
        transition
        sm:w-auto
      "
    >
      <option value="year">Tahun Ini</option>
      <option value="month">Bulan Ini</option>
      <option value="quarter">3 Bulan Terakhir</option>
      <option value="lastYear">Tahun Lalu</option>
    </select>
  );
}
