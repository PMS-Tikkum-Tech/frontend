"use client";

import { ReactNode } from "react";

interface Props {
  title: string;
  value: string | number;
  icon: ReactNode;
}

export default function StatCard({ title, value, icon }: Props) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:shadow-md sm:p-5">
      <div className="flex items-start justify-between gap-3 sm:items-center">
        <div>
          <p className="text-xs font-medium text-slate-500 sm:text-sm">{title}</p>
          <h3 className="mt-1 text-lg font-semibold text-slate-800 sm:text-2xl">
            {value}
          </h3>
        </div>

        {/* Icon */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1E2746]/10 text-[#1E2746] sm:h-11 sm:w-11">
          {icon}
        </div>
      </div>
    </div>
  );
}
