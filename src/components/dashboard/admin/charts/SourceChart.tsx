"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface Data {
  name: string;
  value: number;
}

interface Props {
  data: Data[];
}

const COLORS = ["#1E2746", "#C7A84A", "#16A34A", "#94A3B8"];

export default function SourceChart({ data }: Props) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-6">
      <h2 className="mb-3 text-base font-semibold text-slate-800 sm:mb-6">
        Sumber Penyewa
      </h2>

      <div className="h-[250px] sm:h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            innerRadius="42%"
            outerRadius="65%"
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
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
      </div>
    </div>
  );
}
