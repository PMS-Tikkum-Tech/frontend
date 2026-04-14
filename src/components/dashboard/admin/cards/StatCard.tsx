"use client";

import { ReactNode } from "react";

interface Props {
  title: string;
  value: string | number;
  icon: ReactNode;
}

export default function StatCard({ title, value, icon }: Props) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <h3 className="text-2xl font-semibold text-slate-800 mt-1">
            {value}
          </h3>
        </div>

        {/* Icon */}
        <div className="w-11 h-11 flex items-center justify-center rounded-xl bg-[#1E2746]/10 text-[#1E2746]">
          {icon}
        </div>
      </div>
    </div>
  );
}
