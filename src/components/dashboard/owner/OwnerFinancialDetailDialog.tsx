"use client";

import { useEffect, useId } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Building2,
  CalendarDays,
  Home,
  ReceiptText,
  X,
} from "lucide-react";
import type { OwnerFinancialDetailRow } from "@/hooks/useOwnerDashboard";

const formatCurrency = (value: number) =>
  `Rp ${Number(value || 0).toLocaleString("id-ID")}`;

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

const entryTypeLabels: Record<string, string> = {
  commission_income: "Komisi",
  owner_income: "Pendapatan Pemilik",
  manual_adjustment: "Penyesuaian Manual",
};

export default function OwnerFinancialDetailDialog({
  title,
  direction,
  entries,
  onClose,
}: {
  title: string;
  direction: "inflow" | "outflow";
  entries: OwnerFinancialDetailRow[];
  onClose: () => void;
}) {
  const titleId = useId();
  const total = entries.reduce((sum, entry) => sum + entry.amount, 0);
  const isIncome = direction === "inflow";

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            <span
              className={`mt-0.5 rounded-xl p-2 ${
                isIncome
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {isIncome ? (
                <ArrowUpCircle size={22} />
              ) : (
                <ArrowDownCircle size={22} />
              )}
            </span>
            <div className="min-w-0">
              <h2 id={titleId} className="text-lg font-semibold text-slate-900">
                {title}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {entries.length} transaksi • Total {formatCurrency(total)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Tutup detail transaksi"
            autoFocus
          >
            <X size={20} />
          </button>
        </header>

        <div className="overflow-y-auto p-4 sm:p-6">
          {entries.length === 0 ? (
            <div className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
              <ReceiptText size={36} className="text-slate-400" />
              <p className="mt-3 font-medium text-slate-700">
                Belum ada detail {isIncome ? "pemasukan" : "pengeluaran"}
              </p>
              <p className="mt-1 max-w-md text-sm text-slate-500">
                Transaksi yang sudah diposting pada periode dan properti ini akan
                tampil di sini.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {entries.map((entry) => (
                <article
                  key={entry.id}
                  className="rounded-2xl border border-slate-200 p-4 transition hover:border-slate-300 hover:shadow-sm"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900">
                        {entry.description}
                      </p>
                      <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                        {entryTypeLabels[entry.entryType] || entry.entryType}
                      </p>
                    </div>
                    <p
                      className={`shrink-0 text-base font-semibold ${
                        isIncome ? "text-emerald-700" : "text-red-700"
                      }`}
                    >
                      {isIncome ? "+" : "-"} {formatCurrency(entry.amount)}
                    </p>
                  </div>

                  <dl className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                    <div className="flex items-center gap-2">
                      <CalendarDays size={15} className="shrink-0 text-slate-400" />
                      <dt className="sr-only">Tanggal</dt>
                      <dd>{formatDate(entry.occurredOn)}</dd>
                    </div>
                    <div className="flex items-center gap-2">
                      <Building2 size={15} className="shrink-0 text-slate-400" />
                      <dt className="sr-only">Properti</dt>
                      <dd className="truncate">{entry.propertyName}</dd>
                    </div>
                    <div className="flex items-center gap-2">
                      <Home size={15} className="shrink-0 text-slate-400" />
                      <dt className="sr-only">Unit</dt>
                      <dd>{entry.unitName}</dd>
                    </div>
                    <div className="flex items-center gap-2">
                      <ReceiptText size={15} className="shrink-0 text-slate-400" />
                      <dt className="sr-only">Kode pemesanan</dt>
                      <dd>Pemesanan {entry.bookingCode}</dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
