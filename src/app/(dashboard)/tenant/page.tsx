"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowRight,
  Bell,
  CalendarCheck,
  CreditCard,
  Home,
  Wrench,
} from "lucide-react";
import {
  getApiErrorMessage,
  getTenantMaintenanceRequests,
  getTenantNotifications,
  getTenantPayments,
  isTenantNotificationsUnavailableMessage,
  type TenantCommunication,
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

const getBillStatusLabel = (status: TenantPayment["status"]) => {
  if (status === "overdue") {
    return "Terlambat";
  }

  return "Menunggu Pembayaran";
};

const getBillStatusBadgeClass = (status: TenantPayment["status"]) => {
  if (status === "overdue") {
    return "bg-red-100 text-red-700";
  }

  return "bg-yellow-100 text-yellow-700";
};

type RecentActivity = {
  id: string;
  title: string;
  description: string;
  time: string;
  timestamp: number;
  href: string;
  type: "tagihan" | "perawatan" | "notifikasi";
};

const toTimestamp = (...values: Array<string | null | undefined>) => {
  for (const value of values) {
    if (!value) {
      continue;
    }

    const timestamp = new Date(value).getTime();
    if (!Number.isNaN(timestamp)) {
      return timestamp;
    }
  }

  return 0;
};

const activityBadgeClass: Record<RecentActivity["type"], string> = {
  tagihan: "bg-yellow-100 text-yellow-700",
  perawatan: "bg-blue-100 text-blue-700",
  notifikasi: "bg-purple-100 text-purple-700",
};

export default function TenantHomePage() {
  const [payments, setPayments] = useState<TenantPayment[]>([]);
  const [maintenance, setMaintenance] = useState<TenantMaintenanceRequest[]>([]);
  const [notifications, setNotifications] = useState<TenantCommunication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notificationNotice, setNotificationNotice] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;

    const loadHomeData = async () => {
      setIsLoading(true);
      setError(null);
      setNotificationNotice(null);

      try {
        const [paymentsResponse, maintenanceResponse, notificationsResponse] =
          await Promise.all([
            getTenantPayments({
              page: 1,
              per_page: 100,
              sort: "due_date",
            }),
            getTenantMaintenanceRequests({
              page: 1,
              per_page: 100,
            }),
            getTenantNotifications({
              page: 1,
              per_page: 20,
            }),
          ]);

        if (!active) {
          return;
        }

        setPayments(paymentsResponse.data);
        setMaintenance(maintenanceResponse.data);
        setNotifications(notificationsResponse.data);
        setNotificationNotice(notificationsResponse.message || null);
        setHasLoadedOnce(true);
        setLastUpdatedAt(new Date().toISOString());
      } catch (loadError) {
        if (!active) {
          return;
        }

        setError(
          getApiErrorMessage(
            loadError,
            "Gagal memuat data beranda penyewa. Silakan coba lagi."
          )
        );
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadHomeData();

    return () => {
      active = false;
    };
  }, [refreshKey]);

  const activeBills = useMemo(() => {
    return payments.filter((payment) => {
      return payment.status === "waiting" || payment.status === "overdue";
    });
  }, [payments]);

  const activeMaintenance = useMemo(() => {
    return maintenance.filter((item) => {
      return item.status !== "completed" && item.status !== "cancelled";
    });
  }, [maintenance]);

  const latestMaintenance = useMemo(() => {
    return [...activeMaintenance]
      .sort((first, second) => {
        const firstDate = toTimestamp(
          first.requested_date,
          first.updated_at,
          first.created_at
        );
        const secondDate = toTimestamp(
          second.requested_date,
          second.updated_at,
          second.created_at
        );
        return secondDate - firstDate;
      })
      .slice(0, 3);
  }, [activeMaintenance]);

  const nearestBills = useMemo(() => {
    return [...activeBills]
      .sort((first, second) => {
        const firstDate = new Date(first.due_date || first.created_at || 0).getTime();
        const secondDate = new Date(
          second.due_date || second.created_at || 0
        ).getTime();
        return firstDate - secondDate;
      })
      .slice(0, 3);
  }, [activeBills]);

  const latestNotifications = useMemo(() => {
    return [...notifications]
      .sort((first, second) => {
        const firstDate = new Date(
          first.scheduled_at || first.created_at || 0
        ).getTime();
        const secondDate = new Date(
          second.scheduled_at || second.created_at || 0
        ).getTime();
        return secondDate - firstDate;
      })
      .slice(0, 3);
  }, [notifications]);

  const totalActiveBillsAmount = activeBills.reduce((sum, payment) => {
    return sum + payment.amount;
  }, 0);

  const dueIn7DaysCount = activeBills.filter((payment) => {
    if (!payment.due_date) {
      return false;
    }

    const dueAt = new Date(payment.due_date).getTime();
    const now = Date.now();
    const diff = dueAt - now;
    return diff >= 0 && diff <= 7 * 24 * 60 * 60 * 1000;
  }).length;

  const recentActivities = useMemo(() => {
    const billActivities: RecentActivity[] = activeBills.slice(0, 3).map((bill) => {
      const timestamp = toTimestamp(bill.due_date, bill.updated_at, bill.created_at);
      return {
        id: `bill-${bill.id}`,
        type: "tagihan",
        title: bill.property.name || "Tagihan",
        description: `${bill.unit.name || "-"} • ${formatCurrency(bill.amount)} • ${getBillStatusLabel(
          bill.status
        )}`,
        time: formatDateTime(bill.due_date || bill.updated_at || bill.created_at),
        timestamp,
        href: "/tenant/pembayaran",
      };
    });

    const maintenanceActivities: RecentActivity[] = latestMaintenance.map((item) => {
      const timestamp = toTimestamp(
        item.requested_date,
        item.updated_at,
        item.created_at
      );
      return {
        id: `maintenance-${item.id}`,
        type: "perawatan",
        title: item.issue || "Laporan perawatan",
        description: `${item.property.name || "-"} • ${item.unit.name || "-"} • ${
          item.status
        }`,
        time: formatDateTime(item.updated_at || item.requested_date || item.created_at),
        timestamp,
        href: "/tenant/perawatan",
      };
    });

    const notificationActivities: RecentActivity[] = latestNotifications.map((item) => {
      const timestamp = toTimestamp(item.scheduled_at, item.created_at, item.updated_at);
      return {
        id: `notification-${item.id}`,
        type: "notifikasi",
        title: item.subject || "Notifikasi baru",
        description: item.message,
        time: formatDateTime(item.scheduled_at || item.created_at || item.updated_at),
        timestamp,
        href: "/tenant/notifikasi",
      };
    });

    return [...billActivities, ...maintenanceActivities, ...notificationActivities]
      .sort((first, second) => second.timestamp - first.timestamp)
      .slice(0, 6);
  }, [activeBills, latestMaintenance, latestNotifications]);

  const showNotificationBackendNotice =
    isTenantNotificationsUnavailableMessage(notificationNotice) &&
    latestNotifications.length === 0;

  const refreshData = () => {
    if (isLoading) {
      return;
    }

    setRefreshKey((value) => value + 1);
  };

  const isInitialLoading = isLoading && !hasLoadedOnce;
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-green-600">Beranda Penyewa</h1>
          <p className="mt-1 text-slate-600">
            Ringkasan cepat tagihan, perawatan, dan notifikasi terbaru.
          </p>
          {lastUpdatedAt && (
            <p className="mt-1 text-xs text-slate-500">
              Pembaruan terakhir: {formatDateTime(lastUpdatedAt)}
            </p>
          )}
        </div>
      </div>

      {isInitialLoading ? (
        <div className="rounded-2xl border bg-white p-8 text-sm text-slate-500">
          Memuat data beranda penyewa...
        </div>
      ) : !hasLoadedOnce && error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <p className="text-sm text-red-700">{error}</p>
          <button
            type="button"
            onClick={refreshData}
            className="mt-4 inline-flex h-10 items-center rounded-xl border border-red-200 bg-white px-4 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            Coba Lagi
          </button>
        </div>
      ) : (
        <>
          <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-green-600 to-emerald-700 p-6 text-white shadow-sm">
            <div className="relative z-10">
              <p className="text-sm text-white/90">Ringkasan Hunian Kamu</p>
              <h2 className="mt-1 text-2xl font-semibold">
                Semua kebutuhan sewa dalam satu beranda
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-white/90">
                Cek pembayaran, pantau perawatan, dan ikuti notifikasi terbaru
                tanpa perlu pindah-pindah halaman.
              </p>

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-white/15 p-3 backdrop-blur-sm">
                  <p className="text-xs text-white/80">Tagihan aktif</p>
                  <p className="mt-1 text-lg font-semibold">
                    {activeBills.length} item
                  </p>
                </div>
                <div className="rounded-xl bg-white/15 p-3 backdrop-blur-sm">
                  <p className="text-xs text-white/80">Jatuh tempo 7 hari</p>
                  <p className="mt-1 text-lg font-semibold">
                    {dueIn7DaysCount} item
                  </p>
                </div>
                <div className="rounded-xl bg-white/15 p-3 backdrop-blur-sm">
                  <p className="text-xs text-white/80">Perawatan aktif</p>
                  <p className="mt-1 text-lg font-semibold">
                    {activeMaintenance.length} laporan
                  </p>
                </div>
              </div>
            </div>
            <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-white/20 blur-2xl" />
          </section>

          {isLoading && (
            <div className="rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700">
              Sedang menyegarkan data terbaru...
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm text-red-700">{error}</p>
              <button
                type="button"
                onClick={refreshData}
                className="mt-3 inline-flex h-9 items-center rounded-lg border border-red-200 bg-white px-3 text-sm font-medium text-red-700 hover:bg-red-50"
              >
                Coba Lagi
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <SummaryCard
              title="Tagihan Aktif"
              value={`${activeBills.length} Tagihan`}
              helper={formatCurrency(totalActiveBillsAmount)}
              icon={<CreditCard size={18} />}
            />
            <SummaryCard
              title="Perawatan Aktif"
              value={`${activeMaintenance.length} Laporan`}
              helper={
                activeMaintenance.length > 0
                  ? "Sedang diproses"
                  : "Tidak ada laporan aktif"
              }
              icon={<Wrench size={18} />}
            />
            <SummaryCard
              title="Notifikasi Baru"
              value={`${latestNotifications.length} Notifikasi`}
              helper={
                showNotificationBackendNotice
                  ? "Kotak masuk penyewa belum tersedia"
                  : "Periksa info terbaru dari administrator"
              }
              icon={<Bell size={18} />}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <ActionCard
              href="/tenant/kost-saya"
              icon={<Home size={18} />}
              title="Kost Saya"
              description="Lihat ringkasan unit, status sewa, dan info hunian lengkap."
              actionLabel="Buka Kost Saya"
            />
            <ActionCard
              href="/tenant/pembayaran"
              icon={<CreditCard size={18} />}
              title="Tagihan & Pembayaran"
              description="Cek jatuh tempo, nominal tagihan, dan riwayat pembayaran."
              actionLabel="Lihat Pembayaran"
            />
            <ActionCard
              href="/tenant/perawatan"
              icon={<Wrench size={18} />}
              title="Perawatan Unit"
              description="Pantau progres laporan perbaikan dan tindak lanjutnya."
              actionLabel="Buka Perawatan"
            />
            <ActionCard
              href="/tenant/jadwal-visit"
              icon={<CalendarCheck size={18} />}
              title="Jadwal Kunjungan"
              description="Pantau jadwal survei kost yang sudah kamu ajukan."
              actionLabel="Lihat Jadwal"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-slate-800">
                  Tagihan Jatuh Tempo Terdekat
                </h2>
                <Link
                  href="/tenant/pembayaran"
                  className="inline-flex items-center gap-1 text-sm font-medium text-green-700 hover:text-green-800"
                >
                  Lihat Semua
                  <ArrowRight size={14} />
                </Link>
              </div>

              {nearestBills.length === 0 ? (
                <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">
                    Tidak ada tagihan aktif saat ini.
                  </p>
                  <Link
                    href="/tenant/pembayaran"
                    className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-green-700 hover:text-green-800"
                  >
                    Buka Halaman Pembayaran
                    <ArrowRight size={14} />
                  </Link>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {nearestBills.map((bill) => (
                    <div
                      key={bill.id}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                    >
                      <p className="font-medium text-slate-800">
                        {bill.property.name || "-"} • {bill.unit.name || "-"}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        Jatuh Tempo: {formatDate(bill.due_date)}
                      </p>
                      <p className="text-sm font-semibold text-slate-800">
                        {formatCurrency(bill.amount)}
                      </p>
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getBillStatusBadgeClass(
                            bill.status
                          )}`}
                        >
                          {getBillStatusLabel(bill.status)}
                        </span>

                        <Link
                          href="/tenant/pembayaran"
                          className="inline-flex items-center gap-1 text-xs font-medium text-green-700 hover:text-green-800"
                        >
                          Bayar Sekarang
                          <ArrowRight size={12} />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl border bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-slate-800">
                  Notifikasi Terbaru
                </h2>
                <Link
                  href="/tenant/notifikasi"
                  className="inline-flex items-center gap-1 text-sm font-medium text-green-700 hover:text-green-800"
                >
                  Lihat Semua
                  <ArrowRight size={14} />
                </Link>
              </div>

              {latestNotifications.length === 0 ? (
                <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">
                    {showNotificationBackendNotice
                      ? "Sistem belum membuka notifikasi khusus penyewa."
                      : "Belum ada notifikasi terbaru."}
                  </p>
                  <Link
                    href="/tenant/bantuan"
                    className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-green-700 hover:text-green-800"
                  >
                    Buka Pusat Bantuan
                    <ArrowRight size={14} />
                  </Link>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {latestNotifications.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                    >
                      <p className="font-medium text-slate-800">{item.subject}</p>
                      <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                        {item.message}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatDateTime(item.scheduled_at || item.created_at)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-slate-800">
                  Aktivitas Terbaru
                </h2>
                <Link
                  href="/tenant/notifikasi"
                  className="inline-flex items-center gap-1 text-sm font-medium text-green-700 hover:text-green-800"
                >
                  Lihat Detail
                  <ArrowRight size={14} />
                </Link>
              </div>

              {recentActivities.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">
                  Belum ada aktivitas terbaru.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {recentActivities.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium text-slate-800">{item.title}</p>
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                            activityBadgeClass[item.type]
                          }`}
                        >
                          {item.type}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                        {item.description}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <p className="text-xs text-slate-500">{item.time}</p>
                        <Link
                          href={item.href}
                          className="inline-flex items-center gap-1 text-xs font-medium text-green-700 hover:text-green-800"
                        >
                          Buka
                          <ArrowRight size={12} />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl border bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-800">
                Panduan Cepat Penyewa
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Langkah singkat agar pengelolaan hunian tetap lancar setiap bulan.
              </p>

              <div className="mt-4 space-y-3">
                <GuideItem
                  title="Cek tagihan mingguan"
                  description="Pantau jatuh tempo supaya pembayaran tidak terlambat."
                  href="/tenant/pembayaran"
                />
                <GuideItem
                  title="Laporkan perawatan sejak awal"
                  description="Semakin cepat dilaporkan, semakin cepat ditindaklanjuti."
                  href="/tenant/perawatan"
                />
                <GuideItem
                  title="Pantau notifikasi dari administrator"
                  description="Info penting terkait hunian dan operasional dikirim lewat notifikasi."
                  href="/tenant/notifikasi"
                />
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}

function SummaryCard({
  title,
  value,
  helper,
  icon,
}: {
  title: string;
  value: string;
  helper: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-green-700">
        {icon}
      </div>
      <p className="mt-2 text-sm text-slate-500">{title}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-800">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{helper}</p>
    </div>
  );
}

function GuideItem({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="font-medium text-slate-800">{title}</p>
      <p className="mt-1 text-sm text-slate-600">{description}</p>
      <Link
        href={href}
        className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-green-700 hover:text-green-800"
      >
        Buka Halaman
        <ArrowRight size={12} />
      </Link>
    </div>
  );
}

function ActionCard({
  href,
  icon,
  title,
  description,
  actionLabel,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  description: string;
  actionLabel: string;
}) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <h3 className="flex items-center gap-2 text-base font-semibold text-slate-800">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-green-700">
          {icon}
        </span>
        {title}
      </h3>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
      <Link
        href={href}
        className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-green-600 px-4 text-sm font-medium text-white transition hover:bg-green-700"
      >
        {actionLabel}
        <ArrowRight size={14} />
      </Link>
    </div>
  );
}
