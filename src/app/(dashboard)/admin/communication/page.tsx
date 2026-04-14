"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Filter,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  createAdminCommunication,
  deleteAdminCommunication,
  getAdminCommunications,
  getAdminProperties,
  getAdminTenants,
  getApiErrorMessage,
  updateAdminCommunication,
  type AdminCommunication,
  type AdminPropertyListItem,
  type AdminUser,
} from "@/lib/dashboard/admin.api";

const statusStyleMap: Record<string, string> = {
  sent: "bg-blue-100 text-blue-700",
  scheduled: "bg-purple-100 text-purple-700",
  failed: "bg-red-100 text-red-700",
};

const statusLabelMap: Record<string, string> = {
  sent: "Terkirim",
  scheduled: "Terjadwal",
  failed: "Gagal",
};

const audienceLabelMap: Record<string, string> = {
  all_tenants: "Semua Penyewa",
  some_tenants: "Penyewa Tertentu",
  specific_tenants: "Penyewa Spesifik",
};

const PAGE_SIZE = 10;

type Notice = {
  variant: "success" | "error";
  message: string;
} | null;

type FormMode = "create" | "edit";

type CommunicationFormState = {
  propertyId: string;
  audienceType: "all_tenants" | "some_tenants" | "specific_tenants";
  subject: string;
  message: string;
  visitFollowUpDate: string;
  visitFollowUpTime: string;
  visitAdminNote: string;
  scheduleMode: "now" | "schedule";
  scheduledAt: string;
  selectedTenantIds: string[];
};

type VisitRequestContext = {
  tenantName: string;
  tenantEmail: string;
  tenantPhone: string;
  propertyName: string;
  propertyAddress: string;
  preferredDate: string;
  preferredTime: string;
  note: string;
};

const VISIT_REQUEST_SUBJECT_PREFIX = "permintaan jadwal visit";
const VISIT_TENANT_MESSAGE_MARKER = "pesan untuk penyewa:";

const getVisitMessageValue = (message: string, label: string) => {
  const prefix = `${label.toLowerCase()}:`;
  const line = message
    .split("\n")
    .map((item) => item.trim())
    .find((item) => item.toLowerCase().startsWith(prefix));

  if (!line) {
    return "-";
  }

  return line.slice(prefix.length).trim() || "-";
};

const isVisitRequestCommunication = (
  communication?: Pick<AdminCommunication, "subject" | "message"> | null
) => {
  if (!communication) {
    return false;
  }

  const subject = communication.subject?.toLowerCase() || "";
  const message = communication.message?.toLowerCase() || "";

  return (
    subject.startsWith(VISIT_REQUEST_SUBJECT_PREFIX) ||
    (message.includes("tanggal preferensi:") &&
      message.includes("jam preferensi:") &&
      message.includes("nama penyewa:"))
  );
};

const extractVisitRequestContext = (message: string): VisitRequestContext => {
  return {
    tenantName: getVisitMessageValue(message, "Nama penyewa"),
    tenantEmail: getVisitMessageValue(message, "Email penyewa"),
    tenantPhone: getVisitMessageValue(message, "Nomor HP penyewa"),
    propertyName: getVisitMessageValue(message, "Properti"),
    propertyAddress: getVisitMessageValue(message, "Alamat properti"),
    preferredDate: getVisitMessageValue(message, "Tanggal preferensi"),
    preferredTime: getVisitMessageValue(message, "Jam preferensi"),
    note: getVisitMessageValue(message, "Catatan"),
  };
};

const toInputDate = (value: string) => {
  const normalized = value.trim();
  if (!normalized || normalized === "-") {
    return "";
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return normalized;
  }

  const slashMatch = normalized.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (slashMatch) {
    const [, day, month, year] = slashMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  const localDate = new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 10);
};

const toInputTime = (value: string) => {
  const normalized = value.trim();
  if (!normalized || normalized === "-") {
    return "";
  }

  const match = normalized.match(/(\d{1,2}):(\d{2})/);
  if (!match) {
    return "";
  }

  const [, hours, minutes] = match;
  return `${hours.padStart(2, "0")}:${minutes}`;
};

const formatVisitFollowUpDate = (value: string) => {
  if (!value) {
    return "-";
  }

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const extractTenantMessageFromVisitText = (message: string) => {
  const lower = message.toLowerCase();
  const markerIndex = lower.indexOf(VISIT_TENANT_MESSAGE_MARKER);
  if (markerIndex < 0) {
    return "";
  }

  return message
    .slice(markerIndex + VISIT_TENANT_MESSAGE_MARKER.length)
    .trim();
};

const buildVisitFollowUpMessage = ({
  context,
  followUpDate,
  followUpTime,
  adminNote,
  tenantMessage,
}: {
  context: VisitRequestContext;
  followUpDate: string;
  followUpTime: string;
  adminNote: string;
  tenantMessage: string;
}) => {
  return [
    "Permintaan jadwal visit telah ditinjau admin.",
    `Nama penyewa: ${context.tenantName}`,
    `Email penyewa: ${context.tenantEmail}`,
    `Nomor HP penyewa: ${context.tenantPhone}`,
    `Properti: ${context.propertyName}`,
    `Alamat properti: ${context.propertyAddress}`,
    `Tanggal preferensi: ${context.preferredDate}`,
    `Jam preferensi: ${context.preferredTime}`,
    `Tanggal kunjungan disetujui: ${formatVisitFollowUpDate(followUpDate)}`,
    `Jam kunjungan disetujui: ${followUpTime || "-"}`,
    `Catatan penyewa: ${context.note}`,
    `Catatan admin: ${adminNote || "-"}`,
    "Pesan untuk penyewa:",
    tenantMessage || "-",
  ].join("\n");
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

const formatTime = (value?: string | null) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
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

const toInputDateTime = (value?: string | null) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
};

const toApiDateTime = (value: string) => {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toISOString();
};

const getDefaultScheduledAt = () => {
  const nextHour = new Date(Date.now() + 60 * 60 * 1000);
  const localDate = new Date(
    nextHour.getTime() - nextHour.getTimezoneOffset() * 60_000
  );
  return localDate.toISOString().slice(0, 16);
};

const getInitialForm = (): CommunicationFormState => ({
  propertyId: "",
  audienceType: "all_tenants",
  subject: "",
  message: "",
  visitFollowUpDate: "",
  visitFollowUpTime: "",
  visitAdminNote: "",
  scheduleMode: "now",
  scheduledAt: getDefaultScheduledAt(),
  selectedTenantIds: [],
});

export default function AdminCommunicationPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [propertyFilter, setPropertyFilter] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "scheduled">(
    "newest"
  );
  const [messages, setMessages] = useState<AdminCommunication[]>([]);
  const [properties, setProperties] = useState<AdminPropertyListItem[]>([]);
  const [tenants, setTenants] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [notice, setNotice] = useState<Notice>(null);
  const [viewMessage, setViewMessage] = useState<AdminCommunication | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>("create");
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [editingMessage, setEditingMessage] = useState<AdminCommunication | null>(
    null
  );
  const [form, setForm] = useState<CommunicationFormState>(getInitialForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    let active = true;

    const loadCommunications = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [communicationResponse, propertiesResponse, tenantsResponse] =
          await Promise.all([
            getAdminCommunications({
              page: 1,
              per_page: 100,
            }),
            getAdminProperties({
              page: 1,
              per_page: 100,
            }),
            getAdminTenants({
              page: 1,
              per_page: 100,
            }),
          ]);

        if (!active) {
          return;
        }

        setMessages(communicationResponse.data);
        setProperties(propertiesResponse.data);
        setTenants(tenantsResponse.data);
      } catch (loadError) {
        if (!active) {
          return;
        }

        setError(
          getApiErrorMessage(
            loadError,
            "Data komunikasi gagal dimuat. Silakan coba lagi."
          )
        );
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadCommunications();

    return () => {
      active = false;
    };
  }, [refreshKey]);

  const filtered = useMemo(() => {
    const filteredMessages = messages.filter((message) => {
      const searchable =
        `${message.target_property} ${message.subject} ${message.message}`.toLowerCase();

      return (
        searchable.includes(search.toLowerCase()) &&
        (status ? message.status === status : true) &&
        (propertyFilter ? String(message.property.id || "") === propertyFilter : true)
      );
    });
    return filteredMessages.sort((a, b) => {
      if (sortBy === "scheduled") {
        const scheduleA = new Date(a.scheduled_at || 0).getTime();
        const scheduleB = new Date(b.scheduled_at || 0).getTime();
        return scheduleA - scheduleB;
      }

      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      return sortBy === "oldest" ? dateA - dateB : dateB - dateA;
    });
  }, [messages, search, status, propertyFilter, sortBy]);

  const stats = useMemo(() => {
    const sent = messages.filter((item) => item.status === "sent").length;
    const scheduled = messages.filter((item) => item.status === "scheduled").length;
    const failed = messages.filter((item) => item.status === "failed").length;
    const visitRequests = messages.filter((item) =>
      isVisitRequestCommunication(item)
    ).length;

    return {
      total: messages.length,
      sent,
      scheduled,
      failed,
      visitRequests,
    };
  }, [messages]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const pagedMessages = filtered.slice(startIndex, startIndex + PAGE_SIZE);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, status, propertyFilter, sortBy]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const selectedTenantCount = form.selectedTenantIds.length;
  const isVisitRequestEdit =
    formMode === "edit" && isVisitRequestCommunication(editingMessage);
  const visitRequestContext = useMemo(() => {
    if (!isVisitRequestEdit || !editingMessage?.message) {
      return null;
    }

    return extractVisitRequestContext(editingMessage.message);
  }, [editingMessage, isVisitRequestEdit]);

  const openCreateModal = () => {
    setNotice(null);
    setFormMode("create");
    setEditingMessageId(null);
    setEditingMessage(null);
    setForm(getInitialForm());
    setFormError(null);
    setIsFormOpen(true);
  };

  const openEditModal = (message: AdminCommunication) => {
    const scheduledDate = message.scheduled_at ? new Date(message.scheduled_at) : null;
    const useSchedule =
      Boolean(scheduledDate) &&
      !Number.isNaN(scheduledDate.getTime()) &&
      scheduledDate.getTime() > Date.now();
    const isVisitRequest = isVisitRequestCommunication(message);
    const visitContext = extractVisitRequestContext(message.message || "");
    const followUpDate = toInputDate(
      getVisitMessageValue(message.message || "", "Tanggal kunjungan disetujui")
    );
    const followUpTime = toInputTime(
      getVisitMessageValue(message.message || "", "Jam kunjungan disetujui")
    );
    const adminNote = getVisitMessageValue(message.message || "", "Catatan admin");

    setNotice(null);
    setFormMode("edit");
    setEditingMessageId(message.id);
    setEditingMessage(message);
    setForm({
      propertyId: message.property.id ? String(message.property.id) : "",
      audienceType: message.audience_type,
      subject: message.subject || "",
      message: isVisitRequest
        ? extractTenantMessageFromVisitText(message.message || "")
        : message.message || "",
      visitFollowUpDate: isVisitRequest ? followUpDate : "",
      visitFollowUpTime: isVisitRequest ? followUpTime : "",
      visitAdminNote:
        isVisitRequest && adminNote !== "-" ? adminNote : "",
      scheduleMode: useSchedule ? "schedule" : "now",
      scheduledAt: toInputDateTime(message.scheduled_at) || getDefaultScheduledAt(),
      selectedTenantIds:
        message.recipients?.map((recipient) => String(recipient.tenant_id)) ||
        (isVisitRequest && visitContext.tenantEmail !== "-"
          ? tenants
              .filter(
                (tenant) =>
                  tenant.email.toLowerCase() === visitContext.tenantEmail.toLowerCase()
              )
              .map((tenant) => String(tenant.id))
          : []),
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  const closeFormModal = () => {
    if (isSubmitting) {
      return;
    }

    setIsFormOpen(false);
    setEditingMessage(null);
    setFormError(null);
  };

  const toggleTenantSelection = (tenantId: string) => {
    setForm((previous) => {
      const exists = previous.selectedTenantIds.includes(tenantId);
      const nextSelectedIds = exists
        ? previous.selectedTenantIds.filter((id) => id !== tenantId)
        : [...previous.selectedTenantIds, tenantId];

      return {
        ...previous,
        selectedTenantIds: nextSelectedIds,
      };
    });
  };

  const handleSubmitForm = async () => {
    const subject = form.subject.trim();
    const messageBody = form.message.trim();

    if (!subject) {
      setFormError("Subjek wajib diisi.");
      return;
    }

    if (isVisitRequestEdit && (!form.visitFollowUpDate || !form.visitFollowUpTime)) {
      setFormError("Tanggal dan jam tindak lanjut visit wajib diisi.");
      return;
    }

    if (!messageBody) {
      setFormError(
        isVisitRequestEdit
          ? "Pesan balasan ke penyewa wajib diisi."
          : "Isi pesan wajib diisi."
      );
      return;
    }

    if (
      !isVisitRequestEdit &&
      form.audienceType !== "all_tenants" &&
      form.selectedTenantIds.length === 0
    ) {
      setFormError("Pilih minimal satu penerima.");
      return;
    }

    if (form.scheduleMode === "schedule" && !form.scheduledAt) {
      setFormError("Jadwal kirim wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    setNotice(null);

    try {
      const visitContext =
        isVisitRequestEdit && editingMessage?.message
          ? extractVisitRequestContext(editingMessage.message)
          : null;
      const finalMessage =
        isVisitRequestEdit && visitContext
          ? buildVisitFollowUpMessage({
              context: visitContext,
              followUpDate: form.visitFollowUpDate,
              followUpTime: form.visitFollowUpTime,
              adminNote: form.visitAdminNote.trim(),
              tenantMessage: messageBody,
            })
          : messageBody;

      const payload = {
        property_id: form.propertyId ? Number(form.propertyId) : null,
        audience_type: form.audienceType,
        subject,
        message: finalMessage,
        ...(!isVisitRequestEdit && form.audienceType !== "all_tenants"
          ? {
              tenant_ids: form.selectedTenantIds.map((id) => Number(id)),
            }
          : {}),
        ...(form.scheduleMode === "now"
          ? { send_now: true }
          : {
              scheduled_at: toApiDateTime(form.scheduledAt),
            }),
      };

      if (formMode === "create") {
        await createAdminCommunication(payload);
        setNotice({
          variant: "success",
          message: "Pesan komunikasi berhasil dibuat.",
        });
      } else {
        if (!editingMessageId) {
          throw new Error("Data komunikasi tidak ditemukan.");
        }

        await updateAdminCommunication(editingMessageId, payload);
        setNotice({
          variant: "success",
          message: isVisitRequestEdit
            ? "Tindak lanjut permintaan jadwal visit berhasil diperbarui."
            : "Pesan komunikasi berhasil diperbarui.",
        });
      }

      setIsFormOpen(false);
      setRefreshKey((previous) => previous + 1);
    } catch (saveError) {
      setFormError(getApiErrorMessage(saveError, "Gagal menyimpan komunikasi."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMessage = async (message: AdminCommunication) => {
    const agreed = window.confirm(
      `Hapus pesan "${message.subject}"? Tindakan ini tidak bisa dibatalkan.`
    );
    if (!agreed) {
      return;
    }

    setIsDeletingId(message.id);
    setNotice(null);

    try {
      await deleteAdminCommunication(message.id);
      setNotice({
        variant: "success",
        message: "Pesan komunikasi berhasil dihapus.",
      });
      setRefreshKey((previous) => previous + 1);
    } catch (deleteError) {
      setNotice({
        variant: "error",
        message: getApiErrorMessage(deleteError, "Gagal menghapus komunikasi."),
      });
    } finally {
      setIsDeletingId(null);
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
              Modul Komunikasi
            </p>
            <h1 className="mt-3 text-2xl font-semibold md:text-3xl">
              Kelola Komunikasi Penyewa
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-white/85">
              Kirim pesan massal, jadwalkan pengiriman, dan tindak lanjuti permintaan
              jadwal visit.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-[#1E2746] hover:bg-slate-100"
          >
            <Plus size={16} />
            Tambah Pesan
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard label="Total Pesan" value={String(stats.total)} />
        <SummaryCard label="Terkirim" value={String(stats.sent)} tone="success" />
        <SummaryCard
          label="Terjadwal"
          value={String(stats.scheduled)}
          tone="warning"
        />
        <SummaryCard label="Gagal" value={String(stats.failed)} tone="danger" />
        <SummaryCard label="Permintaan Visit" value={String(stats.visitRequests)} />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
          <div className="relative min-w-[240px] flex-1">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              placeholder="Cari properti, subjek, atau isi pesan..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm focus:border-blue-400 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="relative min-w-[170px]">
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
              <option value="sent">Terkirim</option>
              <option value="scheduled">Terjadwal</option>
              <option value="failed">Gagal</option>
            </select>
          </div>

          <select
            value={propertyFilter}
            onChange={(event) => setPropertyFilter(event.target.value)}
            className="h-11 min-w-[220px] rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm focus:border-blue-400 focus:bg-white focus:outline-none"
          >
            <option value="">Semua Properti</option>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(event) =>
              setSortBy(event.target.value as "newest" | "oldest" | "scheduled")
            }
            className="h-11 min-w-[170px] rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm focus:border-blue-400 focus:bg-white focus:outline-none"
          >
            <option value="newest">Terbaru</option>
            <option value="oldest">Terlama</option>
            <option value="scheduled">Jadwal Kirim</option>
          </select>

          <button
            type="button"
            onClick={() => {
              setSearch("");
              setStatus("");
              setPropertyFilter("");
              setSortBy("newest");
              setCurrentPage(1);
            }}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <RotateCcw size={14} />
            Reset
          </button>

          {error && (
            <button
              type="button"
              onClick={() => setRefreshKey((prev) => prev + 1)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-medium text-red-700 hover:bg-red-100"
            >
              <RotateCcw size={14} />
              Muat Ulang
            </button>
          )}
        </div>

        <p className="mt-3 text-xs text-slate-500">
          Menampilkan <span className="font-semibold">{filtered.length}</span> dari{" "}
          <span className="font-semibold">{messages.length}</span> komunikasi.
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
          <table className="min-w-[1060px] w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="p-4 text-left">Tanggal & Waktu</th>
                <th className="p-4 text-left">Target Properti</th>
                <th className="p-4 text-left">Subjek</th>
                <th className="p-4 text-left">Audiens</th>
                <th className="p-4 text-left">Status</th>
                <th className="p-4 text-left">Aksi</th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-500">
                    Memuat data komunikasi...
                  </td>
                </tr>
              ) : pagedMessages.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-500">
                    Tidak ada data komunikasi.
                  </td>
                </tr>
              ) : (
                pagedMessages.map((message) => (
                  <tr key={message.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="p-4">
                      <div className="font-medium text-slate-700">
                        {formatDate(message.scheduled_at || message.created_at)}
                      </div>
                      <div className="text-xs text-slate-500">
                        {formatTime(message.scheduled_at || message.created_at)}
                      </div>
                    </td>

                    <td className="p-4 text-slate-700">{message.target_property || "-"}</td>

                    <td className="p-4">
                      <p className="font-medium text-slate-700">{message.subject}</p>
                      {isVisitRequestCommunication(message) ? (
                        <span className="mt-1 inline-flex rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700">
                          Permintaan Visit
                        </span>
                      ) : null}
                    </td>

                    <td className="p-4 text-slate-700">
                      {audienceLabelMap[message.audience_type] || message.audience_label}
                    </td>

                    <td className="p-4">
                      <StatusBadge status={message.status} />
                    </td>

                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setViewMessage(message)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:border-green-200 hover:bg-green-50 hover:text-green-700"
                          title="Lihat detail"
                        >
                          <Eye size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={() => openEditModal(message)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                          title="Edit pesan"
                        >
                          <Pencil size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            void handleDeleteMessage(message);
                          }}
                          disabled={isDeletingId === message.id}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                          title="Hapus pesan"
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
            komunikasi
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

      {viewMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-800">Detail Komunikasi</h2>
              <button
                type="button"
                onClick={() => setViewMessage(null)}
                className="rounded-lg p-2 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 px-6 py-5 text-sm">
              <div className="mb-1 rounded-xl border border-slate-100 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Komunikasi #{viewMessage.id}
                </p>
                <p className="mt-1 font-semibold text-slate-800">{viewMessage.subject}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {viewMessage.target_property || "Semua Properti"}
                </p>
              </div>
              <DetailRow label="Subjek" value={viewMessage.subject || "-"} />
              <DetailRow
                label="Target Properti"
                value={viewMessage.target_property || "Semua Properti"}
              />
              <DetailRow
                label="Audiens"
                value={
                  audienceLabelMap[viewMessage.audience_type] ||
                  viewMessage.audience_label
                }
              />
              <DetailRow
                label="Status"
                value={statusLabelMap[viewMessage.status] || viewMessage.status}
              />
              <DetailRow
                label="Jadwal Kirim"
                value={formatDateTime(viewMessage.scheduled_at)}
              />
              <DetailRow
                label="Terkirim Pada"
                value={formatDateTime(viewMessage.sent_at)}
              />
              <DetailRow
                label="Jumlah Penerima"
                value={String(viewMessage.recipient_count || 0)}
              />
              <DetailRow
                label="Dibuat Oleh"
                value={viewMessage.created_by.full_name || "-"}
              />

              <div className="space-y-2 rounded-xl border border-slate-200 p-3">
                <p className="font-medium text-slate-700">Isi Pesan</p>
                <p className="whitespace-pre-line text-slate-700">
                  {viewMessage.message || "-"}
                </p>
              </div>

              {viewMessage.recipients && viewMessage.recipients.length > 0 && (
                <div className="space-y-2 rounded-xl border border-slate-200 p-3">
                  <p className="font-medium text-slate-700">Daftar Penerima</p>
                  <div className="max-h-40 space-y-2 overflow-auto text-xs">
                    {viewMessage.recipients.map((recipient) => (
                      <div
                        key={`${viewMessage.id}-${recipient.tenant_id}`}
                        className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
                      >
                        <span className="text-slate-700">
                          {recipient.tenant_name || `Tenant #${recipient.tenant_id}`}
                        </span>
                        <span className="text-slate-500">
                          {statusLabelMap[recipient.status] || recipient.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end border-t bg-slate-50 px-6 py-4">
              <button
                type="button"
                onClick={() => setViewMessage(null)}
                className="h-11 rounded-xl bg-[#1E2746] px-6 font-medium text-white hover:bg-[#141B35]"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {isFormOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4">
          <div className="my-6 flex min-h-[calc(100vh-3rem)] items-center justify-center">
            <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
              <div className="flex shrink-0 items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-800">
                {formMode === "create"
                  ? "Tambah Pesan Komunikasi"
                  : isVisitRequestEdit
                    ? "Tindak Lanjut Permintaan Jadwal Visit"
                    : "Edit Pesan Komunikasi"}
              </h2>
              <button
                type="button"
                onClick={closeFormModal}
                disabled={isSubmitting}
                className="rounded-lg p-2 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

              <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
              {isVisitRequestEdit && visitRequestContext ? (
                <div className="space-y-3 rounded-xl border border-sky-200 bg-sky-50/60 p-4">
                  <p className="text-sm font-semibold text-sky-800">
                    Ringkasan Permintaan Visit
                  </p>
                  <div className="grid grid-cols-1 gap-2 text-xs text-slate-700 md:grid-cols-2">
                    <VisitContextRow label="Nama Penyewa" value={visitRequestContext.tenantName} />
                    <VisitContextRow label="Email Penyewa" value={visitRequestContext.tenantEmail} />
                    <VisitContextRow label="Nomor HP" value={visitRequestContext.tenantPhone} />
                    <VisitContextRow label="Properti" value={visitRequestContext.propertyName} />
                    <VisitContextRow label="Tanggal Preferensi" value={visitRequestContext.preferredDate} />
                    <VisitContextRow label="Jam Preferensi" value={visitRequestContext.preferredTime} />
                  </div>
                  <div className="rounded-lg border border-sky-100 bg-white/80 px-3 py-2 text-xs text-slate-700">
                    <span className="font-medium text-slate-800">Alamat:</span>{" "}
                    {visitRequestContext.propertyAddress}
                  </div>
                  <div className="rounded-lg border border-sky-100 bg-white/80 px-3 py-2 text-xs text-slate-700">
                    <span className="font-medium text-slate-800">Catatan Penyewa:</span>{" "}
                    {visitRequestContext.note}
                  </div>
                </div>
              ) : null}

              {isVisitRequestEdit ? (
                <>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <ReadonlyInfoField
                      label="Target Properti"
                      value={editingMessage?.target_property || "Semua Properti"}
                    />
                    <ReadonlyInfoField
                      label="Audiens"
                      value={
                        editingMessage
                          ? audienceLabelMap[editingMessage.audience_type] ||
                            editingMessage.audience_label
                          : "-"
                      }
                    />
                    <ReadonlyInfoField
                      label="Subjek"
                      value={editingMessage?.subject || "-"}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">
                        Tanggal Kunjungan Disepakati
                      </label>
                      <input
                        type="date"
                        value={form.visitFollowUpDate}
                        onChange={(event) =>
                          setForm((previous) => ({
                            ...previous,
                            visitFollowUpDate: event.target.value,
                          }))
                        }
                        className="h-11 w-full rounded-xl border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F6EF7]"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">
                        Jam Kunjungan Disepakati
                      </label>
                      <input
                        type="time"
                        value={form.visitFollowUpTime}
                        onChange={(event) =>
                          setForm((previous) => ({
                            ...previous,
                            visitFollowUpTime: event.target.value,
                          }))
                        }
                        className="h-11 w-full rounded-xl border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F6EF7]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Catatan Internal Admin (Opsional)
                    </label>
                    <textarea
                      value={form.visitAdminNote}
                      onChange={(event) =>
                        setForm((previous) => ({
                          ...previous,
                          visitAdminNote: event.target.value,
                        }))
                      }
                      rows={2}
                      className="w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F6EF7]"
                      placeholder="Contoh: Koordinasikan dengan PIC properti sebelum visit."
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">
                        Target Properti
                      </label>
                      <select
                        value={form.propertyId}
                        onChange={(event) =>
                          setForm((previous) => ({
                            ...previous,
                            propertyId: event.target.value,
                          }))
                        }
                        className="h-11 w-full rounded-xl border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F6EF7]"
                      >
                        <option value="">Semua Properti</option>
                        {properties.map((property) => (
                          <option key={property.id} value={property.id}>
                            {property.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">
                        Audiens
                      </label>
                      <select
                        value={form.audienceType}
                        onChange={(event) =>
                          setForm((previous) => ({
                            ...previous,
                            audienceType:
                              event.target.value as CommunicationFormState["audienceType"],
                            selectedTenantIds:
                              event.target.value === "all_tenants"
                                ? []
                                : previous.selectedTenantIds,
                          }))
                        }
                        className="h-11 w-full rounded-xl border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F6EF7]"
                      >
                        <option value="all_tenants">Semua Penyewa</option>
                        <option value="some_tenants">Penyewa Tertentu</option>
                        <option value="specific_tenants">Penyewa Spesifik</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Subjek
                    </label>
                    <input
                      value={form.subject}
                      onChange={(event) =>
                        setForm((previous) => ({
                          ...previous,
                          subject: event.target.value,
                        }))
                      }
                      className="h-11 w-full rounded-xl border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F6EF7]"
                      placeholder="Contoh: Informasi pemeliharaan rutin gedung"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  {isVisitRequestEdit ? "Pesan Balasan ke Penyewa" : "Isi Pesan"}
                </label>
                <textarea
                  value={form.message}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      message: event.target.value,
                    }))
                  }
                  rows={4}
                  className="w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F6EF7]"
                  placeholder={
                    isVisitRequestEdit
                      ? "Tuliskan balasan yang akan diterima penyewa untuk konfirmasi visit."
                      : "Tuliskan detail informasi yang ingin disampaikan ke penyewa."
                  }
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    {isVisitRequestEdit ? "Waktu Tindak Lanjut" : "Waktu Kirim"}
                  </label>
                  <select
                    value={form.scheduleMode}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        scheduleMode: event.target.value as "now" | "schedule",
                      }))
                    }
                    className="h-11 w-full rounded-xl border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F6EF7]"
                  >
                    <option value="now">Kirim Sekarang</option>
                    <option value="schedule">Jadwalkan</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    {isVisitRequestEdit ? "Jadwal Tindak Lanjut" : "Jadwal Kirim"}
                  </label>
                  <input
                    type="datetime-local"
                    value={form.scheduledAt}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        scheduledAt: event.target.value,
                      }))
                    }
                    disabled={form.scheduleMode !== "schedule"}
                    className="h-11 w-full rounded-xl border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F6EF7] disabled:cursor-not-allowed disabled:bg-slate-100"
                  />
                </div>
              </div>

              {isVisitRequestEdit && (
                <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-sm font-medium text-slate-700">Penerima Permintaan Visit</p>
                  <div className="max-h-40 space-y-2 overflow-auto text-xs text-slate-700">
                    {form.selectedTenantIds.length === 0 ? (
                      <p className="text-slate-500">Data penerima tidak ditemukan.</p>
                    ) : (
                      form.selectedTenantIds.map((tenantId) => {
                        const tenant = tenants.find((item) => String(item.id) === tenantId);
                        return (
                          <div
                            key={`visit-recipient-${tenantId}`}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2"
                          >
                            <p className="font-medium text-slate-800">
                              {tenant?.full_name || `Tenant #${tenantId}`}
                            </p>
                            <p className="text-slate-500">{tenant?.email || "-"}</p>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {form.audienceType !== "all_tenants" && !isVisitRequestEdit && (
                <div className="space-y-2 rounded-xl border border-slate-200 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-700">
                      Pilih Penerima
                    </p>
                    <span className="text-xs text-slate-500">
                      {selectedTenantCount} dipilih
                    </span>
                  </div>

                  <div className="max-h-48 space-y-2 overflow-auto">
                    {tenants.length === 0 ? (
                      <p className="text-sm text-slate-500">Tidak ada data penyewa.</p>
                    ) : (
                      tenants.map((tenant) => {
                        const checked = form.selectedTenantIds.includes(
                          String(tenant.id)
                        );

                        return (
                          <label
                            key={tenant.id}
                            className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleTenantSelection(String(tenant.id))}
                            />
                            <span>{tenant.full_name}</span>
                            <span className="text-xs text-slate-500">
                              ({tenant.email})
                            </span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {formError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {formError}
                </div>
              )}
            </div>

              <div className="flex shrink-0 justify-end gap-3 border-t bg-slate-50 px-6 py-4">
              <button
                type="button"
                onClick={closeFormModal}
                disabled={isSubmitting}
                className="h-11 rounded-xl border px-5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleSubmitForm();
                }}
                disabled={isSubmitting}
                className="h-11 rounded-xl bg-[#4F6EF7] px-5 text-sm font-medium text-white hover:bg-[#3E5BE0] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting
                  ? "Menyimpan..."
                  : formMode === "create"
                    ? "Simpan Pesan"
                  : "Simpan Perubahan"}
              </button>
            </div>
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
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const valueStyle =
    tone === "success"
      ? "text-emerald-700"
      : tone === "warning"
        ? "text-amber-700"
        : tone === "danger"
          ? "text-red-700"
          : "text-slate-800";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${valueStyle}`}>{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: "sent" | "scheduled" | "failed" }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
        statusStyleMap[status] || "bg-slate-100 text-slate-700"
      }`}
    >
      {statusLabelMap[status] || status}
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

function VisitContextRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-sky-100 bg-white/80 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-slate-800">{value || "-"}</p>
    </div>
  );
}

function ReadonlyInfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-0.5 line-clamp-2 text-sm font-medium text-slate-800">
        {value || "-"}
      </p>
    </div>
  );
}
