"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Download,
  Eye,
  Filter,
  Pencil,
  RotateCcw,
  Search,
  Trash2,
  UserCog,
  Wrench,
  X,
} from "lucide-react";
import {
  deleteAdminMaintenanceRequest,
  exportAdminMaintenanceRequests,
  getAdminMaintenanceRequests,
  getAdminUsers,
  getApiErrorMessage,
  updateAdminMaintenanceRequest,
  type AdminMaintenanceRequest,
  type AdminUser,
} from "@/lib/dashboard/admin.api";
import { hasFilterOption, uniqueFilterOptions } from "@/lib/filter-options";

const statusLabelMap: Record<string, string> = {
  unassigned: "Belum Ditugaskan",
  assigned: "Ditugaskan",
  in_progress: "Sedang Dikerjakan",
  pending_vendor: "Menunggu Vendor",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

const priorityLabelMap: Record<string, string> = {
  high: "Tinggi",
  medium: "Sedang",
  low: "Rendah",
};

const roleLabelMap: Record<string, string> = {
  admin: "Administrator",
  owner: "Pemilik",
  tenant: "Penyewa",
  housekeeper: "Petugas Kebersihan",
  technician: "Teknisi",
};

const PAGE_SIZE = 10;

type Notice = {
  variant: "success" | "error";
  message: string;
} | null;

type EditFormState = {
  status:
    | "unassigned"
    | "assigned"
    | "pending_vendor"
    | "in_progress"
    | "completed"
    | "cancelled";
  priority: "high" | "medium" | "low";
  assignedToId: string;
  repairDate: string;
  visitingHours: string;
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

const toInputDate = (value?: string | null) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
};

const getTodayInputDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const parseFilenameFromDisposition = (contentDisposition: string) => {
  const match = /filename="?([^"]+)"?/i.exec(contentDisposition || "");
  return match?.[1] || "permintaan-perawatan.csv";
};

const getInitialEditForm = (issue: AdminMaintenanceRequest): EditFormState => ({
  status: issue.status,
  priority: issue.priority,
  assignedToId: issue.assigned_to.id ? String(issue.assigned_to.id) : "",
  repairDate: toInputDate(issue.repair_date),
  visitingHours: issue.visiting_hours || "",
});

export default function AdminMaintenancePage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");
  const [issues, setIssues] = useState<AdminMaintenanceRequest[]>([]);
  const [technicians, setTechnicians] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [notice, setNotice] = useState<Notice>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<number | null>(null);
  const [isCompletingId, setIsCompletingId] = useState<number | null>(null);
  const [completeConfirmationIssue, setCompleteConfirmationIssue] =
    useState<AdminMaintenanceRequest | null>(null);
  const [viewIssue, setViewIssue] = useState<AdminMaintenanceRequest | null>(null);
  const [editIssue, setEditIssue] = useState<AdminMaintenanceRequest | null>(null);
  const [editForm, setEditForm] = useState<EditFormState | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    let active = true;

    const loadMaintenanceRequests = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [issuesResponse, usersResponse] = await Promise.all([
          getAdminMaintenanceRequests({
            page: 1,
            per_page: 100,
          }),
          getAdminUsers({
            page: 1,
            per_page: 100,
          }),
        ]);

        if (!active) {
          return;
        }

        setIssues(issuesResponse.data);
        setTechnicians(
          usersResponse.data.filter((user) => user.role !== "tenant")
        );
      } catch (loadError) {
        if (!active) {
          return;
        }

        setError(
          getApiErrorMessage(
            loadError,
            "Data perawatan gagal dimuat. Coba ulang beberapa saat lagi."
          )
        );
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadMaintenanceRequests();

    return () => {
      active = false;
    };
  }, [refreshKey]);

  const summary = useMemo(
    () => ({
      unassigned: issues.filter((item) => item.status === "unassigned").length,
      inProgress: issues.filter(
        (item) => item.status === "assigned" || item.status === "in_progress"
      ).length,
      pendingVendor: issues.filter((item) => item.status === "pending_vendor")
        .length,
      completed: issues.filter((item) => item.status === "completed").length,
    }),
    [issues]
  );

  const statusFilterOptions = useMemo(
    () =>
      uniqueFilterOptions(
        issues,
        (item) => item.status,
        (value) => statusLabelMap[value]
      ),
    [issues]
  );

  const priorityFilterOptions = useMemo(
    () =>
      uniqueFilterOptions(
        issues,
        (item) => item.priority,
        (value) => priorityLabelMap[value]
      ),
    [issues]
  );

  const filtered = useMemo(() => {
    const filteredItems = issues.filter((item) => {
      const searchable = `${item.issue} ${item.property.name || ""} ${
        item.tenant.full_name || ""
      } ${item.unit.name || ""}`.toLowerCase();

      return (
        searchable.includes(search.toLowerCase()) &&
        (status ? item.status === status : true) &&
        (priority ? item.priority === priority : true)
      );
    });

    return filteredItems.sort((a, b) => {
      const dateA = new Date(a.created_at || a.requested_date || 0).getTime();
      const dateB = new Date(b.created_at || b.requested_date || 0).getTime();

      if (sortBy === "oldest") {
        return dateA - dateB;
      }

      return dateB - dateA;
    });
  }, [issues, priority, search, sortBy, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const pagedIssues = filtered.slice(startIndex, startIndex + PAGE_SIZE);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, status, priority, sortBy]);

  useEffect(() => {
    if (!hasFilterOption(statusFilterOptions, status)) {
      setStatus("");
    }
  }, [status, statusFilterOptions]);

  useEffect(() => {
    if (!hasFilterOption(priorityFilterOptions, priority)) {
      setPriority("");
    }
  }, [priority, priorityFilterOptions]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const openEditModal = (issue: AdminMaintenanceRequest) => {
    setNotice(null);
    setEditIssue(issue);
    setEditForm(getInitialEditForm(issue));
    setEditError(null);
  };

  const closeEditModal = () => {
    if (isSavingEdit) {
      return;
    }

    setEditIssue(null);
    setEditForm(null);
    setEditError(null);
  };

  const handleDelete = async (issue: AdminMaintenanceRequest) => {
    const agreed = window.confirm(
      `Hapus tiket perawatan "${issue.issue}"? Tindakan ini tidak bisa dibatalkan.`
    );
    if (!agreed) {
      return;
    }

    setIsDeletingId(issue.id);
    setNotice(null);

    try {
      await deleteAdminMaintenanceRequest(issue.id);
      setNotice({
        variant: "success",
        message: "Tiket perawatan berhasil dihapus.",
      });
      setRefreshKey((prev) => prev + 1);
    } catch (deleteError) {
      setNotice({
        variant: "error",
        message: getApiErrorMessage(deleteError, "Gagal menghapus tiket."),
      });
    } finally {
      setIsDeletingId(null);
    }
  };

  const openCompleteConfirmation = (issue: AdminMaintenanceRequest) => {
    if (issue.status === "completed") {
      return;
    }

    setNotice(null);
    setCompleteConfirmationIssue(issue);
  };

  const handleCompleteIssue = async (issue: AdminMaintenanceRequest) => {
    if (issue.status === "completed") {
      setCompleteConfirmationIssue(null);
      return;
    }

    setIsCompletingId(issue.id);
    setNotice(null);

    try {
      await updateAdminMaintenanceRequest(issue.id, {
        status: "completed",
        repair_date: issue.repair_date || getTodayInputDate(),
      });

      setNotice({
        variant: "success",
        message: "Tiket perawatan berhasil ditandai selesai.",
      });
      setCompleteConfirmationIssue(null);
      setRefreshKey((prev) => prev + 1);
    } catch (completeError) {
      setNotice({
        variant: "error",
        message: getApiErrorMessage(
          completeError,
          "Gagal menandai tiket sebagai selesai."
        ),
      });
    } finally {
      setIsCompletingId(null);
    }
  };

  const handleSaveEdit = async () => {
    if (!editIssue || !editForm) {
      return;
    }

    setIsSavingEdit(true);
    setEditError(null);
    setNotice(null);

    try {
      await updateAdminMaintenanceRequest(editIssue.id, {
        status: editForm.status,
        priority: editForm.priority,
        assigned_to_id: editForm.assignedToId
          ? Number(editForm.assignedToId)
          : null,
        repair_date: editForm.repairDate || undefined,
        visiting_hours: editForm.visitingHours.trim() || undefined,
      });

      setNotice({
        variant: "success",
        message: "Data perawatan berhasil diperbarui.",
      });
      setEditIssue(null);
      setEditForm(null);
      setRefreshKey((prev) => prev + 1);
    } catch (saveError) {
      setEditError(
        getApiErrorMessage(saveError, "Gagal memperbarui data perawatan.")
      );
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    setNotice(null);

    try {
      const result = await exportAdminMaintenanceRequests({
        search,
        status,
        priority,
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
        message: "Data perawatan berhasil diekspor.",
      });
    } catch (exportError) {
      setNotice({
        variant: "error",
        message: getApiErrorMessage(exportError, "Gagal mengekspor data."),
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-7">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-[#1E2746] via-[#273965] to-[#2C62A5] p-6 text-white shadow-sm">
        <div className="pointer-events-none absolute -left-12 top-0 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -right-12 bottom-0 h-44 w-44 rounded-full bg-white/10 blur-3xl" />

        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="inline-flex rounded-full border border-white/35 bg-white/10 px-3 py-1 text-xs font-medium">
              Modul Perawatan
            </p>
            <h1 className="mt-3 text-2xl font-semibold md:text-3xl">
              Kelola Tiket Perawatan
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-white/85">
              Pantau tiket, atur petugas, dan perbarui status perawatan dari satu
              dashboard.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              void handleExport();
            }}
            disabled={isExporting}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-[#1E2746] hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Download size={16} />
            {isExporting ? "Mengekspor..." : "Ekspor CSV"}
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Belum Ditugaskan"
          value={summary.unassigned}
          icon={<ClipboardList size={18} />}
          tone="warning"
        />
        <SummaryCard
          label="Sedang Dikerjakan"
          value={summary.inProgress}
          icon={<Wrench size={18} />}
        />
        <SummaryCard
          label="Menunggu Vendor"
          value={summary.pendingVendor}
          icon={<UserCog size={18} />}
        />
        <SummaryCard
          label="Selesai"
          value={summary.completed}
          icon={<CheckCircle2 size={18} />}
          tone="success"
        />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
          <div className="relative min-w-[240px] flex-1">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              placeholder="Cari masalah, properti, unit, atau penyewa..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm focus:border-blue-400 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="relative min-w-[190px]">
            <Filter
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm focus:border-blue-400 focus:bg-white focus:outline-none"
            >
              <option value="">Semua Status</option>
              {statusFilterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="relative min-w-[170px]">
            <Filter
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <select
              value={priority}
              onChange={(event) => setPriority(event.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm focus:border-blue-400 focus:bg-white focus:outline-none"
            >
              <option value="">Semua Prioritas</option>
              {priorityFilterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <select
            value={sortBy}
            onChange={(event) =>
              setSortBy(event.target.value as "newest" | "oldest")
            }
            className="h-11 min-w-[150px] rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm focus:border-blue-400 focus:bg-white focus:outline-none"
          >
            <option value="newest">Terbaru</option>
            <option value="oldest">Terlama</option>
          </select>

          <button
            type="button"
            onClick={() => {
              setSearch("");
              setStatus("");
              setPriority("");
              setSortBy("newest");
              setCurrentPage(1);
            }}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <RotateCcw size={14} />
            Atur Ulang
          </button>

        </div>

        <p className="mt-3 text-xs text-slate-500">
          Menampilkan <span className="font-semibold">{filtered.length}</span> dari{" "}
          <span className="font-semibold">{issues.length}</span> tiket perawatan.
        </p>
      </section>

      {notice && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            notice.variant === "success"
              ? "border-green-200 bg-green-50 text-green-700"
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
          <table className="min-w-[1120px] w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="p-4 text-left">Tiket</th>
                <th className="p-4 text-left">Properti</th>
                <th className="p-4 text-left">Penyewa</th>
                <th className="p-4 text-left">Prioritas</th>
                <th className="p-4 text-left">Status</th>
                <th className="p-4 text-left">Petugas</th>
                <th className="p-4 text-left">Jadwal</th>
                <th className="p-4 text-left">Aksi</th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-slate-500">
                    Memuat data perawatan...
                  </td>
                </tr>
              ) : pagedIssues.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-slate-500">
                    Tidak ada data perawatan.
                  </td>
                </tr>
              ) : (
                pagedIssues.map((issue) => (
                  <tr
                    key={issue.id}
                    className="border-t border-slate-100 transition hover:bg-slate-50"
                  >
                    <td className="p-4">
                      <div className="space-y-1">
                        <p className="font-semibold text-slate-800">{issue.issue}</p>
                        <p className="text-xs text-slate-500">
                          TKT-{issue.id} • {issue.unit.name || "-"} •{" "}
                          {getCategoryLabel(issue.category)}
                        </p>
                      </div>
                    </td>

                    <td className="p-4 text-slate-700">{issue.property.name || "-"}</td>

                    <td className="p-4">
                      <div>
                        <p className="text-slate-700">{issue.tenant.full_name || "-"}</p>
                        <p className="text-xs text-slate-500">
                          Pengajuan: {formatDate(issue.requested_date)}
                        </p>
                      </div>
                    </td>

                    <td className="p-4">
                      <PriorityBadge type={issue.priority} />
                    </td>

                    <td className="p-4">
                      <StatusBadge type={issue.status} />
                    </td>

                    <td className="p-4 text-slate-700">
                      {issue.assigned_to.full_name || "-"}
                    </td>

                    <td className="p-4">
                      <div className="text-slate-700">
                        <p>{formatDate(issue.repair_date)}</p>
                        <p className="text-xs text-slate-500">
                          {issue.visiting_hours || "-"}
                        </p>
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setViewIssue(issue)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:border-green-200 hover:bg-green-50 hover:text-green-700"
                          title="Lihat detail tiket"
                        >
                          <Eye size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={() => openEditModal(issue)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                          title="Ubah tiket"
                        >
                          <Pencil size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={() => openCompleteConfirmation(issue)}
                          disabled={
                            issue.status === "completed" ||
                            isCompletingId === issue.id
                          }
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                          title={
                            issue.status === "completed"
                              ? "Tiket sudah selesai"
                              : "Tandai selesai"
                          }
                        >
                          <CheckCircle2 size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            void handleDelete(issue);
                          }}
                          disabled={isDeletingId === issue.id}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                          title="Hapus tiket"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 p-4 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
          <p>
            Menampilkan{" "}
            <span className="font-semibold text-slate-700">
              {filtered.length === 0 ? 0 : startIndex + 1}
            </span>
            {" - "}
            <span className="font-semibold text-slate-700">
              {Math.min(startIndex + PAGE_SIZE, filtered.length)}
            </span>{" "}
            dari <span className="font-semibold text-slate-700">{filtered.length}</span>{" "}
            tiket perawatan
          </p>

          <div className="inline-flex items-center gap-2 self-start">
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft size={14} />
              Sebelumnya
            </button>
            <span className="min-w-[88px] text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
              Hal. {currentPage}/{totalPages}
            </span>
            <button
              type="button"
              onClick={() =>
                setCurrentPage((prev) => Math.min(totalPages, prev + 1))
              }
              disabled={currentPage === totalPages}
              className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Selanjutnya
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </section>

      {completeConfirmationIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="px-6 pb-5 pt-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                  <AlertTriangle size={24} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                    Konfirmasi Selesai
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-900">
                    Tandai tiket ini selesai?
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Pastikan pekerjaan perawatan sudah selesai sebelum status tiket
                    diubah.
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
                <div className="flex items-start justify-between gap-4">
                  <span className="text-slate-500">Tiket</span>
                  <span className="text-right font-semibold text-slate-900">
                    TKT-{completeConfirmationIssue.id}
                  </span>
                </div>
                <div className="mt-3 flex items-start justify-between gap-4">
                  <span className="text-slate-500">Keluhan</span>
                  <span className="text-right font-medium text-slate-800">
                    {completeConfirmationIssue.issue || "-"}
                  </span>
                </div>
                <div className="mt-3 flex items-start justify-between gap-4">
                  <span className="text-slate-500">Properti</span>
                  <span className="text-right font-medium text-slate-800">
                    {completeConfirmationIssue.property.name || "-"}
                  </span>
                </div>
                <div className="mt-3 flex items-start justify-between gap-4">
                  <span className="text-slate-500">Unit</span>
                  <span className="text-right font-medium text-slate-800">
                    {completeConfirmationIssue.unit.name || "-"}
                  </span>
                </div>
                <div className="mt-3 flex items-start justify-between gap-4">
                  <span className="text-slate-500">Penyewa</span>
                  <span className="text-right font-medium text-slate-800">
                    {completeConfirmationIssue.tenant.full_name || "-"}
                  </span>
                </div>
              </div>

              <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800">
                Setelah dikonfirmasi, status tiket akan berubah menjadi selesai.
              </p>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setCompleteConfirmationIssue(null)}
                disabled={isCompletingId === completeConfirmationIssue.id}
                className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-medium text-slate-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleCompleteIssue(completeConfirmationIssue);
                }}
                disabled={isCompletingId === completeConfirmationIssue.id}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-70"
              >
                <CheckCircle2 size={16} />
                {isCompletingId === completeConfirmationIssue.id
                  ? "Memproses..."
                  : "Ya, Tandai Selesai"}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-800">
                Detail Perawatan
              </h2>
              <button
                type="button"
                onClick={() => setViewIssue(null)}
                className="rounded-lg p-2 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 px-6 py-5 text-sm">
              <div className="mb-1 rounded-xl border border-slate-100 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Tiket #{viewIssue.id}
                </p>
                <p className="mt-1 font-semibold text-slate-800">{viewIssue.issue}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {viewIssue.property.name || "-"} • {viewIssue.unit.name || "-"}
                </p>
              </div>

              <DetailRow label="Kategori" value={getCategoryLabel(viewIssue.category)} />
              <DetailRow label="Deskripsi" value={viewIssue.description || "-"} />
              <DetailRow label="Penyewa" value={viewIssue.tenant.full_name || "-"} />
              <DetailRow
                label="Prioritas"
                value={priorityLabelMap[viewIssue.priority] || viewIssue.priority}
              />
              <DetailRow
                label="Status"
                value={statusLabelMap[viewIssue.status] || viewIssue.status}
              />
              <DetailRow
                label="Teknisi/Petugas"
                value={viewIssue.assigned_to.full_name || "-"}
              />
              <DetailRow
                label="Tanggal Pengajuan"
                value={formatDate(viewIssue.requested_date)}
              />
              <DetailRow
                label="Tanggal Perbaikan"
                value={formatDate(viewIssue.repair_date)}
              />
              <DetailRow
                label="Jam Kunjungan"
                value={viewIssue.visiting_hours || "-"}
              />
            </div>

            <div className="flex justify-end border-t bg-slate-50 px-6 py-4">
              <button
                type="button"
                onClick={() => setViewIssue(null)}
                className="h-11 rounded-xl bg-[#1E2746] px-6 font-medium text-white hover:bg-[#141B35]"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {editIssue && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-800">Ubah Perawatan</h2>
              <button
                type="button"
                onClick={closeEditModal}
                disabled={isSavingEdit}
                className="rounded-lg p-2 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Tiket #{editIssue.id}
                </p>
                <p className="mt-1 font-semibold text-slate-800">{editIssue.issue}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {editIssue.property.name || "-"} • {editIssue.unit.name || "-"} •{" "}
                  {editIssue.tenant.full_name || "-"}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Status
                  </label>
                  <select
                    value={editForm.status}
                    onChange={(event) =>
                      setEditForm((prev) =>
                        prev
                          ? {
                              ...prev,
                              status: event.target.value as EditFormState["status"],
                            }
                          : prev
                      )
                    }
                    className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E2746]"
                  >
                    <option value="unassigned">Belum Ditugaskan</option>
                    <option value="assigned">Ditugaskan</option>
                    <option value="in_progress">Sedang Dikerjakan</option>
                    <option value="pending_vendor">Menunggu Vendor</option>
                    <option value="completed">Selesai</option>
                    <option value="cancelled">Dibatalkan</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Prioritas
                  </label>
                  <select
                    value={editForm.priority}
                    onChange={(event) =>
                      setEditForm((prev) =>
                        prev
                          ? {
                              ...prev,
                              priority: event.target.value as EditFormState["priority"],
                            }
                          : prev
                      )
                    }
                    className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E2746]"
                  >
                    <option value="high">Tinggi</option>
                    <option value="medium">Sedang</option>
                    <option value="low">Rendah</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Teknisi/Petugas
                </label>
                <select
                  value={editForm.assignedToId}
                  onChange={(event) =>
                    setEditForm((prev) =>
                      prev ? { ...prev, assignedToId: event.target.value } : prev
                    )
                  }
                  className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E2746]"
                >
                  <option value="">Belum ditugaskan</option>
                  {technicians.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.full_name} ({roleLabelMap[person.role] || person.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Tanggal Perbaikan
                  </label>
                  <input
                    type="date"
                    value={editForm.repairDate}
                    onChange={(event) =>
                      setEditForm((prev) =>
                        prev ? { ...prev, repairDate: event.target.value } : prev
                      )
                    }
                    className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E2746]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Jam Kunjungan
                  </label>
                  <input
                    type="text"
                    value={editForm.visitingHours}
                    onChange={(event) =>
                      setEditForm((prev) =>
                        prev ? { ...prev, visitingHours: event.target.value } : prev
                      )
                    }
                    placeholder="Contoh: 09:00 - 11:00"
                    className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E2746]"
                  />
                </div>
              </div>

              {editError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {editError}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t bg-slate-50 px-6 py-4">
              <button
                type="button"
                onClick={closeEditModal}
                disabled={isSavingEdit}
                className="h-11 rounded-xl border border-slate-200 px-5 font-medium hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleSaveEdit();
                }}
                disabled={isSavingEdit}
                className="h-11 rounded-xl bg-[#1E2746] px-6 font-medium text-white hover:bg-[#141B35] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSavingEdit ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  tone = "default",
}: {
  label: string;
  value: number;
  icon: ReactNode;
  tone?: "default" | "success" | "warning";
}) {
  const styles =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-slate-200 bg-white text-[#1E2746]";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-slate-800">{value}</p>
        </div>
        <div
          className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border ${styles}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function getCategoryLabel(value?: string | null) {
  if (!value) {
    return "-";
  }

  return value
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function PriorityBadge({ type }: { type: string }) {
  const styleMap: Record<string, string> = {
    high: "border border-red-200 bg-red-50 text-red-700",
    medium: "border border-amber-200 bg-amber-50 text-amber-700",
    low: "border border-blue-200 bg-blue-50 text-blue-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
        styleMap[type] || "border border-slate-200 bg-slate-100 text-slate-700"
      }`}
    >
      {priorityLabelMap[type] || type}
    </span>
  );
}

function StatusBadge({ type }: { type: string }) {
  const styleMap: Record<string, string> = {
    unassigned: "border border-red-200 bg-red-50 text-red-700",
    assigned: "border border-blue-200 bg-blue-50 text-blue-700",
    in_progress: "border border-orange-200 bg-orange-50 text-orange-700",
    pending_vendor: "border border-purple-200 bg-purple-50 text-purple-700",
    completed: "border border-green-200 bg-green-50 text-green-700",
    cancelled: "border border-slate-200 bg-slate-100 text-slate-600",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
        styleMap[type] || "border border-slate-200 bg-slate-100 text-slate-700"
      }`}
    >
      {statusLabelMap[type] || type}
    </span>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-2">
      <span className="font-medium text-slate-600">{label}</span>
      <span className="max-w-[62%] break-words text-right text-slate-800">{value}</span>
    </div>
  );
}
