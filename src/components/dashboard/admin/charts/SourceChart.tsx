"use client";

import { PieChart as PieChartIcon } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { SourceData } from "@/types/dashboard";
import {
  chartTooltipStyle,
  DashboardChartCard,
  DashboardChartEmpty,
} from "./ChartCard";

interface Props {
  data: SourceData[];
  periodLabel: string;
}

const COLORS = ["#1E2746", "#2C62A5", "#5B8DEF", "#C7A84A", "#0F766E", "#7C3AED"];

export default function SourceChart({ data, periodLabel }: Props) {
  const sortedData = [...data].sort((first, second) => second.value - first.value);
  const totalPercentage = sortedData.reduce((sum, item) => sum + item.value, 0);
  const leading = sortedData[0] || null;

  return (
    <DashboardChartCard
      title="Komposisi Pendapatan"
      description="Kontribusi sumber pendapatan untuk membaca kualitas revenue mix."
      badge={periodLabel}
    >
      {sortedData.length > 0 && totalPercentage > 0 ? (
        <>
          <div className="mt-4 rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 to-white px-3.5 py-3 text-xs text-slate-600">
            Kontributor utama: {" "}
            <strong className="text-[#1E2746]">{leading.name}</strong>{" "}
            <span className="font-bold text-blue-700">
              ({leading.value.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%)
            </span>
          </div>
          <div className="grid min-h-[280px] items-center gap-4 sm:grid-cols-[minmax(210px,0.9fr)_minmax(220px,1.1fr)]">
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
                    innerRadius="57%"
                    outerRadius="81%"
                    paddingAngle={3}
                    cornerRadius={6}
                    stroke="#FFFFFF"
                    strokeWidth={2}
                  >
                    {sortedData.map((item, index) => (
                      <Cell key={item.name} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => `${value.toLocaleString("id-ID", {
                      maximumFractionDigits: 1,
                    })}%`}
                    contentStyle={chartTooltipStyle}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-[#1E2746]">100%</span>
                <span className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Pendapatan
                </span>
              </div>
            </div>

            <div className="max-h-[240px] space-y-2 overflow-y-auto pr-1">
              {sortedData.map((item, index) => (
                <div
                  key={item.name}
                  className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2 text-xs font-medium text-slate-600">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="truncate">{item.name}</span>
                    </span>
                    <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-[#1E2746] shadow-sm">
                      {item.value.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <DashboardChartEmpty
          icon={<PieChartIcon size={28} />}
          title="Belum ada komposisi pendapatan"
          description="Sumber pendapatan akan ditampilkan setelah transaksi pemasukan tercatat."
        />
      )}
    </DashboardChartCard>
  );
}
