"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Building2,
  CalendarRange,
  CalendarClock,
  Home,
  Mail,
  MapPin,
  Phone,
  TrendingUp,
  UserRound,
  Wallet,
} from "lucide-react";
import RevenueChart from "@/components/dashboard/admin/charts/RevenueChart";
import OccupancyChart from "@/components/dashboard/admin/charts/OccupancyChart";
import GlobalFilter from "@/components/dashboard/admin/filters/GlobalFilter";
import OwnerFinancialDetailDialog from "@/components/dashboard/owner/OwnerFinancialDetailDialog";
import useOwnerDashboard, {
  type OwnerFinancialDetailRow,
} from "@/hooks/useOwnerDashboard";

type FinancialDetailSelection = {
  title: string;
  direction: "inflow" | "outflow";
  propertyId?: number;
  unitId?: number;
  tenantId?: number;
};

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
  const [financialDetail, setFinancialDetail] =
    useState<FinancialDetailSelection | null>(null);
  const { data, isLoading, error } = useOwnerDashboard(period);

  const selectedFinancialEntries: OwnerFinancialDetailRow[] = financialDetail
    ? data.financialDetails.filter(
        (entry) =>
          entry.direction === financialDetail.direction &&
          (financialDetail.propertyId === undefined ||
            entry.propertyId === financialDetail.propertyId) &&
          (financialDetail.unitId === undefined ||
            entry.unitId === financialDetail.unitId) &&
          (financialDetail.tenantId === undefined ||
            entry.tenantId === financialDetail.tenantId),
      )
    : [];

  const safeRevenueData =
    data.revenueData.length > 0
      ? data.revenueData
      : [{ month: "Belum Ada Data", pemasukan: 0, pengeluaran: 0 }];

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-r from-[#1E2746] to-[#2A3B78] p-4 text-white shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-blue-100">
              Modul Pemilik
            </p>
            <h1 className="text-2xl font-semibold sm:text-2xl">Dasbor Pemilik</h1>
            <p className="text-sm text-blue-100">
              Data ditampilkan berdasarkan layanan pemilik dari sistem.
            </p>
          </div>

          <GlobalFilter value={period} onChange={setPeriod} />
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <div className="flex items-start gap-2">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <p>
            Perhitungan keuntungan pemilik masih dalam proses penyempurnaan.
            Angka yang tampil di bawah ini bersifat sementara dan dapat berubah
            saat validasi data selesai.
          </p>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          title="Total Properti"
          value={String(data.stats.totalProperty)}
          subtitle="Dari data pemesanan & arus kas"
          icon={<Building2 size={18} />}
        />
        <SummaryCard
          title="Total Pemesanan"
          value={String(data.stats.totalBookings)}
          subtitle={`${data.stats.approvedBookings} pemesanan disetujui`}
          icon={<Home size={18} />}
          tone="info"
        />
        <SummaryCard
          title="Pemesanan Aktif"
          value={String(data.stats.activeBookings)}
          subtitle={`${data.stats.occupancyRate.toLocaleString("id-ID")}% aktif`}
          icon={<CalendarClock size={18} />}
          tone="success"
        />
        <SummaryCard
          title="Pendapatan Pemilik"
          value={formatCurrency(data.stats.totalRevenue)}
          subtitle="Klik untuk melihat detail kas masuk"
          icon={<TrendingUp size={18} />}
          tone="success"
          onClick={() =>
            setFinancialDetail({
              title: "Detail Pendapatan Pemilik",
              direction: "inflow",
            })
          }
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

      <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-5">
        <h3 className="mb-4 text-base font-semibold text-slate-800">
          Ringkasan Per Properti
        </h3>

        <div className="overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none]">
          <table className="min-w-[1120px] w-full text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="p-3 text-left font-semibold">Properti</th>
                <th className="p-3 text-center font-semibold">Total Unit</th>
                <th className="p-3 text-center font-semibold">Unit Terisi</th>
                <th className="p-3 text-center font-semibold">Total Pemesanan</th>
                <th className="p-3 text-center font-semibold">Pemesanan Aktif</th>
                <th className="p-3 text-center font-semibold">Okupansi</th>
                <th className="p-3 text-center font-semibold">Pendapatan</th>
                <th className="p-3 text-center font-semibold">Pengeluaran</th>
                <th className="p-3 text-center font-semibold">Laba</th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr className="border-t border-slate-100">
                  <td colSpan={9} className="p-4 text-center text-slate-500">
                    Memuat data pemilik...
                  </td>
                </tr>
              ) : data.propertyBreakdown.length === 0 ? (
                <tr className="border-t border-slate-100">
                  <td colSpan={9} className="p-4 text-center text-slate-500">
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
                    <td className="p-3 text-center text-slate-700">{row.totalUnits}</td>
                    <td className="p-3 text-center text-slate-700">{row.occupiedUnits}</td>
                    <td className="p-3 text-center text-slate-700">{row.totalBookings}</td>
                    <td className="p-3 text-center text-slate-700">{row.activeBookings}</td>
                    <td className="p-3 text-center text-slate-700">
                      {row.occupancyRate.toLocaleString("id-ID")}%
                    </td>
                    <td className="p-3 text-center text-slate-700">
                      <FinancialDetailButton
                        value={row.revenue}
                        label={`Lihat detail pendapatan ${row.propertyName}`}
                        onClick={() =>
                          setFinancialDetail({
                            title: `Detail Pendapatan • ${row.propertyName}`,
                            direction: "inflow",
                            propertyId: row.propertyId,
                          })
                        }
                      />
                    </td>
                    <td className="p-3 text-center text-slate-700">
                      <FinancialDetailButton
                        value={row.expense}
                        label={`Lihat detail pengeluaran ${row.propertyName}`}
                        onClick={() =>
                          setFinancialDetail({
                            title: `Detail Pengeluaran • ${row.propertyName}`,
                            direction: "outflow",
                            propertyId: row.propertyId,
                          })
                        }
                      />
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

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-start gap-3">
            <span className="rounded-xl bg-blue-100 p-2.5 text-blue-700">
              <UserRound size={20} />
            </span>
            <div>
              <h3 className="font-semibold text-slate-900">
                Laporan Keuangan Per Penghuni
              </h3>
              <p className="mt-1 max-w-2xl text-sm leading-5 text-slate-500">
                Rincian unit, masa sewa, pemasukan, dan pengeluaran setiap
                penghuni aktif pada periode terpilih.
              </p>
            </div>
          </div>
          {!isLoading ? (
            <span className="w-fit rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              {data.tenantBreakdown.length} penghuni aktif
            </span>
          ) : null}
        </div>

        {isLoading ? (
          <div className="flex min-h-40 items-center justify-center px-4 py-8 text-sm text-slate-500">
            Memuat laporan penghuni...
          </div>
        ) : data.tenantBreakdown.length === 0 ? (
          <div className="flex min-h-52 flex-col items-center justify-center px-6 py-10 text-center">
            <span className="rounded-2xl bg-slate-100 p-3 text-slate-400">
              <UserRound size={28} />
            </span>
            <p className="mt-3 font-medium text-slate-700">
              Belum ada penghuni aktif
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Penghuni akan tampil setelah unit milik Anda memiliki sewa aktif.
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-3 p-3 sm:p-4 lg:hidden">
              {data.tenantBreakdown.map((row) => (
                <article
                  key={row.tenantId}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-slate-50/70 p-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                        <UserRound size={18} />
                      </span>
                      <div className="min-w-0">
                        <h4 className="truncate font-semibold text-slate-900">
                          {row.tenantName}
                        </h4>
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {row.propertyNames}
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                      Aktif
                    </span>
                  </div>

                  <div className="space-y-4 p-4">
                    <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <Mail size={15} className="shrink-0 text-slate-400" />
                        <span className="truncate">{row.tenantEmail}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone size={15} className="shrink-0 text-slate-400" />
                        <span>{row.tenantPhone}</span>
                      </div>
                      <div className="flex min-w-0 items-center gap-2">
                        <Home size={15} className="shrink-0 text-slate-400" />
                        <span className="truncate">{row.unitNames}</span>
                      </div>
                      <div className="flex min-w-0 items-center gap-2">
                        <MapPin size={15} className="shrink-0 text-slate-400" />
                        <span className="truncate">
                          {row.buildingNames === "-"
                            ? "Tanpa blok"
                            : `Blok ${row.buildingNames}`}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
                      <CalendarRange
                        size={16}
                        className="mt-0.5 shrink-0 text-slate-400"
                      />
                      <div>
                        <p className="text-xs font-medium text-slate-500">
                          Masa sewa
                        </p>
                        <p className="mt-0.5 font-medium text-slate-700">
                          {formatDate(row.leaseStart)} – {formatDate(row.leaseEnd)}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="col-span-2 flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5">
                        <span className="text-xs font-medium text-slate-500">
                          Harga bulanan
                        </span>
                        <span className="text-sm font-semibold text-slate-800">
                          {formatCurrency(row.monthlyPrice)}
                        </span>
                      </div>
                      <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600">
                          Pemasukan
                        </p>
                        <FinancialDetailButton
                          value={row.revenue}
                          label={`Lihat detail pemasukan ${row.tenantName}`}
                          tone="income"
                          onClick={() =>
                            setFinancialDetail({
                              title: `Detail Pemasukan • ${row.tenantName}`,
                              direction: "inflow",
                              tenantId: row.tenantId,
                            })
                          }
                        />
                      </div>
                      <div className="rounded-xl border border-red-100 bg-red-50/70 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-red-600">
                          Pengeluaran
                        </p>
                        <FinancialDetailButton
                          value={row.expense}
                          label={`Lihat detail pengeluaran ${row.tenantName}`}
                          tone="expense"
                          onClick={() =>
                            setFinancialDetail({
                              title: `Detail Pengeluaran • ${row.tenantName}`,
                              direction: "outflow",
                              tenantId: row.tenantId,
                            })
                          }
                        />
                      </div>
                      <div className="col-span-2 flex items-center justify-between rounded-xl bg-slate-900 px-3 py-3 text-white">
                        <span className="text-xs font-medium text-slate-300">
                          Laba bersih
                        </span>
                        <span
                          className={`text-sm font-semibold ${
                            row.profit >= 0 ? "text-emerald-300" : "text-red-300"
                          }`}
                        >
                          {formatCurrency(row.profit)}
                        </span>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="hidden overflow-x-auto lg:block [-ms-overflow-style:none] [scrollbar-width:none]">
              <table className="w-full min-w-[1280px] text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3.5 text-left font-semibold">
                      Penghuni
                    </th>
                    <th className="px-4 py-3.5 text-left font-semibold">
                      Kontak
                    </th>
                    <th className="px-4 py-3.5 text-left font-semibold">
                      Properti & Unit
                    </th>
                    <th className="px-4 py-3.5 text-left font-semibold">
                      Masa Sewa
                    </th>
                    <th className="px-4 py-3.5 text-right font-semibold">
                      Harga Bulanan
                    </th>
                    <th className="px-4 py-3.5 text-right font-semibold">
                      Pemasukan
                    </th>
                    <th className="px-4 py-3.5 text-right font-semibold">
                      Pengeluaran
                    </th>
                    <th className="px-5 py-3.5 text-right font-semibold">
                      Laba
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.tenantBreakdown.map((row) => (
                    <tr
                      key={row.tenantId}
                      className="transition-colors hover:bg-slate-50/80"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                            <UserRound size={16} />
                          </span>
                          <div>
                            <p className="font-semibold text-slate-900">
                              {row.tenantName}
                            </p>
                            <span className="mt-1 inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                              Sewa aktif
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-xs text-slate-600">
                        <div className="flex max-w-48 items-center gap-2">
                          <Mail size={14} className="shrink-0 text-slate-400" />
                          <span className="truncate">{row.tenantEmail}</span>
                        </div>
                        <div className="mt-1.5 flex items-center gap-2">
                          <Phone size={14} className="shrink-0 text-slate-400" />
                          <span>{row.tenantPhone}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="max-w-52 truncate font-medium text-slate-800">
                          {row.propertyNames}
                        </p>
                        <p className="mt-1 max-w-52 truncate text-xs text-slate-500">
                          {row.unitNames}
                          {row.buildingNames === "-"
                            ? ""
                            : ` • Blok ${row.buildingNames}`}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-600">
                        <div className="flex items-center gap-2">
                          <CalendarRange
                            size={14}
                            className="shrink-0 text-slate-400"
                          />
                          <div>
                            <p>{formatDate(row.leaseStart)}</p>
                            <p className="mt-0.5 text-slate-400">
                              s.d. {formatDate(row.leaseEnd)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-right font-medium text-slate-700">
                        {formatCurrency(row.monthlyPrice)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-right">
                        <FinancialDetailButton
                          value={row.revenue}
                          label={`Lihat detail pemasukan ${row.tenantName}`}
                          tone="income"
                          onClick={() =>
                            setFinancialDetail({
                              title: `Detail Pemasukan • ${row.tenantName}`,
                              direction: "inflow",
                              tenantId: row.tenantId,
                            })
                          }
                        />
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-right">
                        <FinancialDetailButton
                          value={row.expense}
                          label={`Lihat detail pengeluaran ${row.tenantName}`}
                          tone="expense"
                          onClick={() =>
                            setFinancialDetail({
                              title: `Detail Pengeluaran • ${row.tenantName}`,
                              direction: "outflow",
                              tenantId: row.tenantId,
                            })
                          }
                        />
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-right">
                        <span
                          className={`inline-flex rounded-lg px-2.5 py-1.5 font-semibold ${
                            row.profit >= 0
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-red-50 text-red-700"
                          }`}
                        >
                          {formatCurrency(row.profit)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-5">
        <h3 className="mb-4 text-base font-semibold text-slate-800">
          Pemesanan Terbaru
        </h3>

        <div className="overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none]">
          <table className="min-w-[1040px] w-full text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="p-3 text-left font-semibold">Kode Pemesanan</th>
                <th className="p-3 text-left font-semibold">Properti</th>
                <th className="p-3 text-left font-semibold">Unit</th>
                <th className="p-3 text-left font-semibold">Tenant</th>
                <th className="p-3 text-left font-semibold">Status</th>
                <th className="p-3 text-left font-semibold">Status Sewa</th>
                <th className="p-3 text-left font-semibold">Mulai</th>
                <th className="p-3 text-left font-semibold">Selesai</th>
                <th className="p-3 text-right font-semibold">Nominal Pemilik</th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr className="border-t border-slate-100">
                  <td colSpan={9} className="p-4 text-center text-slate-500">
                    Memuat pemesanan terbaru...
                  </td>
                </tr>
              ) : data.latestBookings.length === 0 ? (
                <tr className="border-t border-slate-100">
                  <td colSpan={9} className="p-4 text-center text-slate-500">
                    Belum ada data pemesanan.
                  </td>
                </tr>
              ) : (
                data.latestBookings.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="p-3 font-medium text-slate-800">{row.bookingCode}</td>
                    <td className="p-3 text-slate-700">{row.propertyName}</td>
                    <td className="p-3 text-slate-700">{row.unitName}</td>
                    <td className="p-3 text-slate-700">{row.tenantName}</td>
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

      {financialDetail ? (
        <OwnerFinancialDetailDialog
          title={financialDetail.title}
          direction={financialDetail.direction}
          entries={selectedFinancialEntries}
          onClose={() => setFinancialDetail(null)}
        />
      ) : null}
    </div>
  );
}

function SummaryCard({
  title,
  value,
  subtitle,
  icon,
  tone = "default",
  onClick,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  tone?: "default" | "success" | "info" | "danger";
  onClick?: () => void;
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
    <div className={`rounded-2xl border p-3 ${toneClass} sm:p-4`}>
      <div className="inline-flex rounded-lg bg-white/70 p-2 text-slate-700">{icon}</div>
      <p className="mt-3 text-xs font-medium uppercase tracking-wide text-slate-500">
        {title}
      </p>
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          className="mt-1 block rounded text-left text-lg font-semibold text-slate-800 underline decoration-dotted underline-offset-4 transition hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-2xl"
        >
          {value}
        </button>
      ) : (
        <p className="mt-1 text-lg font-semibold text-slate-800 sm:text-2xl">
          {value}
        </p>
      )}
      <p className="mt-1 text-xs text-slate-600">{subtitle}</p>
    </div>
  );
}

function FinancialDetailButton({
  value,
  label,
  onClick,
  tone = "default",
}: {
  value: number;
  label: string;
  onClick: () => void;
  tone?: "default" | "income" | "expense";
}) {
  const toneClass =
    tone === "income"
      ? "mt-1 inline-flex whitespace-nowrap bg-emerald-100/80 px-2 py-1 font-semibold text-emerald-700 hover:bg-emerald-200/80 hover:text-emerald-900"
      : tone === "expense"
        ? "mt-1 inline-flex whitespace-nowrap bg-red-100/80 px-2 py-1 font-semibold text-red-700 hover:bg-red-200/80 hover:text-red-900"
        : "font-medium text-blue-700 underline decoration-dotted underline-offset-4 hover:text-blue-900";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`rounded transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${toneClass}`}
    >
      {formatCurrency(value)}
    </button>
  );
}
