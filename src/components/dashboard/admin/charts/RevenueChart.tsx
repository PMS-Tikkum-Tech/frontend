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
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-6">
      <h2 className="mb-4 text-base font-semibold text-slate-800 sm:mb-6">
        Pendapatan dan Pengeluaran
      </h2>

      <div className="h-[250px] sm:h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 6, right: 4, left: -22, bottom: 0 }}>
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
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatCompactNumber}
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
    </div>
  );
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("id-ID", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}
