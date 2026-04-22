"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  History,
  Search,
  Timer,
  Wrench,
} from "lucide-react";
import {
  getApiErrorMessage,
  getTenantMaintenanceRequests,
  type TenantMaintenanceRequest,
} from "@/lib/dashboard/tenant.api";

type VisitFilter = "all" | "pending" | "confirmed";
type VisitTab = "upcoming" | "history";

const statusLabelMap: Record<TenantMaintenanceRequest["status"], string> = {
  unassigned: "Menunggu Konfirmasi",
  assigned: "Ditugaskan",
  pending_vendor: "Menunggu Vendor",
  in_progress: "Diproses",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

const statusBadgeMap: Record<TenantMaintenanceRequest["status"], string> = {
  unassigned: "border border-yellow-200 bg-yellow-50 text-yellow-700",
  assigned: "border border-blue-200 bg-blue-50 text-blue-700",
  pending_vendor: "border border-purple-200 bg-purple-50 text-purple-700",
  in_progress: "border border-indigo-200 bg-indigo-50 text-indigo-700",
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

const formatTimeRange = (value?: string | null) => {
  if (!value) {
    return "-";
  }

  return value;
};

const getVisitDateMs = (request: TenantMaintenanceRequest) => {
  const sourceDate = request.requested_date || request.repair_date || request.created_at;
  if (!sourceDate) {
    return Number.NEGATIVE_INFINITY;
  }

  const parsedDate = new Date(sourceDate).getTime();
  if (Number.isNaN(parsedDate)) {
    return Number.NEGATIVE_INFINITY;
  }

  return parsedDate;
};

const isPendingStatus = (status: TenantMaintenanceRequest["status"]) => {
  return status === "unassigned" || status === "pending_vendor";
};

const isConfirmedStatus = (status: TenantMaintenanceRequest["status"]) => {
  return status === "assigned" || status === "in_progress" || status === "completed";
};

const formatCount = (value: number) => `${value} jadwal`;

const getStatusIcon = (status: TenantMaintenanceRequest["status"]) => {
  if (status === "completed") {
    return <CheckCircle2 size={15} />;
  }

  if (status === "assigned" || status === "in_progress") {
    return <Wrench size={15} />;
  }

  return <Timer size={15} />;
};

export default function JadwalVisitPage() {
  const [tab, setTab] = useState<VisitTab>("upcoming");
  const [filter, setFilter] = useState<VisitFilter>("all");
  const [requests, setRequests] = useState<TenantMaintenanceRequest[]>([]);
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
            "Gagal memuat jadwal kunjungan. Silakan coba lagi."
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

  const todayStart = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date.getTime();
  }, []);

  const sortedRequests = useMemo(() => {
    return [...requests].sort((a, b) => {
      return getVisitDateMs(a) - getVisitDateMs(b);
    });
  }, [requests]);

  const { upcoming, history } = useMemo(() => {
    const grouped = sortedRequests.reduce<{
      upcoming: TenantMaintenanceRequest[];
      history: TenantMaintenanceRequest[];
    }>(
      (result, request) => {
        const visitDateMs = getVisitDateMs(request);

        const isHistoryItem =
          visitDateMs < todayStart ||
          request.status === "completed" ||
          request.status === "cancelled";

        if (isHistoryItem) {
          result.history.push(request);
        } else {
          result.upcoming.push(request);
        }

        return result;
      },
      { upcoming: [], history: [] }
    );

    grouped.history.sort((a, b) => getVisitDateMs(b) - getVisitDateMs(a));
    return grouped;
  }, [sortedRequests, todayStart]);

  const sourceRequests = tab === "upcoming" ? upcoming : history;

  const tabCounts = useMemo(
    () => ({
      upcoming: upcoming.length,
      history: history.length,
    }),
    [history.length, upcoming.length]
  );

  const filterCounts = useMemo<Record<VisitFilter, number>>(() => {
    return {
      all: sourceRequests.length,
      pending: sourceRequests.filter((item) => isPendingStatus(item.status)).length,
      confirmed: sourceRequests.filter((item) => isConfirmedStatus(item.status)).length,
    };
  }, [sourceRequests]);

  const visibleRequests = useMemo(() => {
    if (filter === "pending") {
      return sourceRequests.filter((request) => isPendingStatus(request.status));
    }

    if (filter === "confirmed") {
      return sourceRequests.filter((request) => isConfirmedStatus(request.status));
    }

    return sourceRequests;
  }, [filter, sourceRequests]);

  const nextVisit = upcoming[0] || null;
  const pendingUpcomingCount = upcoming.filter((item) => isPendingStatus(item.status)).length;
  const confirmedUpcomingCount = upcoming.filter((item) =>
    isConfirmedStatus(item.status)
  ).length;

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-emerald-700 via-green-700 to-teal-700 p-6 text-white shadow-sm">
        <div className="pointer-events-none absolute -left-10 top-0 h-44 w-44 rounded-full bg-white/15 blur-2xl" />
        <div className="pointer-events-none absolute -right-10 bottom-0 h-44 w-44 rounded-full bg-white/10 blur-2xl" />

        <div className="relative">
          <h1 className="text-3xl font-semibold">Jadwal Kunjungan</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/90">
            Pantau semua jadwal kunjungan teknisi dari laporan perawatan unitmu
            dalam satu tampilan yang ringkas.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <SummaryStat
              icon={<CalendarClock size={16} />}
              label="Jadwal Mendatang"
              value={formatCount(tabCounts.upcoming)}
            />
            <SummaryStat
              icon={<Timer size={16} />}
              label="Menunggu Konfirmasi"
              value={formatCount(pendingUpcomingCount)}
            />
            <SummaryStat
              icon={<CheckCircle2 size={16} />}
              label="Sudah Terkonfirmasi"
              value={formatCount(confirmedUpcomingCount)}
            />
          </div>

          <div className="mt-5 rounded-xl border border-white/25 bg-white/10 p-4 backdrop-blur-sm">
            <p className="text-xs text-white/80">Jadwal terdekat</p>
            <p className="mt-1 text-sm font-semibold">
              {nextVisit
                ? `${nextVisit.property.name || "-"} • ${formatDate(
                    nextVisit.requested_date || nextVisit.repair_date
                  )}`
                : "Belum ada jadwal kunjungan mendatang"}
            </p>
            <p className="mt-1 text-xs text-white/85">
              {nextVisit
                ? `Jam kunjungan: ${formatTimeRange(nextVisit.visiting_hours)}`
                : "Buat laporan perawatan jika membutuhkan kunjungan teknisi."}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
            <button
              onClick={() => setTab("upcoming")}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                tab === "upcoming"
                  ? "bg-white text-green-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <CalendarClock size={15} />
              Akan Datang ({tabCounts.upcoming})
            </button>

            <button
              onClick={() => setTab("history")}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                tab === "history"
                  ? "bg-white text-green-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <History size={15} />
              Riwayat ({tabCounts.history})
            </button>
          </div>

          <button
            onClick={() => setRefreshKey((value) => value + 1)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-green-300 hover:text-green-700"
          >
            <Clock3 size={15} />
            Muat Ulang
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              filter === "all"
                ? "bg-green-600 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            Semua ({filterCounts.all})
          </button>

          <button
            onClick={() => setFilter("pending")}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              filter === "pending"
                ? "bg-green-600 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            Menunggu Konfirmasi ({filterCounts.pending})
          </button>

          <button
            onClick={() => setFilter("confirmed")}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              filter === "confirmed"
                ? "bg-green-600 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            Terkonfirmasi ({filterCounts.confirmed})
          </button>
        </div>
      </section>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="h-40 animate-pulse rounded-2xl border bg-white" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={() => setRefreshKey((value) => value + 1)}
            className="mt-3 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm text-red-700"
          >
            Coba Lagi
          </button>
        </div>
      ) : visibleRequests.length === 0 ? (
        <div className="rounded-2xl border bg-white p-8">
          <div className="flex flex-col items-center text-center">
            <h2 className="mt-6 text-xl font-semibold text-green-600">
              Belum Ada Jadwal Kunjungan
            </h2>

            <p className="mt-2 max-w-md text-slate-600">
              Jadwal kunjungan teknisi akan tampil di sini saat laporan perawatan
              membutuhkan kunjungan ke unit.
            </p>

            <Link
              href="/tenant/perawatan"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-green-600 px-6 py-2 text-white transition hover:bg-green-700"
            >
              <Search size={18} />
              Lihat Laporan Perawatan
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {visibleRequests.map((request) => (
            <VisitCard key={request.id} request={request} />
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
    <div className="rounded-xl border border-white/25 bg-white/10 px-4 py-3 backdrop-blur-sm">
      <p className="inline-flex items-center gap-2 text-xs text-white/80">
        {icon}
        {label}
      </p>
      <p className="mt-1 text-base font-semibold text-white">{value}</p>
    </div>
  );
}

function VisitCard({ request }: { request: TenantMaintenanceRequest }) {
  const visitDate = request.requested_date || request.repair_date;

  return (
    <article className="rounded-2xl border bg-white p-5 shadow-sm transition hover:border-green-300 hover:shadow">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-700">
            {getStatusIcon(request.status)}
          </div>

          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-slate-900">
              {request.property.name || "-"} • {request.unit.name || "-"}
            </h2>
            <p className="mt-1 text-sm text-slate-600">{request.issue}</p>
            <p className="mt-1 text-xs text-slate-500">
              Kategori: {request.category}
            </p>
          </div>
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            statusBadgeMap[request.status]
          }`}
        >
          {statusLabelMap[request.status]}
        </span>
      </div>

      <div className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 md:grid-cols-3">
        <div>
          <p className="text-xs text-slate-500">Tanggal Kunjungan</p>
          <p className="mt-1 font-medium text-slate-900">{formatDate(visitDate)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Jam Kunjungan</p>
          <p className="mt-1 font-medium text-slate-900">
            {formatTimeRange(request.visiting_hours)}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Teknisi</p>
          <p className="mt-1 font-medium text-slate-900">
            {request.assigned_to.full_name || "Belum ditentukan"}
          </p>
        </div>
      </div>

      <div className="mt-3 flex justify-end">
        <Link
          href="/tenant/perawatan"
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-green-300 hover:text-green-700"
        >
          Buka Detail Perawatan
        </Link>
      </div>
    </article>
  );
}
