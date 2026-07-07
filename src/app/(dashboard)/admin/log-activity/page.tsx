"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Filter,
  Search,
  X,
} from "lucide-react";
import {
  exportAdminLogActivities,
  getAdminLogActivities,
  getAdminLogActivity,
  getApiErrorMessage,
  type AdminLogActivity,
} from "@/lib/dashboard/admin.api";
import { formatFilterLabel, uniqueFilterOptions } from "@/lib/filter-options";
import type { ApiPaginationMeta } from "@/types/api";

type SortValue = "newest" | "oldest";

type PaginationState = {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  perPage: number;
  showingFrom: number;
  showingTo: number;
};

type Notice = {
  variant: "success" | "error";
  message: string;
} | null;

const DEFAULT_PER_PAGE = 20;

const actionColorMap: Record<string, string> = {
  blue: "bg-blue-100 text-blue-700",
  orange: "bg-orange-100 text-orange-700",
  red: "bg-red-100 text-red-700",
  gray: "bg-slate-100 text-slate-700",
};

const actionLabelMap: Record<string, string> = {
  create: "Buat",
  update: "Perbarui",
  delete: "Hapus",
};

const moduleLabelMap: Record<string, string> = {
  Auth: "Autentikasi",
  Communication: "Komunikasi",
  Financial: "Keuangan",
  LogActivity: "Catatan Aktivitas",
  Maintenance: "Perawatan",
  Payment: "Tagihan & Pembayaran",
  Property: "Properti",
  Unit: "Unit",
  User: "Akun Pengguna",
};

const formatTimestamp = (value?: string | null) => {
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

const toModuleLabel = (moduleName?: string | null) => {
  const value = moduleName?.trim();
  if (!value) {
    return "-";
  }

  return moduleLabelMap[value] || value;
};

const parseNumber = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseFilenameFromDisposition = (contentDisposition: string) => {
  const match = /filename="?([^"]+)"?/i.exec(contentDisposition || "");
  return match?.[1] || "log-activities.csv";
};

const mapPagination = (
  meta: ApiPaginationMeta | undefined,
  currentPage: number,
  currentRows: number
): PaginationState => {
  if (!meta) {
    const from = currentRows > 0 ? (currentPage - 1) * DEFAULT_PER_PAGE + 1 : 0;
    const to = currentRows > 0 ? from + currentRows - 1 : 0;

    return {
      currentPage,
      totalPages: 1,
      totalCount: currentRows,
      perPage: DEFAULT_PER_PAGE,
      showingFrom: from,
      showingTo: to,
    };
  }

  return {
    currentPage: parseNumber(meta.current_page, currentPage),
    totalPages: Math.max(1, parseNumber(meta.total_pages, 1)),
    totalCount: parseNumber(meta.total_count, currentRows),
    perPage: parseNumber(meta.per_page, DEFAULT_PER_PAGE),
    showingFrom: parseNumber(meta.showing_from, 0),
    showingTo: parseNumber(meta.showing_to, 0),
  };
};

export default function AdminLogActivityPage() {
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [moduleName, setModuleName] = useState("");
  const [sort, setSort] = useState<SortValue>("newest");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [logs, setLogs] = useState<AdminLogActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationState>({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    perPage: DEFAULT_PER_PAGE,
    showingFrom: 0,
    showingTo: 0,
  });

  const [viewLog, setViewLog] = useState<AdminLogActivity | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadLogs = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await getAdminLogActivities({
          page: currentPage,
          per_page: DEFAULT_PER_PAGE,
          search: search.trim() || undefined,
          log_action: action || undefined,
          module_name: moduleName || undefined,
          date_from: dateFrom || undefined,
          date_to: dateTo ? `${dateTo} 23:59:59` : undefined,
          sort: sort === "oldest" ? "oldest" : undefined,
        });

        if (!active) {
          return;
        }

        setLogs(response.data);
        setPagination(mapPagination(response.meta, currentPage, response.data.length));
      } catch (loadError) {
        if (!active) {
          return;
        }

        setError(
          getApiErrorMessage(
            loadError,
            "Catatan aktivitas gagal dimuat. Silakan coba lagi."
          )
        );
        setLogs([]);
        setPagination((previous) => ({
          ...previous,
          showingFrom: 0,
          showingTo: 0,
          totalCount: 0,
        }));
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadLogs();

    return () => {
      active = false;
    };
  }, [
    action,
    currentPage,
    dateFrom,
    dateTo,
    moduleName,
    search,
    sort,
  ]);

  const openDetail = async (log: AdminLogActivity) => {
    setViewLog(log);
    setDetailError(null);
    setIsLoadingDetail(true);

    try {
      const response = await getAdminLogActivity(log.id);
      setViewLog(response.data);
    } catch (loadError) {
      setDetailError(
        getApiErrorMessage(loadError, "Detail log aktivitas gagal dimuat.")
      );
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    setNotice(null);

    try {
      const result = await exportAdminLogActivities({
        search: search.trim() || undefined,
        log_action: action || undefined,
        module_name: moduleName || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo ? `${dateTo} 23:59:59` : undefined,
        sort: sort === "oldest" ? "oldest" : undefined,
      });

      const fileName = parseFilenameFromDisposition(result.contentDisposition);
      const blobUrl = URL.createObjectURL(result.blob);
      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(blobUrl);

      setNotice({
        variant: "success",
        message: "Data log aktivitas berhasil diekspor.",
      });
    } catch (exportError) {
      setNotice({
        variant: "error",
        message: getApiErrorMessage(exportError, "Gagal mengekspor data log."),
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleFilterChange = (callback: () => void) => {
    callback();
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearch("");
    setAction("");
    setModuleName("");
    setSort("newest");
    setDateFrom("");
    setDateTo("");
    setCurrentPage(1);
  };

  const actionFilterOptions = useMemo(() => {
    const options = uniqueFilterOptions(
      logs,
      (item) => item.action,
      (value) => actionLabelMap[value]
    );

    if (action && !options.some((option) => option.value === action)) {
      return [
        { value: action, label: actionLabelMap[action] || formatFilterLabel(action) },
        ...options,
      ];
    }

    return options;
  }, [action, logs]);

  const moduleFilterOptions = useMemo(() => {
    const options = uniqueFilterOptions(
      logs,
      (item) => item.module_name,
      (value) => toModuleLabel(value)
    );

    if (moduleName && !options.some((option) => option.value === moduleName)) {
      return [{ value: moduleName, label: toModuleLabel(moduleName) }, ...options];
    }

    return options;
  }, [logs, moduleName]);

  const summary = useMemo(() => {
    const createCount = logs.filter((item) => item.action === "create").length;
    const updateCount = logs.filter((item) => item.action === "update").length;
    const deleteCount = logs.filter((item) => item.action === "delete").length;
    const uniqueModules = new Set(logs.map((item) => item.module_name).filter(Boolean))
      .size;

    return {
      total: pagination.totalCount,
      createCount,
      updateCount,
      deleteCount,
      uniqueModules,
    };
  }, [logs, pagination.totalCount]);

  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < pagination.totalPages;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-r from-[#1E2746] to-[#2A3B78] p-4 text-white shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">Catatan Aktivitas</h1>
            <p className="text-sm text-blue-100">
              Pantau jejak perubahan seluruh modul administrator secara langsung.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              void handleExport();
            }}
            disabled={isExporting}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-[#1E2746] hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            <Download size={16} />
            {isExporting ? "Mengekspor..." : "Ekspor CSV"}
          </button>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Total Catatan"
          value={summary.total}
          caption="Sesuai filter yang aktif"
        />
        <SummaryCard
          title="Aksi Buat"
          value={summary.createCount}
          caption="Pada halaman ini"
          tone="info"
        />
        <SummaryCard
          title="Aksi Perbarui"
          value={summary.updateCount}
          caption="Pada halaman ini"
          tone="warning"
        />
        <SummaryCard
          title="Aksi Hapus"
          value={summary.deleteCount}
          caption={`${summary.uniqueModules} modul terlibat`}
          tone="danger"
        />
      </section>

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <Filter size={16} />
          Filter Log Aktivitas
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
          <label className="relative w-full min-w-0 flex-1">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              placeholder="Cari aktivitas, administrator, atau modul"
              value={search}
              onChange={(event) =>
                handleFilterChange(() => setSearch(event.target.value))
              }
              className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-4 text-sm focus:border-[#1E2746] focus:outline-none focus:ring-2 focus:ring-[#1E2746]/20"
            />
          </label>

          <select
            value={action}
            onChange={(event) =>
              handleFilterChange(() => setAction(event.target.value))
            }
            className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm focus:border-[#1E2746] focus:outline-none focus:ring-2 focus:ring-[#1E2746]/20 md:w-auto"
          >
            <option value="">Semua Aksi</option>
            {actionFilterOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={moduleName}
            onChange={(event) =>
              handleFilterChange(() => setModuleName(event.target.value))
            }
            className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm focus:border-[#1E2746] focus:outline-none focus:ring-2 focus:ring-[#1E2746]/20 md:w-auto"
          >
            <option value="">Semua Modul</option>
            {moduleFilterOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={sort}
            onChange={(event) =>
              handleFilterChange(() =>
                setSort(event.target.value as "newest" | "oldest")
              )
            }
            className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm focus:border-[#1E2746] focus:outline-none focus:ring-2 focus:ring-[#1E2746]/20 md:w-auto"
          >
            <option value="newest">Urutkan: Terbaru</option>
            <option value="oldest">Urutkan: Terlama</option>
          </select>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-600">Dari</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(event) =>
                handleFilterChange(() => setDateFrom(event.target.value))
              }
              className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm focus:border-[#1E2746] focus:outline-none focus:ring-2 focus:ring-[#1E2746]/20"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-600">Sampai</label>
            <input
              type="date"
              value={dateTo}
              onChange={(event) =>
                handleFilterChange(() => setDateTo(event.target.value))
              }
              className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm focus:border-[#1E2746] focus:outline-none focus:ring-2 focus:ring-[#1E2746]/20"
            />
          </div>

          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 md:w-auto"
          >
            Atur Ulang
          </button>

        </div>
      </section>

      {notice && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            notice.variant === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {notice.message}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[1020px] w-full text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="p-4 text-left font-semibold">Waktu</th>
                <th className="p-4 text-left font-semibold">Nama Administrator</th>
                <th className="p-4 text-left font-semibold">Modul</th>
                <th className="p-4 text-left font-semibold">Deskripsi</th>
                <th className="p-4 text-left font-semibold">Aksi</th>
                <th className="p-4 text-center font-semibold">Detail</th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-500">
                    Memuat catatan aktivitas...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-500">
                    Tidak ada catatan aktivitas.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="border-t border-slate-100 align-top hover:bg-slate-50">
                    <td className="p-4 text-slate-700">
                      {formatTimestamp(log.created_at || log.timestamp)}
                    </td>
                    <td className="p-4 text-slate-700">{log.admin_name || "-"}</td>
                    <td className="p-4 text-slate-700">{toModuleLabel(log.module_name)}</td>
                    <td className="p-4 text-slate-700">
                      <p className="max-w-[380px] whitespace-normal break-words">
                        {log.description || "-"}
                      </p>
                    </td>
                    <td className="p-4">
                      <ActionBadge
                        action={actionLabelMap[log.action] || log.action_label}
                        colorClass={
                          actionColorMap[log.action_badge_color] ||
                          "bg-slate-100 text-slate-700"
                        }
                      />
                    </td>
                    <td className="p-4 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          void openDetail(log);
                        }}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-blue-50 hover:text-blue-600"
                        title="Lihat detail"
                      >
                        <Eye size={17} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
          <p>
            Menampilkan {pagination.showingFrom}-{pagination.showingTo} dari{" "}
            {pagination.totalCount} catatan
          </p>

          <div className="flex items-center gap-2 self-start">
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={!canGoPrevious || isLoading}
              className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft size={15} />
              Sebelumnya
            </button>

            <span className="min-w-[110px] text-center text-xs text-slate-600 sm:text-sm">
              Halaman {pagination.currentPage}/{pagination.totalPages}
            </span>

            <button
              type="button"
              onClick={() =>
                setCurrentPage((prev) => Math.min(pagination.totalPages, prev + 1))
              }
              disabled={!canGoNext || isLoading}
              className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              Berikutnya
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </section>

      {viewLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-4">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 sm:px-6">
              <h2 className="text-lg font-semibold text-slate-800">
                Detail Catatan Aktivitas
              </h2>

              <button
                type="button"
                onClick={() => setViewLog(null)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto px-4 py-5 text-sm sm:px-6">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Ringkasan
                </p>
                <p className="mt-1 text-sm font-medium text-slate-800">
                  {viewLog.description_detail || viewLog.description || "-"}
                </p>
              </div>

              {isLoadingDetail && (
                <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600">
                  Memuat detail...
                </p>
              )}

              {detailError && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-red-700">
                  {detailError}
                </p>
              )}

              <DetailRow
                label="Waktu"
                value={formatTimestamp(viewLog.created_at || viewLog.timestamp)}
              />
              <DetailRow label="Administrator" value={viewLog.admin_name || "-"} />
              <DetailRow label="Modul" value={toModuleLabel(viewLog.module_name)} />
              <DetailRow
                label="Aksi"
                value={actionLabelMap[viewLog.action] || viewLog.action_label}
              />
              <DetailRow
                label="Deskripsi Ringkas"
                value={viewLog.description_detail || viewLog.description || "-"}
              />
              <DetailRow
                label="Deskripsi Asli"
                value={viewLog.description_raw || "-"}
              />
            </div>

            <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-6 py-4">
              <button
                type="button"
                onClick={() => setViewLog(null)}
                className="h-11 rounded-xl bg-[#1E2746] px-6 font-medium text-white hover:bg-[#141B35]"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  title,
  value,
  caption,
  tone = "default",
}: {
  title: string;
  value: number;
  caption: string;
  tone?: "default" | "info" | "warning" | "danger";
}) {
  const toneClass =
    tone === "info"
      ? "border-blue-200 bg-blue-50/70"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50/70"
        : tone === "danger"
          ? "border-red-200 bg-red-50/70"
          : "border-slate-200 bg-slate-50/70";

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {title}
      </p>
      <p className="mt-2 text-2xl font-semibold text-slate-800">{value}</p>
      <p className="mt-1 text-xs text-slate-600">{caption}</p>
    </div>
  );
}

function ActionBadge({ action, colorClass }: { action: string; colorClass: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${colorClass}`}
    >
      {action}
    </span>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-slate-200 px-3 py-2">
      <span className="text-sm font-medium text-slate-600">{label}</span>
      <span className="max-w-[65%] break-words text-right text-sm text-slate-800">
        {value}
      </span>
    </div>
  );
}
