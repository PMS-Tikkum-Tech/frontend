"use client";

import { ReactNode } from "react";

interface Props {
  title: string;
  value: string | number;
  icon: ReactNode;
  tone?: "slate" | "blue" | "emerald" | "amber" | "violet";
  valueSize?: "default" | "compact";
}

const toneClassMap: Record<NonNullable<Props["tone"]>, string> = {
  slate: "border-slate-200 bg-slate-50 text-slate-700 ring-slate-100",
  blue: "border-blue-200 bg-blue-50 text-blue-700 ring-blue-100",
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-700 ring-emerald-100",
  amber: "border-amber-200 bg-amber-50 text-amber-700 ring-amber-100",
  violet: "border-violet-200 bg-violet-50 text-violet-700 ring-violet-100",
};

export default function StatCard({
  title,
  value,
  icon,
  tone = "slate",
  valueSize = "default",
}: Props) {
  const valueClassName =
    valueSize === "compact"
      ? "whitespace-nowrap text-lg leading-tight"
      : "text-2xl leading-tight";

  return (
    <div className="min-h-[118px] rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md sm:p-5">
      <div className="flex h-full flex-col justify-between gap-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-medium leading-5 text-slate-500">{title}</p>
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ring-4 ${toneClassMap[tone]}`}
          >
            {icon}
          </div>
        </div>

        <p
          className={`${valueClassName} break-words font-semibold tracking-normal text-slate-900 [overflow-wrap:anywhere] [font-variant-numeric:tabular-nums]`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}
