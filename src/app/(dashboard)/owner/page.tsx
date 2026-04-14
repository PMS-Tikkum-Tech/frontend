"use client";

import { useState } from "react";
import {
  Building2,
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

const formatDate = (value: string) => {
  if (!value || value === "-") {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function OwnerDashboardPage() {
  const [period, setPeriod] = useState("year");
  const { data, isLoading, error, refresh } = useOwnerDashboard(period);

  const safeRevenueData =
    data.revenueData.length > 0
      ? data.revenueData
      : [{ month: "Belum Ada Data", pemasukan: 0, pengeluaran: 0 }];

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-r from-[#1E2746] to-[#2A3B78] p-5 text-white shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-blue-100">
              Modul Owner
            </p>
            <h1 className="text-2xl font-semibold">Dasbor Owner</h1>
            <p className="text-sm text-blue-100">
              Data ditampilkan berdasarkan endpoint owner dari backend.
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

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          title="Total Properti"
          value={String(data.stats.totalProperty)}
          subtitle="Dari data booking & cashflow"
          icon={<Building2 size={18} />}
        />
        <SummaryCard
          title="Total Booking"
          value={String(data.stats.totalBookings)}
          subtitle={`${data.stats.approvedBookings} booking disetujui`}
          icon={<Home size={18} />}
          tone="info"
        />
        <SummaryCard
          title="Booking Aktif"
          value={String(data.stats.activeBookings)}
          subtitle={`${data.stats.occupancyRate.toLocaleString("id-ID")}% aktif`}
          icon={<CalendarClock size={18} />}
          tone="success"
        />
        <SummaryCard
          title="Pendapatan Owner"
          value={formatCurrency(data.stats.totalRevenue)}
          subtitle="Kas masuk owner"
          icon={<TrendingUp size={18} />}
          tone="success"
        />
        <SummaryCard
          title="Laba Bersih"
          value={formatCurrency(data.stats.netProfit)}
          subtitle={`Pengeluaran ${formatCurrency(data.stats.totalExpense)}`}
          icon={<Wallet size={18} />}
          tone={data.stats.netProfit >= 0 ? "success" : "danger"}
        />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <RevenueChart data={safeRevenueData} />
        <OccupancyChart data={data.occupancyData} />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-base font-semibold text-slate-800">
          Ringkasan Per Properti
        </h3>

        <div className="overflow-x-auto">
          <table className="min-w-[930px] w-full text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="p-3 text-left font-semibold">Properti</th>
                <th className="p-3 text-center font-semibold">Total Booking</th>
                <th className="p-3 text-center font-semibold">Booking Aktif</th>
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
                    Memuat data owner...
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
          Booking Terbaru
        </h3>

        <div className="overflow-x-auto">
          <table className="min-w-[930px] w-full text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="p-3 text-left font-semibold">Kode Booking</th>
                <th className="p-3 text-left font-semibold">Properti</th>
                <th className="p-3 text-left font-semibold">Unit</th>
                <th className="p-3 text-left font-semibold">Status</th>
                <th className="p-3 text-left font-semibold">Status Sewa</th>
                <th className="p-3 text-left font-semibold">Mulai</th>
                <th className="p-3 text-left font-semibold">Selesai</th>
                <th className="p-3 text-right font-semibold">Nominal Owner</th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr className="border-t border-slate-100">
                  <td colSpan={8} className="p-4 text-center text-slate-500">
                    Memuat booking terbaru...
                  </td>
                </tr>
              ) : data.latestBookings.length === 0 ? (
                <tr className="border-t border-slate-100">
                  <td colSpan={8} className="p-4 text-center text-slate-500">
                    Belum ada data booking.
                  </td>
                </tr>
              ) : (
                data.latestBookings.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="p-3 font-medium text-slate-800">{row.bookingCode}</td>
                    <td className="p-3 text-slate-700">{row.propertyName}</td>
                    <td className="p-3 text-slate-700">{row.unitName}</td>
                    <td className="p-3 text-slate-700">{row.statusLabel}</td>
                    <td className="p-3 text-slate-700">{row.occupancyStatus}</td>
                    <td className="p-3 text-slate-700">{formatDate(row.startDate)}</td>
                    <td className="p-3 text-slate-700">{formatDate(row.endDate)}</td>
                    <td className="p-3 text-right font-medium text-slate-800">
                      {formatCurrency(row.ownerAmount)}
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
