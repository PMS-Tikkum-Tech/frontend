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
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <h2 className="text-base font-semibold text-slate-800 mb-6">
        Sumber Penyewa
      </h2>

      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            innerRadius={70}
            outerRadius={100}
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
  );
}
