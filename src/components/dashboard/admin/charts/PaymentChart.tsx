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
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <h2 className="text-base font-semibold text-slate-800 mb-6">
        Status Pembayaran
      </h2>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} barSize={28}>
          <CartesianGrid stroke="#E2E8F0" vertical={false} />

          <XAxis
            dataKey="name"
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
  );
}
