"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { OccupancyData } from "@/types/dashboard";

interface Props {
  data: OccupancyData[];
}

export default function OccupancyChart({ data }: Props) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-6">
      <h2 className="mb-3 text-base font-semibold text-slate-800 sm:mb-6">
        Tingkat Hunian
      </h2>

      <div className="relative h-[240px] sm:h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            innerRadius="45%"
            outerRadius="65%"
            paddingAngle={3}
            dataKey="value"
          >
            <Cell fill="#1E2746" />
            <Cell fill="#94A3B8" />
          </Pie>
          <Tooltip
            contentStyle={{
              borderRadius: "12px",
              border: "none",
              boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
            }}
          />
          <Legend
            wrapperStyle={{
              fontSize: "12px",
              paddingTop: "12px",
            }}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Center Label */}
      <div className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-[64%] flex-col items-center justify-center">
        <span className="text-2xl font-semibold text-slate-800">
          {data[0]?.value || 0}%
        </span>
        <span className="text-xs text-slate-500">Terisi</span>
      </div>
      </div>
    </div>
  );
}
