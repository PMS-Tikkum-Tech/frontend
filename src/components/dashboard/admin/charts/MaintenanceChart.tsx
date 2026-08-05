"use client";

import { Wrench } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { MaintenanceData } from "@/types/dashboard";
import {
  chartTooltipStyle,
  DashboardChartCard,
  DashboardChartEmpty,
} from "./ChartCard";

interface Props {
  data: MaintenanceData[];
  periodLabel: string;
}

const COLORS = ["#1E2746", "#2C62A5", "#C7A84A", "#DC2626", "#0F766E", "#7C3AED"];

export default function MaintenanceChart({ data, periodLabel }: Props) {
  const sortedData = [...data].sort((first, second) => second.value - first.value);
  const total = sortedData.reduce((sum, item) => sum + item.value, 0);
  const leading = sortedData[0] || null;

  return (
    <DashboardChartCard
      title="Distribusi Perawatan"
      description="Sebaran tiket berdasarkan kategori untuk menentukan prioritas operasional."
      badge={periodLabel}
      accent="gold"
    >
      {total > 0 ? (
        <>
          <div className="mt-4 flex items-center justify-between rounded-xl border border-amber-100 bg-amber-50/60 px-3.5 py-3 text-xs">
            <span className="text-slate-600">
              Kategori terbanyak: <strong className="text-[#1E2746]">{formatLabel(leading.name)}</strong>
            </span>
            <span className="shrink-0 font-bold text-amber-700">{leading.value} tiket</span>
          </div>
          <div className="grid min-h-[280px] items-center gap-4 sm:grid-cols-[minmax(210px,0.9fr)_minmax(200px,1.1fr)]">
            <div className="relative h-[240px] min-w-0">
              <ResponsiveContainer
                width="100%"
                height="100%"
                initialDimension={{ width: 240, height: 240 }}
              >
                <PieChart>
                  <Pie
                    data={sortedData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="55%"
                    outerRadius="80%"
                    paddingAngle={3}
                    cornerRadius={6}
                    stroke="#FFFFFF"
                    strokeWidth={2}
                  >
                    {sortedData.map((item, index) => (
                      <Cell key={item.name} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={chartTooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-[#1E2746]">{total}</span>
                <span className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Total Tiket
                </span>
              </div>
            </div>

            <div className="max-h-[240px] space-y-2 overflow-y-auto pr-1">
              {sortedData.map((item, index) => {
                const percentage = total > 0 ? (item.value / total) * 100 : 0;
                return (
                  <div key={item.name} className="rounded-xl border border-slate-200 px-3 py-2.5">
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="flex min-w-0 items-center gap-2 font-medium text-slate-600">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="truncate">{formatLabel(item.name)}</span>
                      </span>
                      <span className="shrink-0 font-bold text-[#1E2746]">{item.value}</span>
                    </div>
                    <p className="mt-1 pl-4 text-[10px] text-slate-400">
                      {percentage.toLocaleString("id-ID", { maximumFractionDigits: 1 })}% dari tiket
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        <DashboardChartEmpty
          icon={<Wrench size={28} />}
          title="Tidak ada tiket perawatan"
          description="Belum ada laporan perawatan yang tercatat pada periode ini."
        />
      )}
    </DashboardChartCard>
  );
}

function formatLabel(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
