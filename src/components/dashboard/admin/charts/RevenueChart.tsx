"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

interface RevenueData {
  month: string;
  pemasukan: number;
  pengeluaran: number;
}

interface Props {
  data: RevenueData[];
}

export default function RevenueChart({ data }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <h2 className="text-base font-semibold text-slate-800 mb-6">
        Pendapatan dan Pengeluaran
      </h2>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid
            stroke="#E2E8F0"
            strokeDasharray="3 3"
            vertical={false}
          />

          <XAxis
            dataKey="month"
            stroke="#64748B"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />

          <YAxis
            stroke="#64748B"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />

          <Tooltip
            formatter={(value: number) => `Rp ${value.toLocaleString("id-ID")}`}
            contentStyle={{
              borderRadius: "12px",
              border: "none",
              boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
            }}
          />

          <Legend />

          <Line
            type="monotone"
            dataKey="pemasukan"
            stroke="#16A34A"
            strokeWidth={2.5}
            dot={false}
            name="Pendapatan"
          />

          <Line
            type="monotone"
            dataKey="pengeluaran"
            stroke="#DC2626"
            strokeWidth={2.5}
            dot={false}
            name="Pengeluaran"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
