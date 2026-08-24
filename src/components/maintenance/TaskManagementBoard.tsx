"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Download,
  Eye,
  Loader2,
  Paperclip,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
  UserRoundCheck,
  Wrench,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  approveMaintenanceRequest,
  assignAdminMaintenanceRequest,
  cancelMaintenanceRequest,
  createMaintenanceChecklistItem,
  deleteMaintenanceChecklistItem,
  deleteMaintenancePhoto,
  exportAdminMaintenanceRequests,
  getAdminMaintenanceRequest,
  getAdminMaintenanceRequests,
  getAllAdminProperties,
  getAllAdminPropertyUnits,
  getAllAdminUsers,
  getApiErrorMessage,
  getMaintenancePhotoUrl,
  requestMaintenanceRevision,
  transitionMaintenanceRequest,
  updateAdminMaintenanceRequest,
  updateMaintenanceChecklistItem,
  uploadMaintenancePhotos,
  type AdminMaintenanceRequest,
  type AdminPropertyListItem,
  type AdminPropertyUnitRow,
  type AdminUser,
  type MaintenancePhoto,
  type MaintenancePriority,
  type MaintenanceStatus,
} from "@/lib/dashboard/admin.api";
import type { ApiPaginationMeta } from "@/types/api";

type Summary = {
  active: number;
  unassigned: number;
  in_progress: number;
  awaiting_approval: number;
  overdue: number;
};

type TaskMeta = ApiPaginationMeta & { summary?: Summary };
type Notice = { type: "success" | "error"; text: string } | null;

const STATUS_LABELS: Record<MaintenanceStatus, string> = {
  unassigned: "Baru",
  assigned: "Ditugaskan",
  pending_vendor: "Menunggu Vendor (lama)",
  in_progress: "Sedang Dikerjakan",
  awaiting_approval: "Menunggu Persetujuan",
  revision_required: "Perlu Perbaikan",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

const PRIORITY_LABELS: Record<MaintenancePriority, string> = {
  low: "Rendah",
  medium: "Sedang",
  high: "Tinggi",
  urgent: "Mendesak",
};

const STATUS_STYLES: Record<MaintenanceStatus, string> = {
  unassigned: "bg-slate-100 text-slate-700",
  assigned: "bg-blue-100 text-blue-700",
  pending_vendor: "bg-violet-100 text-violet-700",
  in_progress: "bg-amber-100 text-amber-800",
  awaiting_approval: "bg-cyan-100 text-cyan-800",
  revision_required: "bg-rose-100 text-rose-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-slate-200 text-slate-600",
};

const PRIORITY_STYLES: Record<MaintenancePriority, string> = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

const EMPTY_SUMMARY: Summary = {
  active: 0,
  unassigned: 0,
  in_progress: 0,
  awaiting_approval: 0,
  overdue: 0,
};

const formatJakarta = (value?: string | null, dateOnly = false) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(dateOnly ? {} : { hour: "2-digit", minute: "2-digit" }),
  }).format(parsed);
};

const toJakartaInput = (value?: string | null) => {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(value));
  const get = (type: string) => parts.find((part) => part.type === type)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
};

const jakartaInputToUtc = (value: string) =>
  value ? new Date(`${value}:00+07:00`).toISOString() : null;

const money = (value?: number | null) =>
  value == null
    ? "-"
    : new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }).format(value);

const fileValidationError = (files: File[], existingCount: number) => {
  if (existingCount + files.length > 5) return "Maksimal 5 foto pada setiap tahap.";
  const invalidType = files.find(
    (file) => !["image/jpeg", "image/png", "image/webp"].includes(file.type),
  );
  if (invalidType) return "Foto harus berformat JPEG, PNG, atau WEBP.";
  if (files.some((file) => file.size > 5 * 1024 * 1024)) {
    return "Ukuran setiap foto maksimal 5 MB.";
  }
  return null;
};

export default function TaskManagementBoard() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "finance";
  const [tasks, setTasks] = useState<AdminMaintenanceRequest[]>([]);
  const [selected, setSelected] = useState<AdminMaintenanceRequest | null>(null);
  const [staff, setStaff] = useState<AdminUser[]>([]);
  const [properties, setProperties] = useState<AdminPropertyListItem[]>([]);
  const [units, setUnits] = useState<AdminPropertyUnitRow[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<TaskMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [notice, setNotice] = useState<Notice>(null);
  const [assigneeForm, setAssigneeForm] = useState("");
  const [newChecklist, setNewChecklist] = useState("");
  const [completionNote, setCompletionNote] = useState("");
  const [revisionNote, setRevisionNote] = useState("");
  const [editPriority, setEditPriority] = useState<MaintenancePriority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [slaDueAt, setSlaDueAt] = useState("");
  const [estimatedCost, setEstimatedCost] = useState("");
  const [actualCost, setActualCost] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => setPage(1), [debouncedSearch, status, priority, propertyId, unitId, assigneeId, overdueOnly, dateFrom, dateTo, sort]);

  useEffect(() => {
    if (!isAdmin) return;
    void Promise.all([getAllAdminUsers(), getAllAdminProperties()])
      .then(([usersResult, propertiesResult]) => {
        setStaff(usersResult.data.filter((item) => ["technician", "housekeeper"].includes(item.role)));
        setProperties(propertiesResult.data);
      })
      .catch((error) => setNotice({ type: "error", text: getApiErrorMessage(error, "Data referensi gagal dimuat.") }));
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin || !propertyId) {
      setUnits([]);
      setUnitId("");
      return;
    }
    void getAllAdminPropertyUnits(propertyId)
      .then((result) => setUnits(result.data))
      .catch(() => setUnits([]));
  }, [isAdmin, propertyId]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void getAdminMaintenanceRequests({
      page,
      per_page: 12,
      search: debouncedSearch,
      status,
      priority,
      property_id: propertyId,
      unit_id: unitId,
      assigned_to_id: assigneeId,
      overdue: overdueOnly || undefined,
      date_from: dateFrom,
      date_to: dateTo,
      sort,
    })
      .then((result) => {
        if (!active) return;
        setTasks(result.data);
        setMeta((result.meta || null) as TaskMeta | null);
      })
      .catch((error) => {
        if (active) setNotice({ type: "error", text: getApiErrorMessage(error, "Task gagal dimuat.") });
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [page, debouncedSearch, status, priority, propertyId, unitId, assigneeId, overdueOnly, dateFrom, dateTo, sort, refreshKey]);

  useEffect(() => {
    if (!selected) return;
    setAssigneeForm(selected.assigned_to?.id ? String(selected.assigned_to.id) : "");
    setCompletionNote(selected.completion_note || "");
    setRevisionNote("");
    setEditPriority(selected.priority);
    setDueDate(selected.due_date || "");
    setSlaDueAt(toJakartaInput(selected.sla_due_at));
    setEstimatedCost(selected.estimated_cost == null ? "" : String(selected.estimated_cost));
    setActualCost(selected.actual_cost == null ? "" : String(selected.actual_cost));
  }, [selected]);

  const summary = meta?.summary || EMPTY_SUMMARY;
  const totalPages = Math.max(meta?.total_pages || 1, 1);
  const propertyOptions = useMemo(() => {
    if (properties.length) return properties.map((item) => ({ id: item.id, name: item.name }));
    return Array.from(new Map(tasks.map((item) => [item.property.id, item.property])).values());
  }, [properties, tasks]);

  const refresh = () => setRefreshKey((value) => value + 1);

  const openDetail = async (task: AdminMaintenanceRequest) => {
    setDetailLoading(true);
    setSelected(task);
    try {
      const result = await getAdminMaintenanceRequest(task.id);
      setSelected(result.data);
    } catch (error) {
      setNotice({ type: "error", text: getApiErrorMessage(error, "Detail task gagal dimuat.") });
      setSelected(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const runAction = async (action: () => Promise<{ data?: AdminMaintenanceRequest; message: string }>) => {
    setBusy(true);
    setNotice(null);
    try {
      const result = await action();
      if (result.data) setSelected(result.data);
      setNotice({ type: "success", text: result.message });
      refresh();
    } catch (error) {
      setNotice({ type: "error", text: getApiErrorMessage(error, "Perubahan task gagal disimpan.") });
    } finally {
      setBusy(false);
    }
  };

  const reloadDetail = async () => {
    if (!selected) return;
    const result = await getAdminMaintenanceRequest(selected.id);
    setSelected(result.data);
    refresh();
  };

  const handleChecklistToggle = async (itemId: number, completed: boolean) => {
    if (!selected) return;
    setBusy(true);
    try {
      await updateMaintenanceChecklistItem(selected.id, itemId, { completed });
      await reloadDetail();
    } catch (error) {
      setNotice({ type: "error", text: getApiErrorMessage(error, "Checklist gagal diperbarui.") });
    } finally {
      setBusy(false);
    }
  };

  const handlePhotoUpload = async (phase: "before" | "after", files: File[]) => {
    if (!selected || !files.length) return;
    const existing = phase === "before" ? selected.before_photos?.length || 0 : selected.after_photos?.length || 0;
    const validationError = fileValidationError(files, existing);
    if (validationError) {
      setNotice({ type: "error", text: validationError });
      return;
    }
    await runAction(() => uploadMaintenancePhotos(selected.id, phase, files));
  };

  const handleExport = async () => {
    setBusy(true);
    try {
      const result = await exportAdminMaintenanceRequests({ search: debouncedSearch, status, priority, property_id: propertyId, unit_id: unitId, assigned_to_id: assigneeId, overdue: overdueOnly || undefined, date_from: dateFrom, date_to: dateTo, sort });
      const url = URL.createObjectURL(result.blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "maintenance-tasks.csv";
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setNotice({ type: "error", text: getApiErrorMessage(error, "Export gagal.") });
    } finally {
      setBusy(false);
    }
  };

  const resetFilters = () => {
    setSearch("");
    setStatus("");
    setPriority("");
    setPropertyId("");
    setUnitId("");
    setAssigneeId("");
    setOverdueOnly(false);
    setDateFrom("");
    setDateTo("");
    setSort("newest");
  };

  return (
    <div className="space-y-5">
      <section className="rounded-3xl bg-gradient-to-br from-[#1E2746] via-[#273965] to-[#2C62A5] p-5 text-white shadow-sm sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs">Operasional Kikost</span>
            <h1 className="mt-3 text-2xl font-semibold sm:text-3xl">Task Management</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/80">Kelola laporan maintenance sebagai tugas operasional hingga pemeriksaan dan persetujuan akhir.</p>
          </div>
          {isAdmin ? (
            <button type="button" onClick={() => void handleExport()} disabled={busy} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-[#1E2746] disabled:opacity-60">
              <Download size={16} /> Ekspor CSV
            </button>
          ) : null}
        </div>
      </section>

      {notice ? (
        <div className={`rounded-xl border px-4 py-3 text-sm ${notice.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>
          {notice.text}
        </div>
      ) : null}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <SummaryCard label="Task Aktif" value={summary.active} icon={<ClipboardList size={18} />} />
        <SummaryCard label="Belum Ditugaskan" value={summary.unassigned} icon={<UserRoundCheck size={18} />} />
        <SummaryCard label="Dikerjakan" value={summary.in_progress} icon={<Wrench size={18} />} />
        <SummaryCard label="Menunggu Approval" value={summary.awaiting_approval} icon={<ShieldCheck size={18} />} />
        <SummaryCard label="Terlambat" value={summary.overdue} icon={<AlertTriangle size={18} />} danger={summary.overdue > 0} />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">Filter task</h2>
            <p className="text-xs text-slate-500">Filter dan urutan diproses oleh server.</p>
          </div>
          <button type="button" onClick={resetFilters} className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600"><RotateCcw size={14} /> Reset</button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="relative sm:col-span-2">
            <Search size={16} className="absolute left-3 top-3.5 text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari judul, deskripsi, tenant, properti, unit..." className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-sm outline-none focus:border-blue-400" />
          </label>
          <FilterSelect value={status} onChange={setStatus} label="Semua status" options={Object.entries(STATUS_LABELS)} />
          <FilterSelect value={priority} onChange={setPriority} label="Semua prioritas" options={Object.entries(PRIORITY_LABELS)} />
          <FilterSelect value={propertyId} onChange={setPropertyId} label="Semua properti" options={propertyOptions.map((item) => [String(item.id), item.name || `Properti #${item.id}`])} />
          <FilterSelect value={unitId} onChange={setUnitId} label="Semua unit" disabled={!propertyId && isAdmin} options={units.map((item) => [String(item.unit_id), item.unit_name])} />
          {isAdmin ? <FilterSelect value={assigneeId} onChange={setAssigneeId} label="Semua petugas" options={staff.map((item) => [String(item.id), item.full_name || item.email])} /> : null}
          <FilterSelect value={sort} onChange={setSort} label="Urutkan" options={[["newest", "Terbaru"], ["deadline_soonest", "Deadline terdekat"], ["priority_highest", "Prioritas tertinggi"], ["most_overdue", "Paling terlambat"]]} />
          <label className="text-xs font-medium text-slate-600">Dari tanggal<input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm" /></label>
          <label className="text-xs font-medium text-slate-600">Sampai tanggal<input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm" /></label>
          <label className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm text-slate-700"><input type="checkbox" checked={overdueOnly} onChange={(event) => setOverdueOnly(event.target.checked)} /> Hanya terlambat</label>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? <div className="flex h-56 items-center justify-center text-sm text-slate-500"><Loader2 className="mr-2 animate-spin" size={18} /> Memuat task...</div> : tasks.length === 0 ? <div className="p-12 text-center text-sm text-slate-500">Tidak ada task yang cocok dengan filter.</div> : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Task</th><th className="px-4 py-3">Lokasi</th><th className="px-4 py-3">Petugas</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">SLA</th><th className="px-4 py-3 text-right">Aksi</th></tr></thead>
                <tbody className="divide-y divide-slate-100">{tasks.map((task) => <TaskRow key={task.id} task={task} onOpen={() => void openDetail(task)} />)}</tbody>
              </table>
            </div>
            <div className="divide-y divide-slate-100 md:hidden">{tasks.map((task) => <TaskCard key={task.id} task={task} onOpen={() => void openDetail(task)} />)}</div>
          </>
        )}
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-600">
          <span>{meta?.total_count || 0} task</span>
          <div className="flex items-center gap-2"><button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded-lg border p-2 disabled:opacity-40"><ChevronLeft size={15} /></button><span>{page} / {totalPages}</span><button type="button" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)} className="rounded-lg border p-2 disabled:opacity-40"><ChevronRight size={15} /></button></div>
        </div>
      </section>

      {selected ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40" onMouseDown={(event) => event.target === event.currentTarget && setSelected(null)}>
          <aside className="h-full w-full overflow-y-auto bg-slate-50 shadow-2xl sm:max-w-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white px-5 py-4">
              <div className="min-w-0"><p className="text-xs font-semibold text-blue-600">TASK #{selected.id}</p><h2 className="truncate text-lg font-semibold text-slate-900">{selected.title || selected.issue}</h2></div>
              <button type="button" onClick={() => setSelected(null)} className="rounded-lg p-2 hover:bg-slate-100"><X size={19} /></button>
            </div>
            {detailLoading ? <div className="flex h-72 items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div> : (
              <div className="space-y-4 p-4 sm:p-5">
                <TaskOverview task={selected} />

                {selected.permissions.assign ? <Panel title="Assignment"><div className="flex gap-2"><select value={assigneeForm} onChange={(event) => setAssigneeForm(event.target.value)} className="h-10 flex-1 rounded-xl border border-slate-200 px-3 text-sm"><option value="">Pilih petugas</option>{staff.map((item) => <option key={item.id} value={item.id}>{item.full_name || item.email} · {item.role}</option>)}</select><ActionButton disabled={!assigneeForm || busy} onClick={() => void runAction(() => assignAdminMaintenanceRequest(selected.id, Number(assigneeForm)))}>Tugaskan</ActionButton></div></Panel> : null}

                {selected.permissions.update && isAdmin ? <Panel title="Prioritas, deadline, dan biaya"><div className="grid gap-3 sm:grid-cols-2"><FieldSelect label="Prioritas" value={editPriority} onChange={(value) => setEditPriority(value as MaintenancePriority)} options={Object.entries(PRIORITY_LABELS)} /><Field label="Due date" type="date" value={dueDate} onChange={setDueDate} /><Field label="SLA (WIB)" type="datetime-local" value={slaDueAt} onChange={setSlaDueAt} /><Field label="Estimasi biaya" type="number" value={estimatedCost} onChange={setEstimatedCost} /><Field label="Biaya aktual" type="number" value={actualCost} onChange={setActualCost} /></div><div className="mt-3 flex justify-end"><ActionButton disabled={busy} onClick={() => void runAction(() => updateAdminMaintenanceRequest(selected.id, { priority: editPriority, due_date: dueDate || null, sla_due_at: jakartaInputToUtc(slaDueAt), estimated_cost: estimatedCost ? Number(estimatedCost) : null, actual_cost: actualCost ? Number(actualCost) : null }))}>Simpan detail</ActionButton></div></Panel> : null}

                <Panel title="Checklist"><div className="space-y-2">{(selected.checklist || []).length === 0 ? <p className="text-sm text-slate-500">Belum ada checklist.</p> : selected.checklist?.map((item) => <div key={item.id} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3"><input type="checkbox" checked={item.completed} disabled={!selected.permissions.manage_checklist || busy} onChange={(event) => void handleChecklistToggle(item.id, event.target.checked)} className="mt-1" /><div className="min-w-0 flex-1"><p className={`text-sm ${item.completed ? "text-slate-400 line-through" : "text-slate-800"}`}>{item.description}{item.required ? <span className="ml-1 text-red-500">*</span> : null}</p>{item.completed_at ? <p className="mt-1 text-xs text-slate-400">{item.completed_by?.full_name || "Petugas"} · {formatJakarta(item.completed_at)}</p> : null}</div>{isAdmin && selected.permissions.manage_checklist ? <button type="button" disabled={busy} onClick={() => void (async () => { await deleteMaintenanceChecklistItem(selected.id, item.id); await reloadDetail(); })()} className="text-slate-400 hover:text-red-600"><Trash2 size={15} /></button> : null}</div>)}</div>{isAdmin && selected.permissions.manage_checklist ? <form className="mt-3 flex gap-2" onSubmit={(event) => { event.preventDefault(); if (!newChecklist.trim()) return; void (async () => { setBusy(true); try { await createMaintenanceChecklistItem(selected.id, { description: newChecklist.trim(), required: true }); setNewChecklist(""); await reloadDetail(); } catch (error) { setNotice({ type: "error", text: getApiErrorMessage(error, "Checklist gagal ditambahkan.") }); } finally { setBusy(false); } })(); }}><input value={newChecklist} onChange={(event) => setNewChecklist(event.target.value)} placeholder="Tambah item wajib..." className="h-10 flex-1 rounded-xl border border-slate-200 px-3 text-sm" /><ActionButton disabled={busy || !newChecklist.trim()} type="submit"><Plus size={15} /> Tambah</ActionButton></form> : null}</Panel>

                <Panel title="Bukti foto"><div className="grid gap-4 sm:grid-cols-2"><PhotoGroup title="Sebelum" photos={selected.before_photos || []} canEdit={selected.permissions.upload_photos} busy={busy} onUpload={(files) => void handlePhotoUpload("before", files)} onDelete={(id) => void runAction(() => deleteMaintenancePhoto(selected.id, id))} /><PhotoGroup title="Sesudah" photos={selected.after_photos || []} canEdit={selected.permissions.upload_photos && user?.role !== "tenant"} busy={busy} onUpload={(files) => void handlePhotoUpload("after", files)} onDelete={(id) => void runAction(() => deleteMaintenancePhoto(selected.id, id))} /></div></Panel>

                <Panel title="Aksi lifecycle"><LifecycleActions task={selected} busy={busy} completionNote={completionNote} setCompletionNote={setCompletionNote} revisionNote={revisionNote} setRevisionNote={setRevisionNote} runAction={runAction} /></Panel>

                <Panel title="Riwayat aktivitas"><div className="space-y-3">{(selected.activity_history || []).length === 0 ? <p className="text-sm text-slate-500">Belum ada aktivitas.</p> : selected.activity_history?.map((activity) => <div key={activity.id} className="border-l-2 border-blue-200 pl-3"><p className="text-sm font-medium text-slate-700">{activity.description}</p><p className="text-xs text-slate-400">{activity.actor?.full_name || "Sistem"} · {formatJakarta(activity.created_at)}</p></div>)}</div></Panel>
              </div>
            )}
          </aside>
        </div>
      ) : null}
    </div>
  );
}

function SummaryCard({ label, value, icon, danger = false }: { label: string; value: number; icon: React.ReactNode; danger?: boolean }) {
  return <div className={`rounded-2xl border bg-white p-4 shadow-sm ${danger ? "border-red-200" : "border-slate-200"}`}><div className={`mb-3 inline-flex rounded-xl p-2 ${danger ? "bg-red-100 text-red-700" : "bg-blue-50 text-blue-700"}`}>{icon}</div><p className="text-2xl font-semibold text-slate-900">{value}</p><p className="mt-1 text-xs text-slate-500">{label}</p></div>;
}

function FilterSelect({ value, onChange, label, options, disabled = false }: { value: string; onChange: (value: string) => void; label: string; options: string[][]; disabled?: boolean }) {
  return <select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 disabled:bg-slate-50"><option value="">{label}</option>{options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}</select>;
}

function TaskRow({ task, onOpen }: { task: AdminMaintenanceRequest; onOpen: () => void }) {
  return <tr className="hover:bg-slate-50"><td className="px-5 py-4"><p className="max-w-xs truncate font-semibold text-slate-900">{task.title || task.issue}</p><div className="mt-1"><Badge className={PRIORITY_STYLES[task.priority]}>{PRIORITY_LABELS[task.priority]}</Badge></div></td><td className="px-4 py-4 text-slate-600">{task.property.name}<p className="text-xs text-slate-400">{task.unit.name}</p></td><td className="px-4 py-4 text-slate-600">{task.assigned_to.full_name || "Belum ditugaskan"}</td><td className="px-4 py-4"><Badge className={STATUS_STYLES[task.status]}>{STATUS_LABELS[task.status]}</Badge></td><td className="px-4 py-4"><SlaBadge task={task} /></td><td className="px-4 py-4 text-right"><button type="button" onClick={onOpen} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-white"><Eye size={14} /> Detail</button></td></tr>;
}

function TaskCard({ task, onOpen }: { task: AdminMaintenanceRequest; onOpen: () => void }) {
  return <button type="button" onClick={onOpen} className="w-full p-4 text-left"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-semibold text-slate-900">{task.title || task.issue}</p><p className="mt-1 text-xs text-slate-500">{task.property.name} · {task.unit.name}</p></div><Eye size={17} className="shrink-0 text-slate-400" /></div><div className="mt-3 flex flex-wrap gap-2"><Badge className={STATUS_STYLES[task.status]}>{STATUS_LABELS[task.status]}</Badge><Badge className={PRIORITY_STYLES[task.priority]}>{PRIORITY_LABELS[task.priority]}</Badge><SlaBadge task={task} /></div></button>;
}

function Badge({ className, children }: { className: string; children: React.ReactNode }) { return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${className}`}>{children}</span>; }

function SlaBadge({ task }: { task: AdminMaintenanceRequest }) {
  const style = task.sla_status === "overdue" ? "bg-red-100 text-red-700" : task.sla_status === "approaching" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700";
  const label = task.sla_status === "overdue" ? "Terlambat" : task.sla_status === "approaching" ? "Mendekati" : "Aman";
  return <Badge className={style}>{label}{task.sla_due_at ? ` · ${formatJakarta(task.sla_due_at, true)}` : ""}</Badge>;
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) { return <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><h3 className="mb-3 text-sm font-semibold text-slate-900">{title}</h3>{children}</section>; }

function TaskOverview({ task }: { task: AdminMaintenanceRequest }) {
  return <Panel title="Ringkasan"><div className="flex flex-wrap gap-2"><Badge className={STATUS_STYLES[task.status]}>{STATUS_LABELS[task.status]}</Badge><Badge className={PRIORITY_STYLES[task.priority]}>{PRIORITY_LABELS[task.priority]}</Badge><SlaBadge task={task} /></div><p className="mt-3 whitespace-pre-wrap text-sm text-slate-600">{task.description || "Tidak ada deskripsi."}</p><dl className="mt-4 grid grid-cols-2 gap-3 text-xs"><Info label="Properti / Unit" value={`${task.property.name || "-"} / ${task.unit.name || "-"}`} /><Info label="Pelapor" value={task.tenant.full_name || "Admin"} /><Info label="Petugas" value={task.assigned_to.full_name || "Belum ditugaskan"} /><Info label="Due date" value={formatJakarta(task.due_date, true)} /><Info label="SLA (WIB)" value={formatJakarta(task.sla_due_at)} /><Info label="Mulai" value={formatJakarta(task.started_at)} /><Info label="Estimasi" value={money(task.estimated_cost)} /><Info label="Aktual" value={money(task.actual_cost)} /></dl>{task.revision_note ? <div className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-700"><strong>Catatan perbaikan:</strong> {task.revision_note}</div> : null}{task.cancellation_reason ? <div className="mt-3 rounded-xl bg-slate-100 p-3 text-sm text-slate-700"><strong>Alasan batal:</strong> {task.cancellation_reason}</div> : null}</Panel>;
}

function Info({ label, value }: { label: string; value: string }) { return <div><dt className="text-slate-400">{label}</dt><dd className="mt-1 font-medium text-slate-700">{value}</dd></div>; }

function Field({ label, type, value, onChange }: { label: string; type: string; value: string; onChange: (value: string) => void }) { return <label className="text-xs font-medium text-slate-600">{label}<input type={type} value={value} min={type === "number" ? "0" : undefined} onChange={(event) => onChange(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm" /></label>; }

function FieldSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[][] }) { return <label className="text-xs font-medium text-slate-600">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm">{options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}</select></label>; }

function ActionButton({ children, onClick, disabled = false, type = "button", danger = false }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; type?: "button" | "submit"; danger?: boolean }) { return <button type={type} onClick={onClick} disabled={disabled} className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl px-3 text-xs font-semibold text-white disabled:opacity-50 ${danger ? "bg-red-600" : "bg-blue-600"}`}>{children}</button>; }

function PhotoGroup({ title, photos, canEdit, busy, onUpload, onDelete }: { title: string; photos: MaintenancePhoto[]; canEdit: boolean; busy: boolean; onUpload: (files: File[]) => void; onDelete: (id: number) => void }) {
  return <div><div className="mb-2 flex items-center justify-between"><p className="text-xs font-semibold text-slate-600">{title} ({photos.length}/5)</p>{canEdit ? <label className="cursor-pointer rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50"><Paperclip size={14} /><input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={busy} className="hidden" onChange={(event) => { onUpload(Array.from(event.target.files || [])); event.currentTarget.value = ""; }} /></label> : null}</div><div className="grid grid-cols-3 gap-2">{photos.map((photo) => <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-xl bg-slate-100"><Image src={getMaintenancePhotoUrl(photo.url)} alt={`Foto ${title}`} fill unoptimized className="object-cover" />{canEdit ? <button type="button" onClick={() => onDelete(photo.id)} disabled={busy} className="absolute right-1 top-1 rounded-full bg-slate-950/70 p-1 text-white opacity-0 group-hover:opacity-100"><X size={12} /></button> : null}</div>)}{photos.length === 0 ? <div className="col-span-3 rounded-xl border border-dashed border-slate-200 p-5 text-center text-xs text-slate-400">Belum ada foto</div> : null}</div></div>;
}

function LifecycleActions({ task, busy, completionNote, setCompletionNote, revisionNote, setRevisionNote, runAction }: { task: AdminMaintenanceRequest; busy: boolean; completionNote: string; setCompletionNote: (value: string) => void; revisionNote: string; setRevisionNote: (value: string) => void; runAction: (action: () => Promise<{ data?: AdminMaintenanceRequest; message: string }>) => Promise<void> }) {
  const canStart = task.permissions.allowed_transitions.includes("in_progress");
  const canSubmit = task.permissions.allowed_transitions.includes("awaiting_approval");
  return <div className="space-y-3">{canStart ? <ActionButton disabled={busy} onClick={() => void runAction(() => transitionMaintenanceRequest(task.id, { status: "in_progress" }))}><Wrench size={15} /> Mulai pekerjaan</ActionButton> : null}{canSubmit ? <><textarea value={completionNote} onChange={(event) => setCompletionNote(event.target.value)} placeholder="Completion note wajib diisi..." className="min-h-24 w-full rounded-xl border border-slate-200 p-3 text-sm" /><ActionButton disabled={busy || !completionNote.trim()} onClick={() => void runAction(() => transitionMaintenanceRequest(task.id, { status: "awaiting_approval", completion_note: completionNote.trim() }))}><CalendarClock size={15} /> Ajukan persetujuan</ActionButton></> : null}{task.permissions.approve ? <div className="flex flex-wrap gap-2"><ActionButton disabled={busy} onClick={() => void runAction(() => approveMaintenanceRequest(task.id))}><Check size={15} /> Setujui & selesai</ActionButton></div> : null}{task.permissions.request_revision ? <><textarea value={revisionNote} onChange={(event) => setRevisionNote(event.target.value)} placeholder="Alasan perbaikan wajib diisi..." className="min-h-20 w-full rounded-xl border border-slate-200 p-3 text-sm" /><ActionButton danger disabled={busy || !revisionNote.trim()} onClick={() => void runAction(() => requestMaintenanceRevision(task.id, revisionNote.trim()))}>Minta perbaikan</ActionButton></> : null}{task.permissions.cancel ? <button type="button" disabled={busy} onClick={() => { const reason = window.prompt("Alasan pembatalan (wajib):"); if (reason?.trim() && window.confirm("Batalkan task ini?")) void runAction(() => cancelMaintenanceRequest(task.id, reason.trim())); }} className="block text-xs font-semibold text-red-600 hover:underline">Batalkan task</button> : null}{["completed", "cancelled"].includes(task.status) ? <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700"><CheckCircle2 size={17} /> Task sudah final.</div> : null}</div>;
}
