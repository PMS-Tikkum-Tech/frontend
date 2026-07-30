"use client";

import type { ReactNode } from "react";

type ChartAccent = "blue" | "gold" | "teal";

const accentClass: Record<ChartAccent, string> = {
  blue: "from-[#1E2746] via-[#2C62A5] to-[#5B8DEF]",
  gold: "from-[#1E2746] via-[#2C62A5] to-[#C7A84A]",
  teal: "from-[#1E2746] via-[#2C62A5] to-[#0F766E]",
};

export const chartTooltipStyle = {
  border: "1px solid #E2E8F0",
  borderRadius: "12px",
  boxShadow: "0 12px 28px rgba(30, 39, 70, 0.12)",
};

export const formatChartCurrency = (value: number) =>
  `Rp ${Number(value || 0).toLocaleString("id-ID")}`;

export const formatCompactChartCurrency = (value: number) =>
  `Rp ${new Intl.NumberFormat("id-ID", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(value || 0))}`;

export function DashboardChartCard({
  title,
  description,
  badge,
  accent = "blue",
  children,
}: {
  title: string;
  description: string;
  badge?: string;
  accent?: ChartAccent;
  children: ReactNode;
}) {
  return (
    <article className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className={`h-1 shrink-0 bg-gradient-to-r ${accentClass[accent]}`} />
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
          </div>
          {badge ? (
            <span className="inline-flex w-fit shrink-0 rounded-full bg-[#1E2746]/[0.07] px-3 py-1.5 text-[11px] font-semibold text-[#1E2746]">
              {badge}
            </span>
          ) : null}
        </div>
        {children}
      </div>
    </article>
  );
}

export function DashboardChartEmpty({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="mt-4 flex min-h-[260px] flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-6 text-center">
      <span className="text-slate-300">{icon}</span>
      <p className="mt-3 text-sm font-medium text-slate-600">{title}</p>
      <p className="mt-1 max-w-sm text-xs leading-5 text-slate-400">
        {description}
      </p>
    </div>
  );
}
