"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Building2,
  CalendarDays,
  CheckCircle2,
  Home,
  Layers3,
  RotateCcw,
  TrendingUp,
  Wallet,
  Wrench,
} from "lucide-react";
import ActivityList from "@/components/dashboard/admin/activity/ActivityList";
import MaintenanceChart from "@/components/dashboard/admin/charts/MaintenanceChart";
import OccupancyChart from "@/components/dashboard/admin/charts/OccupancyChart";
import PaymentChart from "@/components/dashboard/admin/charts/PaymentChart";
import RevenueChart from "@/components/dashboard/admin/charts/RevenueChart";
import SourceChart from "@/components/dashboard/admin/charts/SourceChart";
import GlobalFilter from "@/components/dashboard/admin/filters/GlobalFilter";
import ExportButton from "@/components/ui/ExportButton";
import { useAdminDashboard } from "@/hooks/useAdminDashboard";

const dashboardPeriodLabels: Record<string, string> = {
  year: "Tahun Ini",
  month: "Bulan Ini",
  lastMonth: "Bulan Lalu",
  quarter: "3 Bulan Terakhir",
  lastYear: "Tahun Lalu",
};

export default function AdminDashboardPage() {
  const [period, setPeriod] = useState("year");
  const { data, isLoading, error, refresh } = useAdminDashboard(period);
  const periodLabel = dashboardPeriodLabels[period] || "Periode Aktif";

  const periodRevenue = useMemo(() => {
    return data.revenueData.reduce((sum, item) => sum + item.pemasukan, 0);
  }, [data.revenueData]);

  const periodExpense = useMemo(() => {
    return data.revenueData.reduce((sum, item) => sum + item.pengeluaran, 0);
  }, [data.revenueData]);

  const occupancyRate = useMemo(() => {
    const occupied = data.occupancyData.find((item) =>
      item.name.toLowerCase().includes("terisi")
    );
    return occupied?.value || 0;
  }, [data.occupancyData]);

  const financialDelta = periodRevenue - periodExpense;

  const statsForExport = [
    {
      title: "Total Properti",
      value: data.stats.totalProperty.toLocaleString("id-ID"),
    },
    {
      title: "Unit Terisi",
      value: data.stats.occupiedUnit.toLocaleString("id-ID"),
    },
    {
      title: "Perawatan Aktif",
      value: data.stats.activeMaintenance.toLocaleString("id-ID"),
    },
    {
      title: "Pembayaran Tertunda",
      value: data.stats.pendingPayments.toLocaleString("id-ID"),
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-sky-200 bg-gradient-to-br from-[#0B3D91] via-[#0E4F94] to-[#0EA5E9] p-4 text-white shadow-[0_18px_40px_-20px_rgba(11,61,145,0.7)] sm:rounded-3xl sm:p-6">
        <div className="pointer-events-none absolute -left-16 -top-16 h-44 w-44 rounded-full bg-white/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-12 bottom-0 h-52 w-52 rounded-full bg-cyan-200/20 blur-3xl" />

        <div className="relative grid min-w-0 gap-4 sm:gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0">
            <p className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/35 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
              <BarChart3 size={14} />
              <span className="min-w-0">Dasbor Operasional</span>
            </p>
            <h1 className="mt-3 max-w-full text-xl font-semibold leading-tight sm:text-3xl">
              Pantau Properti, Perawatan, dan Pembayaran dalam Satu Layar
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/85">
              Semua metrik utama ditampilkan langsung dari data administrator, tanpa
              perlu pindah halaman.
            </p>

            <div className="mt-4 grid min-w-0 grid-cols-1 gap-3 sm:mt-5 sm:grid-cols-3">
              <HeroChip
                label="Okupansi Saat Ini"
                value={`${occupancyRate}%`}
                hint="dari total unit"
              />
              <HeroChip
                label="Pemasukan Periode"
                value={formatCurrency(periodRevenue)}
                hint="akumulasi periode aktif"
              />
              <HeroChip
                label="Neraca Periode"
                value={formatCurrency(financialDelta)}
                hint={financialDelta >= 0 ? "surplus" : "defisit"}
                trend={financialDelta >= 0 ? "up" : "down"}
              />
            </div>
          </div>

          <div className="min-w-0 rounded-2xl border border-white/35 bg-white/10 p-3.5 backdrop-blur-sm sm:p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/80">
              Kontrol Dasbor
            </p>
            <p className="mt-1 text-sm text-white/90">
              Pilih periode data dan ekspor ringkasan dengan cepat.
            </p>

            <div className="mt-4 grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <div className="min-w-0">
                <GlobalFilter value={period} onChange={setPeriod} />
              </div>
              <div className="min-w-0">
                <ExportButton
                  period={period}
                  stats={statsForExport}
                  revenueData={data.revenueData}
                  paymentData={data.paymentData}
                  occupancyData={data.occupancyData}
                  maintenanceData={data.maintenanceData}
                  sourceData={data.sourceData}
                />
              </div>
            </div>

            <div className="mt-4 space-y-2 rounded-xl border border-white/25 bg-slate-900/25 p-3 text-sm">
              <QuickLine
                icon={<Layers3 size={14} />}
                label="Total Properti"
                value={isLoading ? "..." : data.stats.totalProperty.toLocaleString("id-ID")}
              />
              <QuickLine
                icon={<Wrench size={14} />}
                label="Perawatan Aktif"
                value={isLoading ? "..." : data.stats.activeMaintenance.toLocaleString("id-ID")}
              />
              <QuickLine
                icon={<CalendarDays size={14} />}
                label="Tagihan Menunggu"
                value={isLoading ? "..." : data.stats.pendingPayments.toLocaleString("id-ID")}
              />
            </div>
          </div>
        </div>
      </section>

      {error && (
        <div className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={refresh}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-medium text-red-700 sm:py-1.5"
          >
            <RotateCcw size={14} />
            Coba Lagi
          </button>
        </div>
      )}

      <div id="dashboard-content" className="space-y-4 sm:space-y-6">
        <section className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
          <MetricCard
            title="Total Properti"
            value={
              isLoading ? "..." : data.stats.totalProperty.toLocaleString("id-ID")
            }
            note="properti aktif"
            icon={<Building2 size={20} />}
            accent="blue"
          />

          <MetricCard
            title="Unit Terisi"
            value={
              isLoading ? "..." : data.stats.occupiedUnit.toLocaleString("id-ID")
            }
            note="unit terhuni"
            icon={<Home size={20} />}
            accent="teal"
          />

          <MetricCard
            title="Perawatan Aktif"
            value={
              isLoading
                ? "..."
                : data.stats.activeMaintenance.toLocaleString("id-ID")
            }
            note="perlu ditindaklanjuti"
            icon={<Wrench size={20} />}
            accent="amber"
          />

          <MetricCard
            title="Pembayaran Tertunda"
            value={
              isLoading
                ? "..."
                : data.stats.pendingPayments.toLocaleString("id-ID")
            }
            note="status waiting / overdue"
            icon={<Wallet size={20} />}
            accent="rose"
          />
        </section>

        <section className="grid gap-4 sm:gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-5">
            <h2 className="text-base font-semibold text-slate-900">
              Ringkasan Kinerja Periode
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Gambaran cepat performa finansial dan okupansi untuk periode yang dipilih.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <InsightBadge
                label="Pendapatan"
                value={formatCurrency(periodRevenue)}
                trend="up"
              />
              <InsightBadge
                label="Pengeluaran"
                value={formatCurrency(periodExpense)}
                trend="down"
              />
              <InsightBadge
                label="Okupansi"
                value={`${occupancyRate}%`}
                trend={occupancyRate >= 70 ? "up" : "neutral"}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-4 text-white shadow-sm sm:rounded-3xl sm:p-5">
            <h2 className="text-base font-semibold">Prioritas Hari Ini</h2>
            <div className="mt-3 space-y-2.5 text-sm">
              <PriorityLine
                label="Perawatan Aktif"
                value={`${data.stats.activeMaintenance} tiket`}
                ok={data.stats.activeMaintenance === 0}
              />
              <PriorityLine
                label="Pembayaran Tertunda"
                value={`${data.stats.pendingPayments} faktur`}
                ok={data.stats.pendingPayments === 0}
              />
              <PriorityLine
                label="Neraca Periode"
                value={formatCurrency(financialDelta)}
                ok={financialDelta >= 0}
              />
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-2">
          <RevenueChart data={data.revenueData} periodLabel={periodLabel} />
          <PaymentChart data={data.paymentData} periodLabel={periodLabel} />
        </section>

        <section className="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-2">
          <OccupancyChart data={data.occupancyData} />
          <MaintenanceChart data={data.maintenanceData} periodLabel={periodLabel} />
        </section>

        <section className="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-2">
          <SourceChart data={data.sourceData} periodLabel={periodLabel} />
          <ActivityList activities={data.activities} isLoading={isLoading} />
        </section>
      </div>
    </div>
  );
}

function formatCurrency(value: number) {
  return `Rp ${value.toLocaleString("id-ID")}`;
}

function HeroChip({
  label,
  value,
  hint,
  trend = "neutral",
}: {
  label: string;
  value: string;
  hint: string;
  trend?: "up" | "down" | "neutral";
}) {
  return (
    <div className="min-w-0 rounded-xl border border-white/35 bg-white/10 px-3 py-2.5 backdrop-blur-sm">
      <p className="text-[11px] uppercase leading-4 tracking-wide text-white/80">
        {label}
      </p>
      <p className="mt-1 break-words text-lg font-semibold leading-6">{value}</p>
      <p className="mt-1 flex min-w-0 items-start gap-1 text-xs leading-5 text-white/85">
        {trend === "up" ? (
          <ArrowUpRight size={13} className="mt-1 shrink-0" />
        ) : trend === "down" ? (
          <ArrowDownRight size={13} className="mt-1 shrink-0" />
        ) : (
          <TrendingUp size={13} className="mt-1 shrink-0" />
        )}
        <span className="min-w-0">{hint}</span>
      </p>
    </div>
  );
}

function QuickLine({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2">
      <p className="flex min-w-0 items-start gap-2 text-white/85">
        <span className="mt-0.5 shrink-0">{icon}</span>
        <span className="min-w-0 leading-5">{label}</span>
      </p>
      <span className="shrink-0 font-semibold text-white">{value}</span>
    </div>
  );
}

function MetricCard({
  title,
  value,
  note,
  icon,
  accent,
}: {
  title: string;
  value: string;
  note: string;
  icon: ReactNode;
  accent: "blue" | "teal" | "amber" | "rose";
}) {
  const accentClassMap: Record<string, string> = {
    blue: "from-blue-100 to-sky-100 text-blue-700",
    teal: "from-teal-100 to-emerald-100 text-teal-700",
    amber: "from-amber-100 to-yellow-100 text-amber-700",
    rose: "from-rose-100 to-red-100 text-rose-700",
  };

  return (
    <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5">
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium leading-5 text-slate-500 sm:text-sm">{title}</p>
          <h3 className="mt-1 text-lg font-semibold text-slate-900 sm:text-2xl">{value}</h3>
          <p className="mt-1 text-xs text-slate-500">{note}</p>
        </div>
        <div
          className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br sm:h-11 sm:w-11 ${accentClassMap[accent]}`}
        >
          {icon}
        </div>
      </div>
    </article>
  );
}

function InsightBadge({
  label,
  value,
  trend,
}: {
  label: string;
  value: string;
  trend: "up" | "down" | "neutral";
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
      <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-slate-500">
        {trend === "up" ? (
          <ArrowUpRight size={12} className="text-emerald-600" />
        ) : trend === "down" ? (
          <ArrowDownRight size={12} className="text-rose-600" />
        ) : (
          <TrendingUp size={12} className="text-sky-600" />
        )}
        dibanding periode sebelumnya
      </p>
    </div>
  );
}

function PriorityLine({
  label,
  value,
  ok,
}: {
  label: string;
  value: string;
  ok: boolean;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-white/20 bg-white/10 px-3 py-2.5">
      <span className="text-white/90">{label}</span>
      <span className="inline-flex items-center gap-1 font-semibold">
        <CheckCircle2
          size={14}
          className={ok ? "text-emerald-300" : "text-amber-300"}
        />
        {value}
      </span>
    </div>
  );
}
