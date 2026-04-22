"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  BellRing,
  CalendarClock,
  CheckCircle2,
  Clock3,
  TriangleAlert,
  XCircle,
} from "lucide-react";
import {
  getApiErrorMessage,
  getTenantNotifications,
  isTenantNotificationsUnavailableMessage,
  type TenantCommunication,
} from "@/lib/dashboard/tenant.api";
import {
  getLatestTenantNotificationTimestamp,
  markTenantNotificationsAsSeen,
} from "@/lib/dashboard/tenant-notification-state";

type NotificationFilter = "all" | "scheduled" | "sent" | "failed";

const statusBadgeMap: Record<TenantCommunication["status"], string> = {
  scheduled: "border border-yellow-200 bg-yellow-50 text-yellow-700",
  sent: "border border-green-200 bg-green-50 text-green-700",
  failed: "border border-red-200 bg-red-50 text-red-600",
};

const statusLabelMap: Record<TenantCommunication["status"], string> = {
  scheduled: "Terjadwal",
  sent: "Terkirim",
  failed: "Gagal",
};

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const statusIconMap: Record<TenantCommunication["status"], ReactNode> = {
  scheduled: <CalendarClock size={16} />,
  sent: <CheckCircle2 size={16} />,
  failed: <XCircle size={16} />,
};

export default function NotifikasiPage() {
  const [items, setItems] = useState<TenantCommunication[]>([]);
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notificationNotice, setNotificationNotice] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      setNotificationNotice(null);

      try {
        const response = await getTenantNotifications({ page: 1, per_page: 50 });
        if (!active) {
          return;
        }

        setItems(response.data);
        setNotificationNotice(response.message || null);
        const latestTimestamp = getLatestTenantNotificationTimestamp(response.data);
        markTenantNotificationsAsSeen(latestTimestamp || Date.now());
      } catch (loadError) {
        if (!active) {
          return;
        }

        setError(
          getApiErrorMessage(
            loadError,
            "Gagal memuat notifikasi. Silakan coba lagi."
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

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const aDate = new Date(a.scheduled_at || a.created_at || 0).getTime();
      const bDate = new Date(b.scheduled_at || b.created_at || 0).getTime();
      return bDate - aDate;
    });
  }, [items]);

  const statusCounts = useMemo(
    () => ({
      all: sortedItems.length,
      scheduled: sortedItems.filter((item) => item.status === "scheduled").length,
      sent: sortedItems.filter((item) => item.status === "sent").length,
      failed: sortedItems.filter((item) => item.status === "failed").length,
    }),
    [sortedItems]
  );

  const visibleItems = useMemo(() => {
    if (filter === "all") {
      return sortedItems;
    }

    return sortedItems.filter((item) => item.status === filter);
  }, [filter, sortedItems]);

  const showBackendNotice =
    isTenantNotificationsUnavailableMessage(notificationNotice) &&
    visibleItems.length === 0;

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-sky-700 via-cyan-700 to-teal-700 p-6 text-white shadow-sm">
        <div className="pointer-events-none absolute -left-10 top-0 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
        <div className="pointer-events-none absolute -right-12 bottom-0 h-44 w-44 rounded-full bg-white/10 blur-3xl" />

        <div className="relative">
          <h1 className="text-3xl font-semibold">Notifikasi</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/90">
            Semua pengumuman penting dari administrator terkait hunianmu akan tampil di
            halaman ini.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-4">
            <StatChip label="Total Notifikasi" value={`${statusCounts.all}`} />
            <StatChip label="Terjadwal" value={`${statusCounts.scheduled}`} />
            <StatChip label="Terkirim" value={`${statusCounts.sent}`} />
            <StatChip label="Gagal" value={`${statusCounts.failed}`} />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-2">
            <FilterChip
              active={filter === "all"}
              label={`Semua (${statusCounts.all})`}
              onClick={() => setFilter("all")}
            />
            <FilterChip
              active={filter === "scheduled"}
              label={`Terjadwal (${statusCounts.scheduled})`}
              onClick={() => setFilter("scheduled")}
            />
            <FilterChip
              active={filter === "sent"}
              label={`Terkirim (${statusCounts.sent})`}
              onClick={() => setFilter("sent")}
            />
            <FilterChip
              active={filter === "failed"}
              label={`Gagal (${statusCounts.failed})`}
              onClick={() => setFilter("failed")}
            />
          </div>
        </div>
      </section>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="h-28 animate-pulse rounded-2xl border bg-white" />
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
      ) : visibleItems.length === 0 ? (
        <div className="rounded-2xl border bg-white p-10 text-center">
          <h2 className="text-xl font-semibold text-green-600">
            {showBackendNotice
              ? "Kotak masuk penyewa belum tersedia"
              : "Belum Ada Notifikasi"}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-slate-600">
            {showBackendNotice
              ? "Sistem yang digunakan saat ini belum membuka layanan notifikasi khusus penyewa."
              : "Semua pengumuman penting dari administrator akan muncul di halaman ini."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleItems.map((item) => (
            <article
              key={item.id}
              className="rounded-2xl border bg-white p-5 shadow-sm transition hover:border-green-300 hover:shadow"
            >
              <div className="flex items-start gap-3">
                <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  {statusIconMap[item.status]}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                      <BellRing size={12} />
                      {item.target_property || item.property.name || "Semua Properti"}
                    </p>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        statusBadgeMap[item.status]
                      }`}
                    >
                      {statusLabelMap[item.status]}
                    </span>
                  </div>

                  <h2 className="mt-2 text-base font-semibold text-slate-800">
                    {item.subject}
                  </h2>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                    {item.message}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <Clock3 size={12} />
                      Dijadwalkan: {formatDateTime(item.scheduled_at)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <TriangleAlert size={12} />
                      Pembaruan: {formatDateTime(item.updated_at || item.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/25 bg-white/10 px-4 py-3 backdrop-blur-sm">
      <p className="text-xs text-white/80">{label}</p>
      <p className="mt-1 text-base font-semibold">{value}</p>
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
