"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CircleAlert,
  CircleCheckBig,
  Clock3,
  ReceiptText,
  Wrench,
} from "lucide-react";
import {
  getApiErrorMessage,
  getTenantMaintenanceRequests,
  getTenantPayments,
  type TenantMaintenanceRequest,
  type TenantPayment,
} from "@/lib/dashboard/tenant.api";

const CURRENCY_FORMATTER = new Intl.NumberFormat("id-ID");

const formatCurrency = (value: number) => {
  return `Rp ${CURRENCY_FORMATTER.format(value || 0)}`;
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

const getTimestamp = (value?: string | null) => {
  if (!value) {
    return 0;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 0;
  }

  return date.getTime();
};

type ActivityTone = "emerald" | "amber" | "blue" | "slate";

type TenantActivityItem = {
  id: string;
  type: "payment" | "maintenance";
  title: string;
  subtitle: string;
  statusLabel: string;
  tone: ActivityTone;
  amountLabel?: string;
  timeLabel: string;
  timeValue: number;
  href: string;
};

export default function KostSayaPage() {
  const [payments, setPayments] = useState<TenantPayment[]>([]);
  const [maintenance, setMaintenance] = useState<TenantMaintenanceRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [paymentsResponse, maintenanceResponse] = await Promise.all([
          getTenantPayments({ page: 1, per_page: 100, sort: "due_date" }),
          getTenantMaintenanceRequests({ page: 1, per_page: 100 }),
        ]);

        if (!active) {
          return;
        }

        setPayments(paymentsResponse.data);
        setMaintenance(maintenanceResponse.data);
      } catch (loadError) {
        if (!active) {
          return;
        }

        setError(
          getApiErrorMessage(
            loadError,
            "Gagal memuat data hunian. Silakan coba lagi."
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

  const latestPayment = useMemo(() => {
    if (payments.length === 0) {
      return null;
    }

    return [...payments].sort((a, b) => {
      const aDate = new Date(a.due_date || a.created_at || 0).getTime();
      const bDate = new Date(b.due_date || b.created_at || 0).getTime();
      return bDate - aDate;
    })[0];
  }, [payments]);

  const activeBills = payments.filter((payment) => {
    return payment.status === "waiting" || payment.status === "overdue";
  });

  const activeMaintenanceCount = maintenance.filter((item) => {
    return item.status !== "completed" && item.status !== "cancelled";
  }).length;

  const recentActivities = useMemo<TenantActivityItem[]>(() => {
    const paymentActivities = payments.map((payment) => {
      const statusMap: Record<
        TenantPayment["status"],
        { label: string; tone: ActivityTone; title: string }
      > = {
        waiting: {
          label: "Menunggu Bayar",
          tone: "amber",
          title: "Tagihan baru diterbitkan",
        },
        overdue: {
          label: "Lewat Jatuh Tempo",
          tone: "amber",
          title: "Tagihan melewati jatuh tempo",
        },
        paid: {
          label: "Berhasil Dibayar",
          tone: "emerald",
          title: "Pembayaran berhasil",
        },
        cancelled: {
          label: "Dibatalkan",
          tone: "slate",
          title: "Tagihan dibatalkan",
        },
      };

      const status = statusMap[payment.status];
      const referenceTime = payment.paid_at || payment.due_date || payment.created_at;

      return {
        id: `payment-${payment.id}`,
        type: "payment" as const,
        title: status.title,
        subtitle: `${payment.property.name || "-"} • ${payment.unit.name || "-"}`,
        statusLabel: status.label,
        tone: status.tone,
        amountLabel: formatCurrency(payment.amount),
        timeLabel: formatDateTime(referenceTime),
        timeValue: getTimestamp(referenceTime),
        href: "/tenant/pembayaran",
      };
    });

    const maintenanceActivities = maintenance.map((item) => {
      const statusMap: Record<
        TenantMaintenanceRequest["status"],
        { label: string; tone: ActivityTone; title: string }
      > = {
        unassigned: {
          label: "Menunggu Penanganan",
          tone: "amber",
          title: "Laporan perawatan diterima",
        },
        assigned: {
          label: "Teknisi Ditugaskan",
          tone: "blue",
          title: "Teknisi sudah ditugaskan",
        },
        pending_vendor: {
          label: "Menunggu Vendor",
          tone: "blue",
          title: "Menunggu konfirmasi vendor",
        },
        in_progress: {
          label: "Sedang Dikerjakan",
          tone: "blue",
          title: "Perawatan sedang dikerjakan",
        },
        completed: {
          label: "Selesai",
          tone: "emerald",
          title: "Perawatan telah selesai",
        },
        cancelled: {
          label: "Dibatalkan",
          tone: "slate",
          title: "Laporan dibatalkan",
        },
      };

      const status = statusMap[item.status];
      const referenceTime =
        item.repair_date || item.requested_date || item.updated_at || item.created_at;

      return {
        id: `maintenance-${item.id}`,
        type: "maintenance" as const,
        title: status.title,
        subtitle: `${item.issue} • ${item.unit.name || "-"}`,
        statusLabel: status.label,
        tone: status.tone,
        timeLabel: formatDateTime(referenceTime),
        timeValue: getTimestamp(referenceTime),
        href: "/tenant/perawatan",
      };
    });

    return [...paymentActivities, ...maintenanceActivities]
      .sort((a, b) => b.timeValue - a.timeValue)
      .slice(0, 8);
  }, [maintenance, payments]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-green-600">Kost Saya</h1>
        <p className="mt-1 text-slate-600">
          Ringkasan status hunian, tagihan, dan perawatan unit kamu.
        </p>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border bg-white p-8 text-sm text-slate-500">
          Memuat data hunian...
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
      ) : !latestPayment ? (
        <div className="rounded-2xl border bg-white p-10 text-center">
          <h2 className="text-xl font-semibold text-green-600">
            Kamu Belum Memiliki Hunian Aktif
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-slate-600">
            Saat belum ada sewa aktif, ringkasan unit akan tampil di halaman ini.
          </p>
          <Link
            href="/sewa"
            className="mt-6 inline-flex rounded-xl bg-green-600 px-6 py-2 font-medium text-white hover:bg-green-700"
          >
            Cari Kost Sekarang
          </Link>
        </div>
      ) : (
        <>
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-800">
              {latestPayment.property.name || "-"}
            </h2>
            <p className="mt-1 text-slate-600">{latestPayment.unit.name || "-"}</p>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <InfoCard
                label="Tagihan Aktif"
                value={`${activeBills.length} Tagihan`}
                helper={
                  activeBills.length > 0
                    ? formatCurrency(activeBills.reduce((sum, item) => sum + item.amount, 0))
                    : "Tidak ada tunggakan"
                }
              />
              <InfoCard
                label="Perawatan Aktif"
                value={`${activeMaintenanceCount} Laporan`}
                helper={
                  activeMaintenanceCount > 0
                    ? "Sedang diproses"
                    : "Tidak ada laporan aktif"
                }
              />
              <InfoCard
                label="Jatuh Tempo Terdekat"
                value={formatDate(latestPayment.due_date)}
                helper={formatCurrency(latestPayment.amount)}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Link
              href="/tenant/pembayaran"
              className="rounded-2xl border bg-white p-5 shadow-sm transition hover:border-green-300"
            >
              <h3 className="text-base font-semibold text-slate-800">
                Lihat Tagihan & Pembayaran
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                Cek status pembayaran dan riwayat transaksi sewa kamu.
              </p>
            </Link>

            <Link
              href="/tenant/perawatan"
              className="rounded-2xl border bg-white p-5 shadow-sm transition hover:border-blue-300"
            >
              <h3 className="text-base font-semibold text-slate-800">
                Lihat Status Perawatan
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                Pantau laporan perbaikan dan progres penyelesaiannya.
              </p>
            </Link>

            <Link
              href="/tenant/kost-saya/detail"
              className="rounded-2xl border bg-white p-5 shadow-sm transition hover:border-indigo-300"
            >
              <h3 className="text-base font-semibold text-slate-800">
                Detail Kost
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                Lihat informasi lengkap properti dan unit yang sedang kamu tempati.
              </p>
            </Link>
          </div>

          <section className="rounded-2xl border bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold text-slate-800">
                  Aktivitas Saya
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Update terbaru pembayaran dan laporan perawatan unit kamu.
                </p>
              </div>

              <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700">
                {recentActivities.length} aktivitas terbaru
              </div>
            </div>

            {recentActivities.length === 0 ? (
              <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                <p className="text-sm text-slate-600">
                  Aktivitas kamu akan muncul di sini setelah ada pembayaran atau
                  laporan perawatan.
                </p>
              </div>
            ) : (
              <div className="mt-5 grid gap-3">
                {recentActivities.map((item) => (
                  <ActivityCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function InfoCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-800">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{helper}</p>
    </div>
  );
}

function ActivityCard({ item }: { item: TenantActivityItem }) {
  const toneClass: Record<ActivityTone, string> = {
    emerald: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    amber: "bg-amber-50 text-amber-700 border border-amber-200",
    blue: "bg-blue-50 text-blue-700 border border-blue-200",
    slate: "bg-slate-100 text-slate-700 border border-slate-200",
  };

  return (
    <article className="rounded-xl border border-slate-200 bg-gradient-to-r from-white to-slate-50 p-4 transition hover:border-green-300 hover:shadow-sm">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-700">
          {item.type === "payment" ? <ReceiptText size={17} /> : <Wrench size={17} />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-slate-900">{item.title}</p>
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${toneClass[item.tone]}`}>
              {item.statusLabel}
            </span>
          </div>

          <p className="mt-1 text-sm text-slate-600">{item.subtitle}</p>

          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Clock3 size={13} />
              {item.timeLabel}
            </span>

            {item.amountLabel ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
                <CircleCheckBig size={12} />
                {item.amountLabel}
              </span>
            ) : null}
          </div>
        </div>

        <Link
          href={item.href}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-green-300 hover:text-green-700"
        >
          <CircleAlert size={12} />
          Detail
        </Link>
      </div>
    </article>
  );
}
