"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { PaymentData } from "@/types/dashboard";

interface Props {
  data: PaymentData[];
}

export default function PaymentChart({ data }: Props) {
  const chartMinWidth = Math.max(420, data.length * 100);

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-6">
      <h2 className="mb-1 text-base font-semibold text-slate-800 sm:mb-6">
        Status Pembayaran
      </h2>

      <p className="mb-3 text-xs text-slate-500 sm:hidden">
        Geser grafik untuk melihat semua properti.
      </p>

      <div className="overflow-x-auto pb-1">
      <div className="h-[250px] sm:h-[300px]" style={{ minWidth: chartMinWidth }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barSize={24} margin={{ top: 6, right: 4, left: -22, bottom: 0 }}>
          <CartesianGrid stroke="#E2E8F0" vertical={false} />

          <XAxis
            dataKey="name"
            stroke="#64748B"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value: string) =>
              value.length > 14 ? `${value.slice(0, 12)}…` : value
            }
          />

          <YAxis
            stroke="#64748B"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />

          <Tooltip
            contentStyle={{
              borderRadius: "12px",
              border: "none",
              boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
            }}
          />

          <Bar
            dataKey="sudah"
            fill="#16A34A"
            radius={[6, 6, 0, 0]}
            name="Sudah Dibayar"
          />

          <Bar
            dataKey="menunggu"
            fill="#C7A84A"
            radius={[6, 6, 0, 0]}
            name="Menunggu"
          />

          <Bar
            dataKey="terlambat"
            fill="#DC2626"
            radius={[6, 6, 0, 0]}
            name="Terlambat"
          />
        </BarChart>
      </ResponsiveContainer>
      </div>
      </div>
    </div>
  );
}
