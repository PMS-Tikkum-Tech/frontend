"use client";

import { TrendingUp } from "lucide-react";
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
import type { RevenueData } from "@/types/dashboard";
import {
  chartTooltipStyle,
  DashboardChartCard,
  DashboardChartEmpty,
  formatChartCurrency,
  formatCompactChartCurrency,
} from "./ChartCard";

interface Props {
  data: RevenueData[];
  periodLabel?: string;
}

export default function RevenueChart({
  data,
  periodLabel = "Periode Aktif",
}: Props) {
  const totals = data.reduce(
    (result, item) => ({
      income: result.income + Number(item.pemasukan || 0),
      expense: result.expense + Number(item.pengeluaran || 0),
    }),
    { income: 0, expense: 0 },
  );
  const net = totals.income - totals.expense;
  const hasData = totals.income > 0 || totals.expense > 0;
  const chartMinWidth = Math.max(560, data.length * 68);

  return (
    <DashboardChartCard
      title="Arus Kas Periode"
      description="Perbandingan pemasukan dan pengeluaran untuk membaca performa bulanan."
      badge={periodLabel}
    >
      <div className="mt-4 grid grid-cols-3 gap-2">
        <Metric label="Masuk" value={formatCompactChartCurrency(totals.income)} tone="blue" />
        <Metric label="Keluar" value={formatCompactChartCurrency(totals.expense)} tone="gold" />
        <Metric
          label="Bersih"
          value={formatCompactChartCurrency(net)}
          tone={net >= 0 ? "green" : "red"}
        />
      </div>

      {hasData ? (
        <div className="mt-4 overflow-x-auto pb-1">
          <div className="h-[270px]" style={{ minWidth: chartMinWidth }}>
            <ResponsiveContainer
              width="100%"
              height="100%"
              initialDimension={{ width: chartMinWidth, height: 270 }}
            >
              <BarChart data={data} barGap={6} margin={{ top: 8, right: 8, left: 0 }}>
                <defs>
                  <linearGradient id="dashboardIncomeBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2C62A5" />
                    <stop offset="100%" stopColor="#5B8DEF" />
                  </linearGradient>
                  <linearGradient id="dashboardExpenseBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#D97706" />
                    <stop offset="100%" stopColor="#FBBF24" />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#E2E8F0" strokeDasharray="4 4" vertical={false} />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#64748B", fontSize: 11 }}
                  dy={8}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#64748B", fontSize: 10 }}
                  tickFormatter={formatCompactChartCurrency}
                  width={68}
                />
                <Tooltip
                  cursor={{ fill: "rgba(30, 39, 70, 0.04)" }}
                  formatter={(value: number) => formatChartCurrency(value)}
                  labelFormatter={(label) => `Periode ${label}`}
                  contentStyle={chartTooltipStyle}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }}
                />
                <Bar
                  dataKey="pemasukan"
                  fill="url(#dashboardIncomeBar)"
                  name="Pemasukan"
                  maxBarSize={28}
                  radius={[7, 7, 2, 2]}
                />
                <Bar
                  dataKey="pengeluaran"
                  fill="url(#dashboardExpenseBar)"
                  name="Pengeluaran"
                  maxBarSize={28}
                  radius={[7, 7, 2, 2]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <DashboardChartEmpty
          icon={<TrendingUp size={28} />}
          title="Belum ada arus kas"
          description="Data akan muncul setelah transaksi pemasukan atau pengeluaran dicatat pada periode ini."
        />
      )}
    </DashboardChartCard>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "blue" | "gold" | "green" | "red";
}) {
  const toneClass = {
    blue: "border-blue-100 bg-blue-50/70 text-[#1E2746]",
    gold: "border-amber-100 bg-amber-50/70 text-amber-800",
    green: "border-emerald-100 bg-emerald-50/70 text-emerald-700",
    red: "border-red-100 bg-red-50/70 text-red-700",
  }[tone];

  return (
    <div className={`min-w-0 rounded-xl border px-2.5 py-2 ${toneClass}`}>
      <p className="text-[9px] font-semibold uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-1 truncate text-xs font-bold sm:text-sm">{value}</p>
    </div>
  );
}
