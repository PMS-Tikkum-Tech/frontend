"use client";

import { Wallet } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PaymentData } from "@/types/dashboard";
import {
  chartTooltipStyle,
  DashboardChartCard,
  DashboardChartEmpty,
} from "./ChartCard";

interface Props {
  data: PaymentData[];
  periodLabel: string;
}

export default function PaymentChart({ data, periodLabel }: Props) {
  const totals = data.reduce(
    (result, item) => ({
      paid: result.paid + item.sudah,
      waiting: result.waiting + item.menunggu,
      overdue: result.overdue + item.terlambat,
    }),
    { paid: 0, waiting: 0, overdue: 0 },
  );
  const totalInvoices = totals.paid + totals.waiting + totals.overdue;
  const completionRate = totalInvoices > 0 ? Math.round((totals.paid / totalInvoices) * 100) : 0;
  const chartMinWidth = Math.max(520, data.length * 96);

  return (
    <DashboardChartCard
      title="Status Pembayaran"
      description="Komposisi pembayaran per properti untuk memprioritaskan penagihan."
      badge={periodLabel}
      accent="gold"
    >
      <div className="mt-4 grid grid-cols-3 gap-2">
        <PaymentMetric label="Lunas" value={totals.paid} color="text-blue-700" />
        <PaymentMetric label="Menunggu" value={totals.waiting} color="text-amber-700" />
        <PaymentMetric label="Terlambat" value={totals.overdue} color="text-red-700" />
      </div>

      {totalInvoices > 0 ? (
        <>
          <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs">
            <span className="text-slate-500">Tingkat pembayaran selesai</span>
            <span className="font-bold text-[#1E2746]">{completionRate}%</span>
          </div>
          <div className="mt-3 overflow-x-auto pb-1">
            <div className="h-[260px]" style={{ minWidth: chartMinWidth }}>
              <ResponsiveContainer
                width="100%"
                height="100%"
                initialDimension={{ width: chartMinWidth, height: 260 }}
              >
                <BarChart data={data} margin={{ top: 8, right: 8, left: -8 }}>
                  <CartesianGrid stroke="#E2E8F0" strokeDasharray="4 4" vertical={false} />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748B", fontSize: 10 }}
                    tickFormatter={(value: string) =>
                      value.length > 16 ? `${value.slice(0, 14)}…` : value
                    }
                    dy={8}
                  />
                  <YAxis
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748B", fontSize: 10 }}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(30, 39, 70, 0.04)" }}
                    contentStyle={chartTooltipStyle}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }}
                  />
                  <Bar
                    dataKey="sudah"
                    stackId="payment"
                    fill="#2C62A5"
                    name="Lunas"
                    maxBarSize={38}
                  />
                  <Bar
                    dataKey="menunggu"
                    stackId="payment"
                    fill="#C7A84A"
                    name="Menunggu"
                    maxBarSize={38}
                  />
                  <Bar
                    dataKey="terlambat"
                    stackId="payment"
                    fill="#DC2626"
                    name="Terlambat"
                    maxBarSize={38}
                    radius={[7, 7, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      ) : (
        <DashboardChartEmpty
          icon={<Wallet size={28} />}
          title="Belum ada data pembayaran"
          description="Status pembayaran akan ditampilkan setelah tagihan tercatat pada periode ini."
        />
      )}
    </DashboardChartCard>
  );
}

function PaymentMetric({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-center">
      <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1 text-lg font-bold ${color}`}>{value.toLocaleString("id-ID")}</p>
    </div>
  );
}
