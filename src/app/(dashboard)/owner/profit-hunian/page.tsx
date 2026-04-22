"use client";

import { useState } from "react";
import {
  ArrowDown,
  CalendarClock,
  Home,
  RotateCcw,
  TrendingUp,
  Wallet,
} from "lucide-react";
import RevenueChart from "@/components/dashboard/admin/charts/RevenueChart";
import OccupancyChart from "@/components/dashboard/admin/charts/OccupancyChart";
import GlobalFilter from "@/components/dashboard/admin/filters/GlobalFilter";
import useOwnerDashboard from "@/hooks/useOwnerDashboard";

const formatCurrency = (value: number) =>
  `Rp ${Number(value || 0).toLocaleString("id-ID")}`;

export default function OwnerProfitHunianPage() {
  const [period, setPeriod] = useState("year");
  const { data, isLoading, error, refresh } = useOwnerDashboard(period);

  const safeRevenueData =
    data.revenueData.length > 0
      ? data.revenueData
      : [{ month: "Belum Ada Data", pemasukan: 0, pengeluaran: 0 }];

  const profitMargin =
    data.stats.totalRevenue > 0
      ? (data.stats.netProfit / data.stats.totalRevenue) * 100
      : 0;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-r from-[#1E2746] to-[#2A3B78] p-5 text-white shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-blue-100">
              Modul Pemilik
            </p>
            <h1 className="text-2xl font-semibold">Laba & Hunian</h1>
            <p className="text-sm text-blue-100">
              Ringkasan ini berasal dari data arus kas dan pemesanan pemilik di sistem.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <GlobalFilter value={period} onChange={setPeriod} />
            <button
              type="button"
              onClick={refresh}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-white px-3 text-sm font-semibold text-[#1E2746] hover:bg-slate-100"
            >
              <RotateCcw size={14} />
              Muat Ulang
            </button>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
        <SummaryCard
          title="Pendapatan"
          value={formatCurrency(data.stats.totalRevenue)}
          subtitle="Total kas masuk"
          icon={<TrendingUp size={18} />}
          tone="success"
        />
        <SummaryCard
          title="Pengeluaran"
          value={formatCurrency(data.stats.totalExpense)}
          subtitle="Total kas keluar"
          icon={<ArrowDown size={18} />}
          tone="danger"
        />
        <SummaryCard
          title="Laba Bersih"
          value={formatCurrency(data.stats.netProfit)}
          subtitle={`Margin ${profitMargin.toLocaleString("id-ID", {
            maximumFractionDigits: 1,
          })}%`}
          icon={<Wallet size={18} />}
          tone={data.stats.netProfit >= 0 ? "success" : "danger"}
        />
        <SummaryCard
          title="Total Pemesanan"
          value={String(data.stats.totalBookings)}
          subtitle="Semua pemesanan periode aktif"
          icon={<Home size={18} />}
          tone="info"
        />
        <SummaryCard
          title="Pemesanan Aktif"
          value={String(data.stats.activeBookings)}
          subtitle={`${data.stats.occupancyRate.toLocaleString("id-ID")}% aktif`}
          icon={<CalendarClock size={18} />}
          tone="info"
        />
        <SummaryCard
          title="Pemesanan Menunggu"
          value={String(data.stats.pendingBookings)}
          subtitle="Menunggu proses lanjutan"
          icon={<CalendarClock size={18} />}
        />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <RevenueChart data={safeRevenueData} />
        <OccupancyChart data={data.occupancyData} />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-base font-semibold text-slate-800">
          Rincian Per Properti
        </h3>

        <div className="overflow-x-auto">
          <table className="min-w-[930px] w-full text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="p-3 text-left font-semibold">Properti</th>
                <th className="p-3 text-center font-semibold">Total Pemesanan</th>
                <th className="p-3 text-center font-semibold">Pemesanan Aktif</th>
                <th className="p-3 text-center font-semibold">Aktif (%)</th>
                <th className="p-3 text-center font-semibold">Pendapatan</th>
                <th className="p-3 text-center font-semibold">Pengeluaran</th>
                <th className="p-3 text-center font-semibold">Laba</th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr className="border-t border-slate-100">
                  <td colSpan={7} className="p-4 text-center text-slate-500">
                    Memuat data properti...
                  </td>
                </tr>
              ) : data.propertyBreakdown.length === 0 ? (
                <tr className="border-t border-slate-100">
                  <td colSpan={7} className="p-4 text-center text-slate-500">
                    Belum ada data properti.
                  </td>
                </tr>
              ) : (
                data.propertyBreakdown.map((row) => (
                  <tr
                    key={row.propertyId}
                    className="border-t border-slate-100 hover:bg-slate-50"
                  >
                    <td className="p-3 font-medium text-slate-800">{row.propertyName}</td>
                    <td className="p-3 text-center text-slate-700">{row.totalBookings}</td>
                    <td className="p-3 text-center text-slate-700">{row.activeBookings}</td>
                    <td className="p-3 text-center text-slate-700">
                      {row.occupancyRate.toLocaleString("id-ID")}%
                    </td>
                    <td className="p-3 text-center text-slate-700">
                      {formatCurrency(row.revenue)}
                    </td>
                    <td className="p-3 text-center text-slate-700">
                      {formatCurrency(row.expense)}
                    </td>
                    <td
                      className={`p-3 text-center font-medium ${
                        row.profit >= 0 ? "text-emerald-700" : "text-red-700"
                      }`}
                    >
                      {formatCurrency(row.profit)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-base font-semibold text-slate-800">
          Rincian Bulanan
        </h3>

        <div className="overflow-x-auto">
          <table className="min-w-[930px] w-full text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="p-3 text-left font-semibold">Periode</th>
                <th className="p-3 text-left font-semibold">Properti</th>
                <th className="p-3 text-center font-semibold">Total Pemesanan</th>
                <th className="p-3 text-center font-semibold">Pemesanan Aktif</th>
                <th className="p-3 text-center font-semibold">Aktif (%)</th>
                <th className="p-3 text-center font-semibold">Pendapatan</th>
                <th className="p-3 text-center font-semibold">Pengeluaran</th>
                <th className="p-3 text-center font-semibold">Laba Bersih</th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr className="border-t border-slate-100">
                  <td colSpan={8} className="p-4 text-center text-slate-500">
                    Memuat rincian bulanan...
                  </td>
                </tr>
              ) : data.monthlyDetails.length === 0 ? (
                <tr className="border-t border-slate-100">
                  <td colSpan={8} className="p-4 text-center text-slate-500">
                    Belum ada data bulanan.
                  </td>
                </tr>
              ) : (
                data.monthlyDetails.slice(0, 24).map((row, index) => (
                  <tr
                    key={`${row.period}-${row.propertyName}-${index}`}
                    className="border-t border-slate-100 hover:bg-slate-50"
                  >
                    <td className="p-3 text-slate-700">{row.period}</td>
                    <td className="p-3 font-medium text-slate-800">{row.propertyName}</td>
                    <td className="p-3 text-center text-slate-700">{row.totalBookings}</td>
                    <td className="p-3 text-center text-slate-700">{row.activeBookings}</td>
                    <td className="p-3 text-center text-slate-700">
                      {row.occupancyRate.toLocaleString("id-ID")}%
                    </td>
                    <td className="p-3 text-center text-slate-700">
                      {formatCurrency(row.revenue)}
                    </td>
                    <td className="p-3 text-center text-slate-700">
                      {formatCurrency(row.expense)}
                    </td>
                    <td
                      className={`p-3 text-center font-medium ${
                        row.profit >= 0 ? "text-emerald-700" : "text-red-700"
                      }`}
                    >
                      {formatCurrency(row.profit)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  subtitle,
  icon,
  tone = "default",
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  tone?: "default" | "success" | "info" | "danger";
}) {
  const toneClass =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50/70"
      : tone === "info"
        ? "border-blue-200 bg-blue-50/70"
        : tone === "danger"
          ? "border-red-200 bg-red-50/70"
          : "border-slate-200 bg-slate-50/70";

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <div className="inline-flex rounded-lg bg-white/70 p-2 text-slate-700">{icon}</div>
      <p className="mt-3 text-xs font-medium uppercase tracking-wide text-slate-500">
        {title}
      </p>
      <p className="mt-1 text-2xl font-semibold text-slate-800">{value}</p>
      <p className="mt-1 text-xs text-slate-600">{subtitle}</p>
    </div>
  );
}
