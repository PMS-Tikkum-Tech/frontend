"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowRight,
  Building2,
  CircleAlert,
  CircleCheckBig,
  Clock3,
  Home,
  ReceiptText,
  Wrench,
} from "lucide-react";
import {
  getApiErrorMessage,
  getTenantMaintenanceRequests,
  getTenantPayments,
  getTenantStays,
  type TenantMaintenanceRequest,
  type TenantPayment,
  type TenantStaySummary,
} from "@/lib/dashboard/tenant.api";
import DeadlineCountdown from "@/components/ui/DeadlineCountdown";
import SafeImage from "@/components/ui/SafeImage";
import { getTenantUnitDisplayName } from "@/lib/dashboard/tenant-unit-display";
import { formatDueDate, isDueDateReached } from "@/lib/due-date";

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

const getStayUnitDisplayName = (stay: TenantStaySummary) => {
  return getTenantUnitDisplayName({
    name: stay.unit_name,
    unit_name: stay.unit_name,
    unit_number: stay.unit_number,
    room_number: stay.room_number,
    building_name: stay.building_name,
    block_name: stay.block_name,
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

const getPaymentDisplayStatus = (
  payment: Pick<TenantPayment, "status" | "due_date" | "booking_status">
): TenantPayment["status"] => {
  if (payment.status === "overdue") {
    return "cancelled";
  }

  const canAutoCancelByDueDate =
    !payment.booking_status || payment.booking_status === "awaiting_payment";

  if (
    canAutoCancelByDueDate &&
    payment.status === "waiting" &&
    isDueDateReached(payment.due_date)
  ) {
    return "cancelled";
  }

  return payment.status;
};

type ActivityTone = "emerald" | "amber" | "orange" | "rose" | "blue" | "slate";

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
  const [stays, setStays] = useState<TenantStaySummary[]>([]);
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
        const [staysResponse, paymentsResponse, maintenanceResponse] = await Promise.all([
          getTenantStays({ page: 1, per_page: 100, tab: "active" }),
          getTenantPayments({ page: 1, per_page: 100, sort: "due_date" }),
          getTenantMaintenanceRequests({ page: 1, per_page: 100 }),
        ]);

        if (!active) {
          return;
        }

        setStays(staysResponse.data);
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
    return getPaymentDisplayStatus(payment) === "waiting";
  });

  const activeMaintenanceCount = maintenance.filter((item) => {
    return item.status !== "completed" && item.status !== "cancelled";
  }).length;

  const primaryStay = stays[0] || null;
  const uniquePropertyCount = useMemo(() => {
    return new Set(
      stays
        .map((stay) => stay.property_name?.trim())
        .filter((value): value is string => Boolean(value))
    ).size;
  }, [stays]);

  const nextDuePayment = useMemo(() => {
    return [...activeBills].sort((a, b) => {
      const aDate = getTimestamp(a.due_date || a.created_at);
      const bDate = getTimestamp(b.due_date || b.created_at);
      return aDate - bDate;
    })[0] || null;
  }, [activeBills]);

  const detailHref = primaryStay?.property_id
    ? `/sewa/${primaryStay.property_id}`
    : "/sewa";

  const recentActivities = useMemo<TenantActivityItem[]>(() => {
    const paymentActivities = payments.map((payment) => {
      const statusMap: Record<
        TenantPayment["status"],
        { label: string; tone: ActivityTone; title: string }
      > = {
        waiting: {
          label: "Menunggu Bayar",
          tone: "orange",
          title: "Tagihan baru diterbitkan",
        },
        overdue: {
          label: "Lewat Batas Bayar",
          tone: "rose",
          title: "Pembayaran melewati batas waktu",
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

      const displayStatus = getPaymentDisplayStatus(payment);
      const status = statusMap[displayStatus];
      const referenceTime = payment.paid_at || payment.due_date || payment.created_at;

      return {
        id: `payment-${payment.id}`,
        type: "payment" as const,
        title: status.title,
        subtitle: `${payment.property.name || "-"} • ${getTenantUnitDisplayName(payment.unit)}`,
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
        subtitle: `${item.issue} • ${getTenantUnitDisplayName(item.unit)}`,
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
      {isLoading ? (
        <div className="rounded-2xl border bg-white p-4 text-sm text-slate-500 sm:p-8">
          Memuat data hunian...
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
      ) : stays.length === 0 && !latestPayment ? (
        <div className="rounded-2xl border bg-white p-4 text-center sm:p-10">
          <h2 className="text-lg font-semibold text-green-600 sm:text-xl">
            Kamu Belum Memiliki Hunian Aktif
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-slate-600">
            Saat belum ada sewa aktif, ringkasan unit akan tampil di halaman ini.
          </p>
          <Link
            href="/sewa"
            className="mt-6 inline-flex w-full justify-center rounded-xl bg-green-600 px-6 py-2 font-medium text-white hover:bg-green-700 sm:w-auto"
          >
            Cari Kost Sekarang
          </Link>
        </div>
      ) : (
        <>
          <div className="relative overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-cyan-50 p-4 shadow-sm sm:p-6">
            <div className="pointer-events-none absolute -left-12 -top-12 h-36 w-36 rounded-full bg-emerald-200/50 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-14 right-0 h-44 w-44 rounded-full bg-cyan-200/50 blur-3xl" />

            <div className="relative flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-slate-900">Kost Saya</h1>
                <p className="mt-1 text-sm text-slate-600">
                  Ringkasan status hunian, tagihan, dan perawatan unit kamu.
                </p>
                <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                  <Building2 size={13} />
                  {stays.length > 0 ? `${stays.length} Hunian Aktif` : "Hunian Aktif"}
                </p>
                <h2 className="mt-3 text-xl font-semibold text-slate-900 sm:text-2xl">
                  {stays.length > 1
                    ? `${stays.length} unit aktif di ${Math.max(uniquePropertyCount, 1)} kost`
                    : primaryStay?.property_name || latestPayment?.property.name || "-"}
                </h2>
                {stays.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {stays.slice(0, 4).map((stay) => (
                      <span
                        key={stay.booking_id}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 sm:text-sm"
                      >
                        <Home size={14} className="text-emerald-700" />
                        {getStayUnitDisplayName(stay)}
                      </span>
                    ))}
                  </div>
                ) : latestPayment ? (
                  <p className="mt-2 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 sm:text-sm">
                    <Home size={14} className="text-emerald-700" />
                    {getTenantUnitDisplayName(latestPayment.unit)}
                  </p>
                ) : null}
                <p className="mt-3 text-sm text-slate-600">
                  Kelola semua unit aktif, tagihan, dan perawatan tenant dalam satu halaman.
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-white/85 px-4 py-3 text-left shadow-sm sm:text-right">
                <p className="text-xs font-medium text-slate-500">Total tagihan terbuka</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {formatCurrency(
                    activeBills.reduce((sum, item) => sum + item.amount, 0)
                  )}
                </p>
                <p className="mt-1 text-xs text-emerald-700">
                  {activeBills.length > 0
                    ? `${activeBills.length} tagihan perlu ditindaklanjuti`
                    : "Semua tagihan dalam kondisi aman"}
                </p>
              </div>
            </div>

            <div className="relative mt-5 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              <InfoCard
                label="Hunian Aktif"
                value={`${stays.length} Unit`}
                helper={
                  stays.length > 0
                    ? `${Math.max(uniquePropertyCount, 1)} kost sedang berjalan`
                    : "Belum ada hunian aktif"
                }
                tone="emerald"
                icon={<Building2 size={16} />}
              />
              <InfoCard
                label="Tagihan Aktif"
                value={`${activeBills.length} Tagihan`}
                helper={
                  activeBills.length > 0
                    ? formatCurrency(activeBills.reduce((sum, item) => sum + item.amount, 0))
                    : "Tidak ada tunggakan"
                }
                tone="amber"
                icon={<ReceiptText size={16} />}
              />
              <InfoCard
                label="Perawatan Aktif"
                value={`${activeMaintenanceCount} Laporan`}
                helper={
                  activeMaintenanceCount > 0
                    ? "Sedang diproses"
                    : "Tidak ada laporan aktif"
                }
                tone="sky"
                icon={<Wrench size={16} />}
              />
              <InfoCard
                label="Batas Pembayaran Terdekat"
                value={formatDueDate(nextDuePayment?.due_date)}
                helper={
                  nextDuePayment ? (
                    <span className="inline-flex flex-col gap-1">
                      <span>{formatCurrency(nextDuePayment.amount)}</span>
                      <DeadlineCountdown
                        value={nextDuePayment.due_date}
                        variant="text"
                      />
                    </span>
                  ) : (
                    "Tidak ada tagihan aktif"
                  )
                }
                tone="indigo"
                icon={<Clock3 size={16} />}
              />
            </div>
          </div>

          {stays.length > 0 ? (
            <section className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 sm:text-xl">
                    Hunian Aktif
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Setiap unit memiliki tagihan dan status perawatan masing-masing.
                  </p>
                </div>
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700">
                  {stays.length} unit terdaftar
                </span>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {stays.map((stay) => {
                  const stayPayments = payments
                    .filter((payment) => payment.id === stay.booking_id)
                    .sort((a, b) => {
                      const aDate = getTimestamp(a.due_date || a.created_at);
                      const bDate = getTimestamp(b.due_date || b.created_at);
                      return aDate - bDate;
                    });
                  const openStayPayments = stayPayments.filter((payment) => {
                    return getPaymentDisplayStatus(payment) === "waiting";
                  });
                  const stayMaintenance = maintenance.filter((item) => {
                    return (
                      item.property.name === stay.property_name &&
                      item.unit.name === stay.unit_name &&
                      item.status !== "completed" &&
                      item.status !== "cancelled"
                    );
                  });

                  return (
                    <ActiveStayCard
                      key={stay.booking_id}
                      stay={stay}
                      latestPayment={stayPayments[0] || null}
                      openBillCount={openStayPayments.length}
                      openBillAmount={openStayPayments.reduce(
                        (sum, item) => sum + item.amount,
                        0
                      )}
                      activeMaintenanceCount={stayMaintenance.length}
                    />
                  );
                })}
              </div>
            </section>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <QuickActionCard
              href="/tenant/pembayaran"
              title="Lihat Tagihan & Pembayaran"
              description="Cek status pembayaran dan riwayat transaksi sewa kamu."
              icon={<ReceiptText size={20} />}
              tone="emerald"
            />

            <QuickActionCard
              href="/tenant/perawatan"
              title="Lihat Status Perawatan"
              description="Pantau laporan perbaikan dan progres penyelesaiannya."
              icon={<Wrench size={20} />}
              tone="sky"
            />

            <QuickActionCard
              href={detailHref}
              title="Detail Kost"
              description="Lihat informasi lengkap properti dan unit yang sedang kamu tempati."
              icon={<Home size={20} />}
              tone="indigo"
            />
          </div>

          <section className="rounded-2xl border bg-white p-4 shadow-sm sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-800 sm:text-xl">
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
              <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center sm:p-6">
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

type QuickActionTone = "emerald" | "sky" | "indigo";

function QuickActionCard({
  href,
  title,
  description,
  icon,
  tone,
}: {
  href: string;
  title: string;
  description: string;
  icon: ReactNode;
  tone: QuickActionTone;
}) {
  const toneClass: Record<
    QuickActionTone,
    {
      card: string;
      icon: string;
      badge: string;
      arrow: string;
    }
  > = {
    emerald: {
      card: "border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-green-50 hover:border-emerald-300 hover:shadow-emerald-100",
      icon: "bg-emerald-600 text-white shadow-emerald-200",
      badge: "bg-emerald-100 text-emerald-700",
      arrow: "text-emerald-700",
    },
    sky: {
      card: "border-sky-200 bg-gradient-to-br from-sky-50 via-white to-cyan-50 hover:border-sky-300 hover:shadow-sky-100",
      icon: "bg-sky-600 text-white shadow-sky-200",
      badge: "bg-sky-100 text-sky-700",
      arrow: "text-sky-700",
    },
    indigo: {
      card: "border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-violet-50 hover:border-indigo-300 hover:shadow-indigo-100",
      icon: "bg-indigo-600 text-white shadow-indigo-200",
      badge: "bg-indigo-100 text-indigo-700",
      arrow: "text-indigo-700",
    },
  };
  const classes = toneClass[tone];

  return (
    <Link
      href={href}
      className={`group relative overflow-hidden rounded-2xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg sm:p-5 ${classes.card}`}
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/70 blur-2xl" />
      <div className="relative flex items-start justify-between gap-4">
        <div className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-lg sm:h-12 sm:w-12 ${classes.icon}`}>
          {icon}
        </div>
        <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${classes.badge}`}>
          Buka
        </span>
      </div>

      <div className="relative mt-5">
        <h3 className="text-sm font-semibold text-slate-900 sm:text-base">{title}</h3>
        <p className="mt-2 min-h-[42px] text-sm leading-6 text-slate-600">
          {description}
        </p>
      </div>

      <div className={`relative mt-4 inline-flex items-center gap-2 text-sm font-semibold ${classes.arrow}`}>
        Lihat detail
        <ArrowRight
          size={15}
          className="transition group-hover:translate-x-1"
        />
      </div>
    </Link>
  );
}

function InfoCard({
  label,
  value,
  helper,
  icon,
  tone,
}: {
  label: string;
  value: string;
  helper: ReactNode;
  icon: ReactNode;
  tone: "emerald" | "amber" | "sky" | "indigo";
}) {
  const toneClass: Record<
    "emerald" | "amber" | "sky" | "indigo",
    { card: string; icon: string; helper: string }
  > = {
    emerald: {
      card: "border-emerald-200 bg-emerald-50/90",
      icon: "bg-emerald-500 text-white",
      helper: "text-emerald-700",
    },
    amber: {
      card: "border-amber-200 bg-amber-50/90",
      icon: "bg-amber-500 text-white",
      helper: "text-amber-700",
    },
    sky: {
      card: "border-sky-200 bg-sky-50/90",
      icon: "bg-sky-500 text-white",
      helper: "text-sky-700",
    },
    indigo: {
      card: "border-indigo-200 bg-indigo-50/90",
      icon: "bg-indigo-500 text-white",
      helper: "text-indigo-700",
    },
  };
  const classes = toneClass[tone];

  return (
    <div className={`rounded-2xl border p-3 shadow-sm backdrop-blur-sm sm:p-4 ${classes.card}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
          {label}
        </p>
        <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${classes.icon}`}>
          {icon}
        </span>
      </div>
      <p className="mt-3 text-base font-semibold text-slate-900 sm:text-lg">{value}</p>
      <p className={`mt-1 text-xs font-medium ${classes.helper}`}>{helper}</p>
    </div>
  );
}

function ActiveStayCard({
  stay,
  latestPayment,
  openBillCount,
  openBillAmount,
  activeMaintenanceCount,
}: {
  stay: TenantStaySummary;
  latestPayment: TenantPayment | null;
  openBillCount: number;
  openBillAmount: number;
  activeMaintenanceCount: number;
}) {
  const displayStatus = latestPayment
    ? getPaymentDisplayStatus(latestPayment)
    : stay.can_submit_payment
      ? "waiting"
      : "paid";

  const statusMap: Record<
    TenantPayment["status"],
    { label: string; className: string }
  > = {
    waiting: {
      label: stay.status_label || "Menunggu Pembayaran",
      className: "border-amber-200 bg-amber-50 text-amber-700",
    },
    paid: {
      label: stay.status_label || "Aktif",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    },
    overdue: {
      label: "Lewat Batas Bayar",
      className: "border-red-200 bg-red-50 text-red-700",
    },
    cancelled: {
      label: latestPayment ? "Dibatalkan" : stay.status_label || "Dibatalkan",
      className: "border-slate-200 bg-slate-100 text-slate-700",
    },
  };
  const heroImage = stay.roomphoto_urls?.[0] || "/bg.jpg";

  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-lg">
      <div className="relative h-36 overflow-hidden sm:h-40">
        <SafeImage
          src={heroImage}
          alt={stay.property_name || "Hunian aktif"}
          fill
          className="object-cover"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/15 to-transparent" />
        <div className="absolute left-3 right-3 top-3 flex items-start justify-between gap-2 sm:left-4 sm:right-4 sm:top-4 sm:gap-3">
          <span
            className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold sm:px-3 sm:text-[11px] ${statusMap[displayStatus].className}`}
          >
            {statusMap[displayStatus].label}
          </span>
          <span className="rounded-full border border-white/30 bg-black/35 px-2.5 py-1 text-[10px] font-medium text-white backdrop-blur-sm sm:px-3 sm:text-[11px]">
            #{stay.booking_code || stay.booking_id}
          </span>
        </div>
        <div className="absolute bottom-4 left-4 right-4 text-white">
          <p className="text-base font-semibold sm:text-lg">{stay.property_name || "-"}</p>
          <p className="mt-1 text-xs text-white/85 sm:text-sm">
            {getStayUnitDisplayName(stay)}
          </p>
        </div>
      </div>

      <div className="space-y-4 p-3 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <StayMetric
            label="Periode Tinggal"
            value={`${formatDate(stay.start_date)} - ${formatDate(stay.end_date)}`}
          />
          <StayMetric
            label="Harga Sewa"
            value={formatCurrency(stay.monthly_rent_amount)}
          />
          <StayMetric
            label="Tagihan Aktif"
            value={
              openBillCount > 0
                ? `${openBillCount} tagihan • ${formatCurrency(openBillAmount)}`
                : "Tidak ada tagihan aktif"
            }
            helper={
              latestPayment && displayStatus === "waiting" ? (
                <DeadlineCountdown value={latestPayment.due_date} variant="text" />
              ) : null
            }
          />
          <StayMetric
            label="Perawatan Aktif"
            value={
              activeMaintenanceCount > 0
                ? `${activeMaintenanceCount} laporan`
                : "Tidak ada perawatan aktif"
            }
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-slate-500">
            {stay.end_date
              ? `Akhir masa sewa: ${formatDate(stay.end_date)}`
              : "Tanggal akhir sewa belum tersedia"}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Link
              href="/tenant/pembayaran"
              className="inline-flex w-full items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-emerald-200 hover:text-emerald-700 sm:w-auto"
            >
              Tagihan
            </Link>
            <Link
              href={stay.property_id ? `/sewa/${stay.property_id}` : "/sewa"}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 sm:w-auto"
            >
              Detail Kost
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

function StayMetric({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-slate-900 sm:text-base">{value}</p>
      {helper ? <div className="mt-1">{helper}</div> : null}
    </div>
  );
}

function ActivityCard({ item }: { item: TenantActivityItem }) {
  const toneClass: Record<ActivityTone, string> = {
    emerald: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    amber: "bg-amber-50 text-amber-700 border border-amber-200",
    orange: "bg-orange-50 text-orange-700 border border-orange-200",
    rose: "bg-rose-50 text-rose-700 border border-rose-200",
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
