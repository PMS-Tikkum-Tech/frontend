"use client";

import { Home } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { OccupancyData } from "@/types/dashboard";
import {
  chartTooltipStyle,
  DashboardChartCard,
  DashboardChartEmpty,
} from "./ChartCard";

interface Props {
  data: OccupancyData[];
}

const COLORS = ["#2C62A5", "#CBD5E1", "#C7A84A"];

export default function OccupancyChart({ data }: Props) {
  const occupied = data.find((item) => item.name.toLowerCase().includes("terisi"))?.value || 0;
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <DashboardChartCard
      title="Tingkat Hunian"
      description="Snapshot kapasitas unit terisi dan tersedia saat ini."
      badge="Saat ini"
      accent="teal"
    >
      {total > 0 ? (
        <div className="mt-4 grid min-h-[300px] items-center gap-4 sm:grid-cols-[minmax(220px,0.9fr)_minmax(180px,1.1fr)]">
          <div className="relative h-[250px] min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="59%"
                  outerRadius="82%"
                  paddingAngle={3}
                  cornerRadius={7}
                  stroke="#FFFFFF"
                  strokeWidth={2}
                >
                  {data.map((item, index) => (
                    <Cell key={item.name} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => `${value}%`}
                  contentStyle={chartTooltipStyle}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-[#1E2746]">{occupied}%</span>
              <span className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Terisi
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {data.map((item, index) => (
              <div
                key={item.name}
                className="rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-xs font-medium text-slate-600">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    {item.name}
                  </span>
                  <span className="text-sm font-bold text-[#1E2746]">{item.value}%</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, Math.max(0, item.value))}%`,
                      backgroundColor: COLORS[index % COLORS.length],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <DashboardChartEmpty
          icon={<Home size={28} />}
          title="Belum ada data unit"
          description="Tingkat hunian akan tersedia setelah properti dan unit ditambahkan."
        />
      )}
    </DashboardChartCard>
  );
}
