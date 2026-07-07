"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  Clock3,
  CreditCard,
  WalletCards,
  XCircle,
} from "lucide-react";
import {
  getApiErrorMessage,
  getTenantPayments,
  type TenantPayment,
} from "@/lib/dashboard/tenant.api";
import DeadlineCountdown from "@/components/ui/DeadlineCountdown";
import { getTenantUnitDisplayName } from "@/lib/dashboard/tenant-unit-display";
import { formatDueDate, isDueDateReached } from "@/lib/due-date";

type PaymentFilter = "all" | TenantPayment["status"];

const CURRENCY_FORMATTER = new Intl.NumberFormat("id-ID");

const statusLabelMap: Record<TenantPayment["status"], string> = {
  waiting: "Menunggu Pembayaran",
  paid: "Lunas",
  overdue: "Melewati Batas Pembayaran",
  cancelled: "Dibatalkan",
};

const statusBadgeMap: Record<TenantPayment["status"], string> = {
  waiting: "border border-yellow-200 bg-yellow-50 text-yellow-700",
  paid: "border border-green-200 bg-green-50 text-green-700",
  overdue: "border border-red-200 bg-red-50 text-red-600",
  cancelled: "border border-slate-200 bg-slate-100 text-slate-600",
};

const statusIconMap: Record<TenantPayment["status"], ReactNode> = {
  waiting: <Clock3 size={14} />,
  paid: <CheckCircle2 size={14} />,
  overdue: <CircleAlert size={14} />,
  cancelled: <XCircle size={14} />,
};

const formatCurrency = (value: number) => {
  return `Rp ${CURRENCY_FORMATTER.format(value || 0)}`;
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

const getPaymentDisplayStatus = (payment: TenantPayment): TenantPayment["status"] => {
  if (isAutoCancelledByDueDate(payment)) {
    return "cancelled";
  }

  return payment.status;
};

const isAutoCancelledByDueDate = (payment: TenantPayment) => {
  const canAutoCancelByDueDate =
    !payment.booking_status || payment.booking_status === "awaiting_payment";

  return (
    payment.status === "overdue" ||
    (canAutoCancelByDueDate &&
      payment.status === "waiting" &&
      isDueDateReached(payment.due_date))
  );
};

export default function TenantPaymentsPage() {
  const [payments, setPayments] = useState<TenantPayment[]>([]);
  const [filter, setFilter] = useState<PaymentFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await getTenantPayments({
          page: 1,
          per_page: 100,
          sort: "due_date",
        });

        if (!active) {
          return;
        }

        setPayments(response.data);
      } catch (loadError) {
        if (!active) {
          return;
        }

        setError(
          getApiErrorMessage(
            loadError,
            "Gagal memuat data pembayaran. Silakan coba lagi."
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

  const sortedHistory = useMemo(() => {
    return [...payments].sort((a, b) => {
      const aDate = new Date(a.due_date || a.created_at || 0).getTime();
      const bDate = new Date(b.due_date || b.created_at || 0).getTime();
      return bDate - aDate;
    });
  }, [payments]);

  const outstandingPayments = useMemo(() => {
    return sortedHistory
      .filter((payment) => {
        const displayStatus = getPaymentDisplayStatus(payment);
        return displayStatus === "waiting" || displayStatus === "overdue";
      })
      .sort((a, b) => {
        const aDate = new Date(a.due_date || a.created_at || 0).getTime();
        const bDate = new Date(b.due_date || b.created_at || 0).getTime();
        return aDate - bDate;
      });
  }, [sortedHistory]);

  const filteredHistory = useMemo(() => {
    if (filter === "all") {
      return sortedHistory;
    }

    return sortedHistory.filter(
      (payment) => getPaymentDisplayStatus(payment) === filter
    );
  }, [filter, sortedHistory]);

  const stats = useMemo(() => {
    const outstandingAmount = outstandingPayments.reduce(
      (sum, item) => sum + item.amount,
      0
    );

    return {
      total: sortedHistory.length,
      outstandingCount: outstandingPayments.length,
      outstandingAmount,
      paidCount: sortedHistory.filter(
        (item) => getPaymentDisplayStatus(item) === "paid"
      ).length,
      waitingCount: sortedHistory.filter(
        (item) => getPaymentDisplayStatus(item) === "waiting"
      ).length,
      cancelledCount: sortedHistory.filter(
        (item) => getPaymentDisplayStatus(item) === "cancelled"
      ).length,
    };
  }, [outstandingPayments, sortedHistory]);

  const nextDuePayment = outstandingPayments[0] || null;

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-indigo-700 via-blue-700 to-cyan-700 p-4 text-white shadow-sm sm:p-6">
        <div className="pointer-events-none absolute -left-12 top-0 h-44 w-44 rounded-full bg-white/15 blur-2xl" />
        <div className="pointer-events-none absolute -right-12 bottom-0 h-44 w-44 rounded-full bg-white/10 blur-3xl" />

        <div className="relative">
          <h1 className="text-2xl font-semibold sm:text-3xl">Tagihan & Pembayaran</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/90">
            Pantau tagihan aktif, status pembayaran, dan riwayat transaksi sewa
            kamu dalam satu halaman.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryStat
              icon={<WalletCards size={16} />}
              label="Total Tagihan"
              value={`${stats.total}`}
            />
            <SummaryStat
              icon={<CircleAlert size={16} />}
              label="Tagihan Aktif"
              value={`${stats.outstandingCount}`}
            />
            <SummaryStat
              icon={<CreditCard size={16} />}
              label="Nominal Aktif"
              value={formatCurrency(stats.outstandingAmount)}
            />
            <SummaryStat
              icon={<CheckCircle2 size={16} />}
              label="Lunas"
              value={`${stats.paidCount}`}
            />
          </div>

          <div className="mt-4 rounded-xl border border-white/25 bg-white/10 p-4 backdrop-blur-sm">
            <p className="text-xs text-white/80">Batas pembayaran terdekat</p>
            <p className="mt-1 text-sm font-semibold">
              {nextDuePayment ? (
                <>
                  {nextDuePayment.property.name || "-"} •{" "}
                  {formatDueDate(nextDuePayment.due_date)}
                  <DeadlineCountdown
                    value={nextDuePayment.due_date}
                    variant="light"
                    className="mt-2"
                  />
                </>
              ) : (
                "Tidak ada tagihan aktif saat ini"
              )}
            </p>
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
              active={filter === "waiting"}
              label={`Menunggu (${stats.waitingCount})`}
              onClick={() => setFilter("waiting")}
            />
            <FilterChip
              active={filter === "paid"}
              label={`Lunas (${stats.paidCount})`}
              onClick={() => setFilter("paid")}
            />
            <FilterChip
              active={filter === "cancelled"}
              label={`Dibatalkan (${stats.cancelledCount})`}
              onClick={() => setFilter("cancelled")}
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
      ) : sortedHistory.length === 0 ? (
        <div className="rounded-2xl border bg-white p-4 text-center sm:p-10">
          <h2 className="text-lg font-semibold text-green-600 sm:text-xl">
            Tidak Ada Tagihan Saat Ini
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-slate-600">
            Tagihan kamu akan muncul di halaman ini saat ada periode sewa atau
            biaya tambahan.
          </p>
          <Link
            href="/tenant/kost-saya"
            className="mt-6 inline-flex w-full justify-center rounded-xl bg-green-600 px-6 py-2 font-medium text-white hover:bg-green-700 sm:w-auto"
          >
            Lihat Kost Saya
          </Link>
        </div>
      ) : (
        <>
          {outstandingPayments.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-800">
                Tagihan Aktif
              </h2>

              <div className="space-y-3">
                {outstandingPayments.map((payment) => (
                  <ActivePaymentCard key={payment.id} payment={payment} />
                ))}
              </div>
            </section>
          )}

          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-800 sm:text-xl">
              Riwayat Pembayaran ({filteredHistory.length})
            </h2>

            {filteredHistory.length === 0 ? (
              <div className="rounded-2xl border bg-white p-4 text-sm text-slate-500 sm:p-6">
                Tidak ada data pembayaran untuk filter yang dipilih.
              </div>
            ) : (
                <div className="grid gap-3 md:grid-cols-2">
                {filteredHistory.map((payment) => (
                  <HistoryPaymentCard key={payment.id} payment={payment} />
                ))}
              </div>
            )}
          </section>
        </>
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

function ActivePaymentCard({ payment }: { payment: TenantPayment }) {
  const displayStatus = getPaymentDisplayStatus(payment);
  const isDue = displayStatus === "overdue";

  return (
    <article
      className={`rounded-2xl border p-4 shadow-sm transition hover:shadow sm:p-5 ${
        isDue
          ? "border-red-200 bg-red-50/70 hover:border-red-300"
          : "bg-white hover:border-green-300"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-800">
            {payment.property.name || "-"}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {getTenantUnitDisplayName(payment.unit)}
          </p>
          <p className="mt-2 text-xs text-slate-500">Faktur: {payment.invoice_id}</p>
        </div>

        <span
          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
            statusBadgeMap[displayStatus]
          }`}
        >
          {statusIconMap[displayStatus]}
          {statusLabelMap[displayStatus]}
        </span>
      </div>

      <div
        className={`mt-4 grid gap-3 rounded-xl border p-3 text-sm md:grid-cols-2 ${
          isDue ? "border-red-200 bg-white" : "border-slate-200 bg-slate-50"
        }`}
      >
        <div>
          <p className={isDue ? "text-xs text-red-600" : "text-xs text-slate-500"}>
            Batas Pembayaran
          </p>
          <p
            className={`mt-1 font-medium ${
              isDue ? "text-red-700" : "text-slate-900"
            }`}
          >
            {formatDueDate(payment.due_date)}
          </p>
          {displayStatus === "waiting" ? (
            <DeadlineCountdown value={payment.due_date} className="mt-2" />
          ) : null}
        </div>
        <div>
          <p className="text-xs text-slate-500">Nominal</p>
          <p className="mt-1 font-semibold text-slate-900">
            {formatCurrency(payment.amount)}
          </p>
        </div>
      </div>
    </article>
  );
}

function HistoryPaymentCard({ payment }: { payment: TenantPayment }) {
  const displayStatus = getPaymentDisplayStatus(payment);
  const isDue = displayStatus === "overdue";
  const isAutoCancelled = isAutoCancelledByDueDate(payment);

  return (
    <article
      className={`rounded-2xl border p-4 shadow-sm transition hover:shadow ${
        isDue
          ? "border-red-200 bg-red-50/70 hover:border-red-300"
          : "bg-white hover:border-green-300"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {payment.property.name || "-"} • {getTenantUnitDisplayName(payment.unit)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Faktur: {payment.invoice_id}</p>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
            statusBadgeMap[displayStatus]
          }`}
        >
          {statusIconMap[displayStatus]}
          {statusLabelMap[displayStatus]}
        </span>
      </div>

      {isAutoCancelled ? (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          <p className="inline-flex items-start gap-1.5">
            <CircleAlert size={13} className="mt-0.5 shrink-0" />
            <span>
              Pembayaran dibatalkan otomatis karena melewati batas pembayaran
              {payment.due_date ? ` (${formatDueDate(payment.due_date)}).` : "."}
            </span>
          </p>
        </div>
      ) : null}

      <p className="mt-3 text-lg font-semibold text-slate-900">
        {formatCurrency(payment.amount)}
      </p>

      <div className="mt-3 grid gap-2 text-xs text-slate-500">
        <p
          className={`inline-flex items-center gap-1 ${
            isDue ? "font-medium text-red-700" : ""
          }`}
        >
          <CalendarClock size={12} />
          Batas pembayaran: {formatDueDate(payment.due_date)}
        </p>
        <p className="inline-flex items-center gap-1">
          <Clock3 size={12} />
          Dibayar: {formatDateTime(payment.paid_at)}
        </p>
      </div>

      <div className="mt-3 flex justify-end">
        <Link
          href="/tenant/kost-saya"
          className="text-xs font-medium text-green-700 hover:text-green-800"
        >
          Lihat Kost Saya
        </Link>
      </div>
    </article>
  );
}
