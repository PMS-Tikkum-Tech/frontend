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
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 relative">
      <h2 className="text-base font-semibold text-slate-800 mb-6">
        Tingkat Hunian
      </h2>

      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={data}
            innerRadius={70}
            outerRadius={100}
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
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-2xl font-semibold text-slate-800">
          {data[0]?.value}%
        </span>
        <span className="text-xs text-slate-500">Terisi</span>
      </div>
    </div>
  );
}
