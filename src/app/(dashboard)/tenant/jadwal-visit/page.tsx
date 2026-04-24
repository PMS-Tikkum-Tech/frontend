"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  History,
  MapPin,
  MessageSquareText,
  Search,
  Timer,
  XCircle,
} from "lucide-react";
import {
  cancelTenantVisitRequest,
  getApiErrorMessage,
  getTenantVisitRequests,
  type TenantVisitRequest,
} from "@/lib/dashboard/tenant.api";

type VisitFilter = "all" | "pending" | "confirmed";
type VisitTab = "upcoming" | "history";
type VisitNotice = {
  variant: "success" | "error";
  message: string;
} | null;

const statusLabelMap: Record<TenantVisitRequest["status"], string> = {
  pending: "Menunggu Konfirmasi",
  confirmed: "Terkonfirmasi",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

const statusBadgeMap: Record<TenantVisitRequest["status"], string> = {
  pending: "border border-yellow-200 bg-yellow-50 text-yellow-700",
  confirmed: "border border-blue-200 bg-blue-50 text-blue-700",
  completed: "border border-green-200 bg-green-50 text-green-700",
  cancelled: "border border-slate-200 bg-slate-100 text-slate-600",
};

const formatDate = (value?: string | null) => {
  if (!value) {
    return "-";
  }

  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00`)
    : new Date(value);
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

  return `${value} WIB`;
};

const getVisitDateMs = (request: TenantVisitRequest) => {
  const sourceDate = request.preferred_date || request.created_at;
  if (!sourceDate) {
    return Number.NEGATIVE_INFINITY;
  }

  const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(sourceDate)
    ? new Date(`${sourceDate}T00:00:00`).getTime()
    : new Date(sourceDate).getTime();
  if (Number.isNaN(parsedDate)) {
    return Number.NEGATIVE_INFINITY;
  }

  return parsedDate;
};

const isPendingStatus = (status: TenantVisitRequest["status"]) => {
  return status === "pending";
};

const isConfirmedStatus = (status: TenantVisitRequest["status"]) => {
  return status === "confirmed" || status === "completed";
};

const formatCount = (value: number) => `${value} jadwal`;

const getStatusIcon = (status: TenantVisitRequest["status"]) => {
  if (status === "completed") {
    return <CheckCircle2 size={15} />;
  }

  if (status === "confirmed") {
    return <CalendarClock size={15} />;
  }

  return <Timer size={15} />;
};

export default function JadwalVisitPage() {
  const [tab, setTab] = useState<VisitTab>("upcoming");
  const [filter, setFilter] = useState<VisitFilter>("all");
  const [requests, setRequests] = useState<TenantVisitRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [notice, setNotice] = useState<VisitNotice>(null);
  const [cancelTarget, setCancelTarget] = useState<TenantVisitRequest | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await getTenantVisitRequests({
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
      upcoming: TenantVisitRequest[];
      history: TenantVisitRequest[];
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

  const handleCancelVisit = async () => {
    if (!cancelTarget) {
      return;
    }

    setIsCancelling(true);
    setNotice(null);

    try {
      const response = await cancelTenantVisitRequest(cancelTarget.id);
      setRequests((currentRequests) =>
        currentRequests.map((request) =>
          request.id === response.data.id ? response.data : request
        )
      );
      setCancelTarget(null);
      setTab("history");
      setFilter("all");
      setNotice({
        variant: "success",
        message: "Jadwal survei kost berhasil dibatalkan.",
      });
    } catch (cancelError) {
      setNotice({
        variant: "error",
        message: getApiErrorMessage(
          cancelError,
          "Gagal membatalkan jadwal survei. Silakan coba lagi."
        ),
      });
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="space-y-8">
      {cancelTarget ? (
        <CancelVisitDialog
          request={cancelTarget}
          isSubmitting={isCancelling}
          onClose={() => {
            if (!isCancelling) {
              setCancelTarget(null);
            }
          }}
          onConfirm={handleCancelVisit}
        />
      ) : null}

      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-emerald-700 via-green-700 to-teal-700 p-6 text-white shadow-sm">
        <div className="pointer-events-none absolute -left-10 top-0 h-44 w-44 rounded-full bg-white/15 blur-2xl" />
        <div className="pointer-events-none absolute -right-10 bottom-0 h-44 w-44 rounded-full bg-white/10 blur-2xl" />

        <div className="relative">
          <h1 className="text-3xl font-semibold">Jadwal Kunjungan</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/90">
            Pantau jadwal survei kost yang kamu ajukan sebelum memilih atau
            menyewa unit.
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
                    nextVisit.preferred_date
                  )}`
                : "Belum ada jadwal kunjungan mendatang"}
            </p>
            <p className="mt-1 text-xs text-white/85">
              {nextVisit
                ? `Jam survei: ${formatTimeRange(nextVisit.preferred_time)}`
                : "Ajukan survei dari halaman detail kost di menu Sewa."}
            </p>
          </div>
        </div>
      </section>

      {notice ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            notice.variant === "success"
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {notice.message}
        </div>
      ) : null}

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
              Jadwal survei kost akan tampil di sini setelah kamu mengajukan
              kunjungan dari halaman detail kost.
            </p>

            <Link
              href="/sewa"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-green-600 px-6 py-2 text-white transition hover:bg-green-700"
            >
              <Search size={18} />
              Cari Kost untuk Disurvei
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {visibleRequests.map((request) => (
            <VisitCard
              key={request.id}
              request={request}
              canCancel={
                tab === "upcoming" &&
                (request.status === "pending" || request.status === "confirmed")
              }
              onCancel={() => {
                setNotice(null);
                setCancelTarget(request);
              }}
            />
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

function VisitCard({
  request,
  canCancel,
  onCancel,
}: {
  request: TenantVisitRequest;
  canCancel: boolean;
  onCancel: () => void;
}) {
  return (
    <article className="rounded-2xl border bg-white p-5 shadow-sm transition hover:border-green-300 hover:shadow">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-700">
            {getStatusIcon(request.status)}
          </div>

          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-slate-900">
              {request.property.name || "-"}
            </h2>
            <p className="mt-1 inline-flex items-start gap-1.5 text-sm text-slate-600">
              <MapPin size={14} className="mt-0.5 shrink-0 text-green-700" />
              <span>{request.property.address || "Alamat kost belum tersedia"}</span>
            </p>
            {request.note ? (
              <p className="mt-2 inline-flex items-start gap-1.5 text-xs text-slate-500">
                <MessageSquareText
                  size={13}
                  className="mt-0.5 shrink-0 text-green-700"
                />
                <span>{request.note}</span>
              </p>
            ) : null}
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
          <p className="text-xs text-slate-500">Tanggal Survei</p>
          <p className="mt-1 font-medium text-slate-900">
            {formatDate(request.preferred_date)}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Jam Survei</p>
          <p className="mt-1 font-medium text-slate-900">
            {formatTimeRange(request.preferred_time)}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Status Pengajuan</p>
          <p className="mt-1 font-medium text-slate-900">
            {statusLabelMap[request.status]}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap justify-end gap-2">
        {canCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-100"
          >
            <XCircle size={13} />
            Batalkan
          </button>
        ) : null}
        <Link
          href={`/sewa/${request.property.id}`}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-green-300 hover:text-green-700"
        >
          Lihat Detail Kost
        </Link>
      </div>
    </article>
  );
}

function CancelVisitDialog({
  request,
  isSubmitting,
  onClose,
  onConfirm,
}: {
  request: TenantVisitRequest;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
        onClick={onClose}
        disabled={isSubmitting}
        aria-label="Tutup konfirmasi pembatalan"
      />

      <div className="relative z-[91] w-full max-w-md overflow-hidden rounded-3xl border border-red-100 bg-white shadow-2xl">
        <div className="bg-gradient-to-br from-red-50 via-white to-orange-50 px-5 py-5">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-red-100 text-red-700">
            <AlertTriangle size={20} />
          </div>
          <h2 className="mt-4 text-xl font-semibold text-slate-900">
            Batalkan Jadwal Survei?
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Jadwal survei kost ini akan dipindahkan ke riwayat dengan status
            dibatalkan.
          </p>
        </div>

        <div className="space-y-3 px-5 py-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm font-semibold text-slate-900">
              {request.property.name || "-"}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {formatDate(request.preferred_date)} •{" "}
              {formatTimeRange(request.preferred_time)}
            </p>
          </div>

          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
            >
              Tidak Jadi
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isSubmitting}
              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Membatalkan..." : "Ya, Batalkan"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
