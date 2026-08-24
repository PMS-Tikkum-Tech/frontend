"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  CheckCircle2,
  CircleAlert,
  Clock3,
  Wrench,
} from "lucide-react";
import {
  getApiErrorMessage,
  getTenantMaintenanceRequests,
  type TenantMaintenanceRequest,
} from "@/lib/dashboard/tenant.api";
import { getTenantUnitDisplayName } from "@/lib/dashboard/tenant-unit-display";

type MaintenanceFilter = "all" | "active" | "completed";

const priorityLabelMap: Record<TenantMaintenanceRequest["priority"], string> = {
  urgent: "Mendesak",
  high: "Mendesak",
  medium: "Perlu Segera",
  low: "Tidak Mendesak",
};

const priorityBadgeMap: Record<TenantMaintenanceRequest["priority"], string> = {
  urgent: "border border-red-300 bg-red-100 text-red-700",
  high: "border border-red-200 bg-red-50 text-red-600",
  medium: "border border-yellow-200 bg-yellow-50 text-yellow-700",
  low: "border border-green-200 bg-green-50 text-green-700",
};

const statusLabelMap: Record<TenantMaintenanceRequest["status"], string> = {
  unassigned: "Menunggu Konfirmasi",
  assigned: "Ditugaskan",
  pending_vendor: "Menunggu Vendor",
  in_progress: "Diproses",
  awaiting_approval: "Menunggu Persetujuan",
  revision_required: "Perlu Perbaikan",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

const statusBadgeMap: Record<TenantMaintenanceRequest["status"], string> = {
  unassigned: "border border-yellow-200 bg-yellow-50 text-yellow-700",
  assigned: "border border-blue-200 bg-blue-50 text-blue-700",
  pending_vendor: "border border-purple-200 bg-purple-50 text-purple-700",
  in_progress: "border border-indigo-200 bg-indigo-50 text-indigo-700",
  awaiting_approval: "border border-cyan-200 bg-cyan-50 text-cyan-700",
  revision_required: "border border-rose-200 bg-rose-50 text-rose-700",
  completed: "border border-green-200 bg-green-50 text-green-700",
  cancelled: "border border-slate-200 bg-slate-100 text-slate-600",
};

const formatDate = (value?: string | null) => {
  if (!value) {
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

const isCompletedStatus = (status: TenantMaintenanceRequest["status"]) => {
  return status === "completed" || status === "cancelled";
};

export default function TenantMaintenancePage() {
  const [requests, setRequests] = useState<TenantMaintenanceRequest[]>([]);
  const [filter, setFilter] = useState<MaintenanceFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await getTenantMaintenanceRequests({
          page: 1,
          per_page: 100,
        });

        if (!active) {
          return;
        }

        setRequests(response.data);
      } catch (loadError) {
        if (!active) {
          return;
        }

        setError(
          getApiErrorMessage(
            loadError,
            "Gagal memuat data perawatan. Silakan coba lagi."
          )
        );
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [refreshKey]);

  const sortedRequests = useMemo(() => {
    return [...requests].sort((a, b) => {
      const aDate = new Date(a.requested_date || a.created_at || 0).getTime();
      const bDate = new Date(b.requested_date || b.created_at || 0).getTime();
      return bDate - aDate;
    });
  }, [requests]);

  const stats = useMemo(() => {
    const active = sortedRequests.filter((item) => !isCompletedStatus(item.status)).length;
    const completed = sortedRequests.filter((item) => isCompletedStatus(item.status)).length;
    const urgent = sortedRequests.filter(
      (item) => item.priority === "high" || item.priority === "urgent"
    ).length;

    return {
      total: sortedRequests.length,
      active,
      completed,
      urgent,
    };
  }, [sortedRequests]);

  const filteredRequests = useMemo(() => {
    if (filter === "active") {
      return sortedRequests.filter((item) => !isCompletedStatus(item.status));
    }

    if (filter === "completed") {
      return sortedRequests.filter((item) => isCompletedStatus(item.status));
    }

    return sortedRequests;
  }, [filter, sortedRequests]);

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-blue-700 via-indigo-700 to-violet-700 p-4 text-white shadow-sm sm:p-6">
        <div className="pointer-events-none absolute -left-10 top-0 h-44 w-44 rounded-full bg-white/15 blur-2xl" />
        <div className="pointer-events-none absolute -right-10 bottom-0 h-44 w-44 rounded-full bg-white/10 blur-3xl" />

        <div className="relative">
          <h1 className="text-2xl font-semibold sm:text-3xl">Perawatan</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/90">
            Pantau status semua laporan perbaikan unit kamu secara real-time.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryStat icon={<Wrench size={16} />} label="Total Laporan" value={`${stats.total}`} />
            <SummaryStat icon={<Clock3 size={16} />} label="Sedang Diproses" value={`${stats.active}`} />
            <SummaryStat icon={<CheckCircle2 size={16} />} label="Selesai" value={`${stats.completed}`} />
            <SummaryStat icon={<CircleAlert size={16} />} label="Prioritas Tinggi" value={`${stats.urgent}`} />
          </div>

          <div className="mt-4">
            <Link
              href="/tenant/keluhan"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-medium text-indigo-700 transition hover:bg-slate-100 sm:w-auto"
            >
              <Wrench size={16} />
              Buat Laporan Baru
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <FilterChip
              active={filter === "all"}
              label={`Semua (${stats.total})`}
              onClick={() => setFilter("all")}
            />
            <FilterChip
              active={filter === "active"}
              label={`Aktif (${stats.active})`}
              onClick={() => setFilter("active")}
            />
            <FilterChip
              active={filter === "completed"}
              label={`Selesai (${stats.completed})`}
              onClick={() => setFilter("completed")}
            />
          </div>

        </div>
      </section>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="h-32 animate-pulse rounded-2xl border bg-white" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 sm:p-6">
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={() => setRefreshKey((value) => value + 1)}
            className="mt-3 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm text-red-700"
          >
            Coba Lagi
          </button>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="rounded-2xl border bg-white p-4 text-center sm:p-10">
          <h2 className="text-lg font-semibold text-green-600 sm:text-xl">
            Belum Ada Laporan Perawatan
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-slate-600">
            Jika ada kendala di unit, kamu bisa langsung kirim laporan dari halaman
            ini.
          </p>
          <Link
            href="/tenant/keluhan"
            className="mt-5 inline-flex w-full justify-center rounded-xl bg-green-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-green-700 sm:w-auto"
          >
            Ajukan Keluhan
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((request) => (
            <MaintenanceCard key={request.id} request={request} />
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryStat({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/25 bg-white/10 px-3 py-3 backdrop-blur-sm sm:px-4">
      <p className="inline-flex items-center gap-2 text-xs text-white/80">
        {icon}
        {label}
      </p>
      <p className="mt-1 text-base font-semibold text-white">{value}</p>
    </div>
  );
}

function FilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
        active
          ? "bg-green-600 text-white"
          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
      }`}
    >
      {label}
    </button>
  );
}

function MaintenanceCard({ request }: { request: TenantMaintenanceRequest }) {
  return (
    <article className="rounded-2xl border bg-white p-4 shadow-sm transition hover:border-green-300 hover:shadow sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-800">
            {request.property.name || "-"} • {getTenantUnitDisplayName(request.unit)}
          </h2>
          <p className="mt-1 text-sm text-slate-600">{request.issue}</p>
          <p className="mt-1 text-xs text-slate-500">Kategori: {request.category}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Status SLA</p>
          <p className={`mt-1 font-medium ${request.overdue ? "text-red-600" : "text-slate-800"}`}>
            {request.sla_status === "overdue"
              ? "Terlambat"
              : request.sla_status === "approaching"
                ? "Mendekati deadline"
                : "Aman"}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              priorityBadgeMap[request.priority]
            }`}
          >
            {priorityLabelMap[request.priority]}
          </span>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              statusBadgeMap[request.status]
            }`}
          >
            {statusLabelMap[request.status]}
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm md:grid-cols-3">
        <div>
          <p className="text-xs text-slate-500">Tanggal Laporan</p>
          <p className="mt-1 font-medium text-slate-800">{formatDate(request.requested_date)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Tanggal Perbaikan</p>
          <p className="mt-1 font-medium text-slate-800">{formatDate(request.repair_date)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Teknisi</p>
          <p className="mt-1 font-medium text-slate-800">
            {request.assigned_to.full_name || "Belum ditentukan"}
          </p>
        </div>
      </div>
    </article>
  );
}
