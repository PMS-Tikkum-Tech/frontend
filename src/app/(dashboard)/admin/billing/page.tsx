"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
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
  approveAdminManualRentalBooking,
  createAdminPayment,
  deleteAdminPayment,
  getAdminManualRentalBookings,
  getAdminPayments,
  getAdminProperties,
  getAdminPropertyUnits,
  getAdminTenants,
  getApiErrorMessage,
  updateAdminPayment,
  type AdminPayment,
  type AdminPropertyListItem,
  type AdminPropertyUnitRow,
  type AdminUser,
} from "@/lib/dashboard/admin.api";
import { hasFilterOption, uniqueFilterOptions } from "@/lib/filter-options";

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

const isDueDateReached = (value?: string | null) => {
  if (!value) {
    return false;
  }

  const dueDate = new Date(value);
  if (Number.isNaN(dueDate.getTime())) {
    return false;
  }

  const dueDay = new Date(dueDate);
  dueDay.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return dueDay.getTime() <= today.getTime();
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

const resolveAssetUrl = (value?: string | null) => {
  const normalized = value?.trim();
  if (!normalized) {
    return null;
  }

  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
    "http://127.0.0.1:3001";

  return `${baseUrl}${normalized.startsWith("/") ? normalized : `/${normalized}`}`;
};

const paymentStatusLabel: Record<string, string> = {
  waiting: "Menunggu",
  paid: "Lunas",
  overdue: "Dibatalkan",
  cancelled: "Dibatalkan",
};

const paymentStatusStyle: Record<string, string> = {
  waiting: "bg-blue-100 text-blue-700",
  paid: "bg-green-100 text-green-700",
  overdue: "bg-slate-100 text-slate-700",
  cancelled: "bg-slate-100 text-slate-700",
};

const PAGE_SIZE = 10;

type Notice = {
  variant: "success" | "error";
  message: string;
} | null;

type BillingFormMode = "create" | "edit";

type BillingFormState = {
  propertyId: string;
  unitId: string;
  tenantId: string;
  leaseId: string;
  status: "waiting" | "paid" | "overdue" | "cancelled";
  dueDate: string;
  amount: string;
  paidAt: string;
  paymentMethod: string;
  description: string;
};

const getInitialForm = (): BillingFormState => ({
  propertyId: "",
  unitId: "",
  tenantId: "",
  leaseId: "",
  status: "waiting",
  dueDate: new Date().toISOString().slice(0, 10),
  amount: "",
  paidAt: "",
  paymentMethod: "",
  description: "",
});

const isPaymentAutoCancelledByDueDate = (
  payment: Pick<AdminPayment, "status" | "due_date">
) => {
  return (
    payment.status === "overdue" ||
    (payment.status === "waiting" && isDueDateReached(payment.due_date))
  );
};

const getPaymentDisplayStatus = (
  payment: Pick<AdminPayment, "status" | "due_date">
): AdminPayment["status"] => {
  if (isPaymentAutoCancelledByDueDate(payment)) {
    return "cancelled";
  }

  return payment.status;
};

const normalizeOptional = (value: string) => {
  const trimmed = value.trim();
  return trimmed || undefined;
};

const getPaymentRowKey = (payment: AdminPayment) =>
  `${payment.record_type || "payment"}:${payment.id}`;

const isManualBookingRecord = (payment: AdminPayment) =>
  payment.record_type === "manual_booking";

const getProofExtensionFromContentType = (contentType?: string | null) => {
  if (!contentType) {
    return "";
  }

  if (contentType.includes("pdf")) {
    return ".pdf";
  }

  if (contentType.includes("png")) {
    return ".png";
  }

  if (contentType.includes("jpeg") || contentType.includes("jpg")) {
    return ".jpg";
  }

  return "";
};

const getProofExtensionFromUrl = (url?: string | null) => {
  if (!url) {
    return "";
  }

  try {
    const pathname = new URL(url).pathname;
    return pathname.match(/\.(pdf|png|jpe?g)$/i)?.[0] || "";
  } catch {
    return url.match(/\.(pdf|png|jpe?g)$/i)?.[0] || "";
  }
};

const getProofDownloadName = (
  invoiceId: string,
  sourceUrl?: string | null,
  contentType?: string | null
) => {
  const safeInvoiceId = invoiceId.replace(/[^a-z0-9-]/gi, "-").toLowerCase();
  const extension =
    getProofExtensionFromContentType(contentType) ||
    getProofExtensionFromUrl(sourceUrl);

  return `bukti-transfer-${safeInvoiceId}${extension}`;
};

export default function AdminBillingPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [propertyFilter, setPropertyFilter] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "due_date">("newest");
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [properties, setProperties] = useState<AdminPropertyListItem[]>([]);
  const [tenants, setTenants] = useState<AdminUser[]>([]);
  const [unitsByProperty, setUnitsByProperty] = useState<
    Record<number, AdminPropertyUnitRow[]>
  >({});
  const [isLoadingUnitsPropertyId, setIsLoadingUnitsPropertyId] = useState<
    number | null
  >(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [notice, setNotice] = useState<Notice>(null);
  const [viewPayment, setViewPayment] = useState<AdminPayment | null>(null);
  const [approveConfirmationPayment, setApproveConfirmationPayment] =
    useState<AdminPayment | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<BillingFormMode>("create");
  const [editingPaymentId, setEditingPaymentId] = useState<number | null>(null);
  const [form, setForm] = useState<BillingFormState>(getInitialForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<number | null>(null);
  const [isApprovingId, setIsApprovingId] = useState<number | null>(null);
  const [isDownloadingProofKey, setIsDownloadingProofKey] = useState<string | null>(
    null
  );
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    let active = true;

    const loadPayments = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [
          paymentsResponse,
          manualBookingsResponse,
          propertiesResponse,
          tenantsResponse,
        ] =
          await Promise.all([
            getAdminPayments({
              page: 1,
              per_page: 100,
            }),
            getAdminManualRentalBookings({
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

        setPayments([
          ...paymentsResponse.data.map((payment) => ({
            ...payment,
            record_type: "payment" as const,
          })),
          ...manualBookingsResponse.data,
        ]);
        setProperties(propertiesResponse.data);
        setTenants(tenantsResponse.data);
      } catch (loadError) {
        if (!active) {
          return;
        }

        setError(
          getApiErrorMessage(loadError, "Data tagihan gagal dimuat. Coba lagi.")
        );
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadPayments();

    return () => {
      active = false;
    };
  }, [refreshKey]);

  const loadUnitsByProperty = async (propertyId: string) => {
    const parsedPropertyId = Number(propertyId);
    if (!parsedPropertyId || Number.isNaN(parsedPropertyId)) {
      return;
    }

    if (unitsByProperty[parsedPropertyId]) {
      return;
    }

    setIsLoadingUnitsPropertyId(parsedPropertyId);
    try {
      const response = await getAdminPropertyUnits(parsedPropertyId, {
        page: 1,
        per_page: 200,
      });

      setUnitsByProperty((previous) => ({
        ...previous,
        [parsedPropertyId]: response.data,
      }));
    } catch (loadError) {
      setFormError(
        getApiErrorMessage(loadError, "Daftar unit gagal dimuat.")
      );
    } finally {
      setIsLoadingUnitsPropertyId((current) =>
        current === parsedPropertyId ? null : current
      );
    }
  };

  const statusFilterOptions = useMemo(
    () =>
      uniqueFilterOptions(
        payments,
        (payment) => getPaymentDisplayStatus(payment),
        (value) => paymentStatusLabel[value]
      ),
    [payments]
  );

  const propertyFilterOptions = useMemo(
    () =>
      uniqueFilterOptions(
        payments,
        (payment) => payment.property.id || null,
        (value, payment) => payment.property.name || `Properti #${value}`
      ),
    [payments]
  );

  const filtered = useMemo(() => {
    const filteredItems = payments.filter((payment) => {
      const searchable = `${payment.invoice_id} ${payment.property.name || ""} ${
        payment.unit.name || ""
      } ${payment.tenant.full_name || ""} ${payment.booking_status_label || ""} ${
        payment.transfer_sender_name || ""
      } ${payment.transfer_bank_name || ""}`.toLowerCase();
      const displayStatus = getPaymentDisplayStatus(payment);

      return (
        searchable.includes(search.toLowerCase()) &&
        (status ? displayStatus === status : true) &&
        (propertyFilter ? String(payment.property.id || "") === propertyFilter : true)
      );
    });

    return filteredItems.sort((a, b) => {
      if (sortBy === "due_date") {
        const dueA = new Date(a.due_date || 0).getTime();
        const dueB = new Date(b.due_date || 0).getTime();
        return dueA - dueB;
      }

      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      return sortBy === "oldest" ? dateA - dateB : dateB - dateA;
    });
  }, [payments, search, status, propertyFilter, sortBy]);

  const stats = useMemo(() => {
    const waiting = payments.filter(
      (payment) => getPaymentDisplayStatus(payment) === "waiting"
    ).length;
    const paid = payments.filter(
      (payment) => getPaymentDisplayStatus(payment) === "paid"
    ).length;
    const cancelled = payments.filter(
      (payment) => getPaymentDisplayStatus(payment) === "cancelled"
    ).length;
    const totalOutstanding = payments
      .filter((payment) => getPaymentDisplayStatus(payment) === "waiting")
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

    return {
      total: payments.length,
      waiting,
      paid,
      cancelled,
      totalOutstanding,
    };
  }, [payments]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const pagedPayments = filtered.slice(startIndex, startIndex + PAGE_SIZE);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, status, propertyFilter, sortBy]);

  useEffect(() => {
    if (!hasFilterOption(statusFilterOptions, status)) {
      setStatus("");
    }
  }, [status, statusFilterOptions]);

  useEffect(() => {
    if (!hasFilterOption(propertyFilterOptions, propertyFilter)) {
      setPropertyFilter("");
    }
  }, [propertyFilter, propertyFilterOptions]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const availableUnits = useMemo(() => {
    const propertyId = Number(form.propertyId);
    if (!propertyId || Number.isNaN(propertyId)) {
      return [];
    }

    return unitsByProperty[propertyId] || [];
  }, [form.propertyId, unitsByProperty]);

  const openCreateModal = () => {
    setNotice(null);
    setFormMode("create");
    setEditingPaymentId(null);
    setForm(getInitialForm());
    setFormError(null);
    setIsFormOpen(true);
  };

  const openEditModal = (payment: AdminPayment) => {
    setNotice(null);
    setFormMode("edit");
    setEditingPaymentId(payment.id);
    setForm({
      propertyId: String(payment.property.id || ""),
      unitId: String(payment.unit.id || ""),
      tenantId: String(payment.tenant.id || ""),
      leaseId: payment.lease_id ? String(payment.lease_id) : "",
      status: payment.status,
      dueDate: toInputDate(payment.due_date),
      amount: String(payment.amount || ""),
      paidAt: toInputDateTime(payment.paid_at),
      paymentMethod: payment.payment_method || "",
      description: payment.description || "",
    });
    setFormError(null);
    setIsFormOpen(true);
    void loadUnitsByProperty(String(payment.property.id || ""));
  };

  const handleEditPayment = (payment: AdminPayment) => {
    if (isManualBookingRecord(payment)) {
      setNotice({
        variant: "error",
        message:
          "Pemesanan pembayaran penyewa manual belum memiliki layanan ubah dari modul tagihan biasa.",
      });
      return;
    }

    openEditModal(payment);
  };

  const closeFormModal = () => {
    if (isSubmitting) {
      return;
    }

    setIsFormOpen(false);
    setFormError(null);
  };

  const handleSavePayment = async () => {
    const propertyId = Number(form.propertyId);
    const unitId = Number(form.unitId);
    const tenantId = Number(form.tenantId);
    const leaseId = Number(form.leaseId);
    const amount = Number(form.amount);

    if (!propertyId || !unitId || !tenantId) {
      setFormError("Properti, unit, dan penyewa wajib dipilih.");
      return;
    }

    if (!form.dueDate) {
      setFormError("Tanggal jatuh tempo wajib diisi.");
      return;
    }

    if (!amount || Number.isNaN(amount) || amount <= 0) {
      setFormError("Jumlah tagihan harus lebih dari 0.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    setNotice(null);

    try {
      const payload = {
        property_id: propertyId,
        unit_id: unitId,
        tenant_id: tenantId,
        status: form.status,
        amount,
        due_date: form.dueDate,
        ...(leaseId > 0 ? { lease_id: leaseId } : {}),
        ...(toApiDateTime(form.paidAt) ? { paid_at: toApiDateTime(form.paidAt) } : {}),
        ...(normalizeOptional(form.paymentMethod)
          ? { payment_method: normalizeOptional(form.paymentMethod) }
          : {}),
        ...(normalizeOptional(form.description)
          ? { description: normalizeOptional(form.description) }
          : {}),
      };

      if (formMode === "create") {
        await createAdminPayment(payload);
        setNotice({
          variant: "success",
          message: "Tagihan berhasil ditambahkan.",
        });
      } else {
        if (!editingPaymentId) {
          throw new Error("Data tagihan tidak ditemukan.");
        }

        await updateAdminPayment(editingPaymentId, payload);
        setNotice({
          variant: "success",
          message: "Data tagihan berhasil diperbarui.",
        });
      }

      setIsFormOpen(false);
      setRefreshKey((previous) => previous + 1);
    } catch (saveError) {
      setFormError(getApiErrorMessage(saveError, "Gagal menyimpan tagihan."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePayment = async (payment: AdminPayment) => {
    if (isManualBookingRecord(payment)) {
      setNotice({
        variant: "error",
        message:
          "Pemesanan pembayaran penyewa manual tidak bisa dihapus dari tabel tagihan ini.",
      });
      return;
    }

    const agreed = window.confirm(
      `Hapus tagihan #${payment.invoice_id}? Tindakan ini tidak bisa dibatalkan.`
    );

    if (!agreed) {
      return;
    }

    setIsDeletingId(payment.id);
    setNotice(null);

    try {
      await deleteAdminPayment(payment.id);
      setNotice({
        variant: "success",
        message: `Tagihan #${payment.invoice_id} berhasil dihapus.`,
      });
      setRefreshKey((previous) => previous + 1);
    } catch (deleteError) {
      setNotice({
        variant: "error",
        message: getApiErrorMessage(deleteError, "Gagal menghapus tagihan."),
      });
    } finally {
      setIsDeletingId(null);
    }
  };

  const handleDownloadProof = async (payment: AdminPayment) => {
    const proofUrl = resolveAssetUrl(payment.transfer_proof_url);

    if (!proofUrl) {
      setNotice({
        variant: "error",
        message: "Bukti transfer tidak tersedia untuk diunduh.",
      });
      return;
    }

    const downloadKey = getPaymentRowKey(payment);
    setIsDownloadingProofKey(downloadKey);
    setNotice(null);

    try {
      const response = await fetch(proofUrl);
      if (!response.ok) {
        throw new Error("Gagal mengambil file bukti transfer.");
      }

      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = getProofDownloadName(
        payment.invoice_id,
        proofUrl,
        blob.type || response.headers.get("content-type")
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 1000);
    } catch (downloadError) {
      setNotice({
        variant: "error",
        message: getApiErrorMessage(
          downloadError,
          "Gagal mengunduh bukti transfer."
        ),
      });
    } finally {
      setIsDownloadingProofKey(null);
    }
  };

  const openApproveConfirmation = (payment: AdminPayment) => {
    const displayStatus = getPaymentDisplayStatus(payment);

    if (displayStatus === "cancelled") {
      setNotice({
        variant: "error",
        message: "Tagihan sudah dibatalkan otomatis karena jatuh tempo.",
      });
      return;
    }

    if (isManualBookingRecord(payment)) {
      if (payment.booking_status !== "pending_review") {
        setNotice({
          variant: "error",
          message:
            payment.booking_status === "awaiting_payment"
              ? "Pemesanan ini belum mengirim bukti transfer, jadi belum bisa di-ACC."
              : "Pemesanan penyewa ini belum berada pada status peninjauan administrator.",
        });
        return;
      }

      setApproveConfirmationPayment(payment);
      return;
    }

    if (displayStatus === "paid") {
      return;
    }

    setApproveConfirmationPayment(payment);
  };

  const handleApprovePayment = async (payment: AdminPayment) => {
    const displayStatus = getPaymentDisplayStatus(payment);

    if (displayStatus === "cancelled") {
      setNotice({
        variant: "error",
        message: "Tagihan sudah dibatalkan otomatis karena jatuh tempo.",
      });
      setApproveConfirmationPayment(null);
      return;
    }

    if (isManualBookingRecord(payment)) {
      if (payment.booking_status !== "pending_review") {
        setNotice({
          variant: "error",
          message:
            payment.booking_status === "awaiting_payment"
              ? "Pemesanan ini belum mengirim bukti transfer, jadi belum bisa di-ACC."
              : "Pemesanan penyewa ini belum berada pada status peninjauan administrator.",
        });
        return;
      }

      setIsApprovingId(payment.id);
      setNotice(null);

      try {
        await approveAdminManualRentalBooking(payment.id, {
          commission_type: "percentage",
          commission_percentage: 0,
          notes: "Disetujui dari tagihan administrator",
        });

        setNotice({
          variant: "success",
          message: `Pembayaran pemesanan #${payment.invoice_id} berhasil di-ACC.`,
        });
        setApproveConfirmationPayment(null);
        setRefreshKey((previous) => previous + 1);
      } catch (approveError) {
        setNotice({
          variant: "error",
          message: getApiErrorMessage(
            approveError,
            "Gagal melakukan ACC pembayaran pemesanan."
          ),
        });
      } finally {
        setIsApprovingId(null);
      }

      return;
    }

    if (payment.status === "paid") {
      return;
    }

    setIsApprovingId(payment.id);
    setNotice(null);

    try {
      await updateAdminPayment(payment.id, {
        status: "paid",
        paid_at: new Date().toISOString(),
      });

      setNotice({
        variant: "success",
        message: `Pembayaran #${payment.invoice_id} berhasil di-ACC.`,
      });
      setApproveConfirmationPayment(null);
      setRefreshKey((previous) => previous + 1);
    } catch (approveError) {
      setNotice({
        variant: "error",
        message:
          getApiErrorMessage(approveError, "Gagal melakukan ACC pembayaran."),
      });
    } finally {
      setIsApprovingId(null);
    }
  };

  const approveConfirmationIsManual = approveConfirmationPayment
    ? isManualBookingRecord(approveConfirmationPayment)
    : false;
  const isApproveConfirmationBusy = approveConfirmationPayment
    ? isApprovingId === approveConfirmationPayment.id
    : false;

  return (
    <div className="space-y-7">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-[#1E2746] via-[#273965] to-[#2C62A5] p-6 text-white shadow-sm">
        <div className="pointer-events-none absolute -left-12 top-0 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -right-12 bottom-0 h-44 w-44 rounded-full bg-white/10 blur-3xl" />

        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="inline-flex rounded-full border border-white/35 bg-white/10 px-3 py-1 text-xs font-medium">
              Modul Tagihan
            </p>
            <h1 className="mt-3 text-2xl font-semibold md:text-3xl">
              Kelola Tagihan & Pembayaran
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-white/85">
              Pantau status pembayaran, atur tagihan, dan tinjau bukti pembayaran.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-[#1E2746] hover:bg-slate-100"
          >
            <Plus size={16} />
            Tambah Tagihan
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard label="Total Tagihan" value={String(stats.total)} />
        <SummaryCard label="Menunggu" value={String(stats.waiting)} tone="default" />
        <SummaryCard label="Lunas" value={String(stats.paid)} tone="success" />
        <SummaryCard label="Dibatalkan" value={String(stats.cancelled)} tone="danger" />
        <SummaryCard
          label="Nominal Menunggu"
          value={`Rp ${stats.totalOutstanding.toLocaleString("id-ID")}`}
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
              placeholder="Cari faktur, properti, unit, atau penyewa..."
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
              {statusFilterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <select
            value={propertyFilter}
            onChange={(event) => setPropertyFilter(event.target.value)}
            className="h-11 min-w-[220px] rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm focus:border-blue-400 focus:bg-white focus:outline-none"
          >
            <option value="">Semua Properti</option>
            {propertyFilterOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(event) =>
              setSortBy(event.target.value as "newest" | "oldest" | "due_date")
            }
            className="h-11 min-w-[170px] rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm focus:border-blue-400 focus:bg-white focus:outline-none"
          >
            <option value="newest">Terbaru</option>
            <option value="oldest">Terlama</option>
            <option value="due_date">Jatuh Tempo</option>
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
            Atur Ulang
          </button>

        </div>

        <p className="mt-3 text-xs text-slate-500">
          Menampilkan <span className="font-semibold">{filtered.length}</span> dari{" "}
          <span className="font-semibold">{payments.length}</span> tagihan.
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
          <table className="w-full min-w-[1160px] table-fixed text-sm leading-5">
            <colgroup>
              <col className="w-[220px]" />
              <col className="w-[210px]" />
              <col className="w-[160px]" />
              <col className="w-[150px]" />
              <col className="w-[140px]" />
              <col className="w-[110px]" />
              <col className="w-[170px]" />
            </colgroup>
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500">
              <tr>
                <th className="px-3 py-3 text-left">Faktur</th>
                <th className="px-3 py-3 text-left">Properti</th>
                <th className="px-3 py-3 text-left">Penyewa</th>
                <th className="px-3 py-3 text-left">Jatuh Tempo</th>
                <th className="px-3 py-3 text-left">Jumlah</th>
                <th className="px-3 py-3 text-left">Status</th>
                <th className="px-3 py-3 text-left">Aksi</th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-500">
                    Memuat data tagihan...
                  </td>
                </tr>
              ) : pagedPayments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-500">
                    Tidak ada data tagihan.
                  </td>
                </tr>
              ) : (
                pagedPayments.map((payment) => (
                  <tr
                    key={getPaymentRowKey(payment)}
                    className="border-t border-slate-100 align-top hover:bg-slate-50"
                  >
                    <td className="px-3 py-3">
                      <p
                        className="break-all font-semibold text-slate-800"
                        title={`#${payment.invoice_id}`}
                      >
                        #{payment.invoice_id}
                      </p>
                      <p className="whitespace-nowrap text-xs text-slate-500">
                        Dibuat: {formatDate(payment.created_at)}
                      </p>
                      {payment.transfer_proof_url ? (
                        <div className="mt-2 flex items-center gap-1.5 whitespace-nowrap">
                          <a
                            href={resolveAssetUrl(payment.transfer_proof_url) || "#"}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex h-7 items-center rounded-lg border border-emerald-200 bg-emerald-50 px-2 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100"
                            title="Lihat bukti transfer"
                          >
                            Lihat
                          </a>
                          <button
                            type="button"
                            onClick={() => {
                              void handleDownloadProof(payment);
                            }}
                            disabled={
                              isDownloadingProofKey === getPaymentRowKey(payment)
                            }
                            className="inline-flex h-7 items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2 text-xs font-medium text-blue-700 transition hover:bg-blue-100 disabled:cursor-wait disabled:opacity-60"
                          >
                            <Download size={12} />
                            {isDownloadingProofKey === getPaymentRowKey(payment)
                              ? "Unduh..."
                              : "Unduh"}
                          </button>
                        </div>
                      ) : (
                        <p className="mt-1 text-xs text-slate-500">
                          Belum ada bukti
                        </p>
                      )}
                    </td>

                    <td className="px-3 py-3">
                      <p
                        className="break-words text-slate-700"
                        title={payment.property.name || "-"}
                      >
                        {payment.property.name || "-"}
                      </p>
                      <p
                        className="break-words text-xs text-slate-500"
                        title={payment.unit.name || "-"}
                      >
                        Unit: {payment.unit.name || "-"}
                      </p>
                    </td>

                    <td className="px-3 py-3 text-slate-700">
                      <p
                        className="break-words"
                        title={payment.tenant.full_name || "-"}
                      >
                        {payment.tenant.full_name || "-"}
                      </p>
                    </td>

                    <td className="px-3 py-3">
                      <p className="whitespace-nowrap text-slate-700">
                        {formatDate(payment.due_date)}
                      </p>
                      <p className="whitespace-nowrap text-xs text-slate-500">
                        Bayar: {formatDateTime(payment.paid_at)}
                      </p>
                    </td>

                    <td className="whitespace-nowrap px-3 py-3 font-semibold text-slate-800">
                      Rp {Number(payment.amount || 0).toLocaleString("id-ID")}
                    </td>

                    <td className="px-3 py-3">
                      <StatusBadge status={getPaymentDisplayStatus(payment)} />
                      {isPaymentAutoCancelledByDueDate(payment) ? (
                        <p className="mt-1 break-words text-xs font-medium text-red-600">
                          Dibatalkan otomatis karena sudah melewati jatuh tempo.
                        </p>
                      ) : null}
                      {payment.booking_status_label ? (
                        <p
                          className="mt-1 break-words text-xs text-slate-500"
                          title={payment.booking_status_label}
                        >
                          Pemesanan: {payment.booking_status_label}
                        </p>
                      ) : null}
                    </td>

                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setViewPayment(payment)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:border-green-200 hover:bg-green-50 hover:text-green-700"
                          title="Lihat detail"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEditPayment(payment)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                          title="Ubah tagihan"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            void handleDeletePayment(payment);
                          }}
                          disabled={isDeletingId === payment.id}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                          title="Hapus tagihan"
                        >
                          <Trash2 size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            openApproveConfirmation(payment);
                          }}
                          disabled={
                            getPaymentDisplayStatus(payment) === "paid" ||
                            getPaymentDisplayStatus(payment) === "cancelled" ||
                            isApprovingId === payment.id
                          }
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                          title={
                            getPaymentDisplayStatus(payment) === "paid"
                              ? "Pembayaran sudah lunas"
                              : getPaymentDisplayStatus(payment) === "cancelled"
                                ? "Tagihan sudah dibatalkan"
                              : "ACC pembayaran"
                          }
                        >
                          <CheckCircle2 size={16} />
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
            tagihan
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

      {approveConfirmationPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="px-6 pb-5 pt-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                  <CheckCircle2 size={24} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                    Konfirmasi ACC
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-900">
                    Setujui pembayaran ini?
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Pastikan bukti transfer dan nominal sudah sesuai sebelum
                    pembayaran disetujui.
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
                <div className="flex items-start justify-between gap-4">
                  <span className="text-slate-500">Faktur</span>
                  <span className="text-right font-semibold text-slate-900">
                    #{approveConfirmationPayment.invoice_id}
                  </span>
                </div>
                <div className="mt-3 flex items-start justify-between gap-4">
                  <span className="text-slate-500">Penyewa</span>
                  <span className="text-right font-medium text-slate-800">
                    {approveConfirmationPayment.tenant.full_name || "-"}
                  </span>
                </div>
                <div className="mt-3 flex items-start justify-between gap-4">
                  <span className="text-slate-500">Properti</span>
                  <span className="text-right font-medium text-slate-800">
                    {approveConfirmationPayment.property.name || "-"}
                  </span>
                </div>
                <div className="mt-3 flex items-start justify-between gap-4">
                  <span className="text-slate-500">Unit</span>
                  <span className="text-right font-medium text-slate-800">
                    {approveConfirmationPayment.unit.name || "-"}
                  </span>
                </div>
                <div className="mt-3 flex items-start justify-between gap-4">
                  <span className="text-slate-500">Jumlah</span>
                  <span className="whitespace-nowrap text-right font-semibold text-slate-900">
                    Rp{" "}
                    {Number(approveConfirmationPayment.amount || 0).toLocaleString(
                      "id-ID"
                    )}
                  </span>
                </div>
              </div>

              <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                {approveConfirmationIsManual
                  ? "Setelah di-ACC, pembayaran menjadi lunas dan unit akan diproses sebagai terisi."
                  : "Setelah di-ACC, status tagihan akan berubah menjadi lunas."}
              </p>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setApproveConfirmationPayment(null)}
                disabled={isApproveConfirmationBusy}
                className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-medium text-slate-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleApprovePayment(approveConfirmationPayment);
                }}
                disabled={isApproveConfirmationBusy}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-70"
              >
                <CheckCircle2 size={16} />
                {isApproveConfirmationBusy ? "Memproses..." : "Ya, ACC Pembayaran"}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-800">Detail Tagihan</h2>
              <button
                type="button"
                onClick={() => setViewPayment(null)}
                className="rounded-lg p-2 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 px-6 py-5 text-sm">
              <div className="mb-1 rounded-xl border border-slate-100 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Faktur #{viewPayment.invoice_id}
                </p>
                <p className="mt-1 font-semibold text-slate-800">
                  {viewPayment.property.name || "-"} • {viewPayment.unit.name || "-"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Penyewa: {viewPayment.tenant.full_name || "-"}
                </p>
              </div>
              <DetailRow label="Faktur" value={`#${viewPayment.invoice_id}`} />
              <DetailRow label="Properti" value={viewPayment.property.name || "-"} />
              <DetailRow label="Unit" value={viewPayment.unit.name || "-"} />
              <DetailRow
                label="Penyewa"
                value={viewPayment.tenant.full_name || "-"}
              />
              <DetailRow
                label="Status"
                value={
                  paymentStatusLabel[getPaymentDisplayStatus(viewPayment)] ||
                  getPaymentDisplayStatus(viewPayment)
                }
              />
              {isPaymentAutoCancelledByDueDate(viewPayment) ? (
                <DetailRow
                  label="Catatan Pembatalan"
                  value="Dibatalkan otomatis karena pembayaran sudah melewati tanggal jatuh tempo."
                />
              ) : null}
              <DetailRow
                label="Status Pemesanan Penyewa"
                value={viewPayment.booking_status_label || "-"}
              />
              <DetailRow
                label="Jumlah"
                value={`Rp ${viewPayment.amount.toLocaleString("id-ID")}`}
              />
              <DetailRow label="Jatuh Tempo" value={formatDate(viewPayment.due_date)} />
              <DetailRow
                label="Tanggal Bayar"
                value={formatDateTime(viewPayment.paid_at)}
              />
              <DetailRow
                label="Metode Pembayaran"
                value={viewPayment.payment_method || "-"}
              />
              <DetailRow
                label="Nama Pengirim Transfer"
                value={viewPayment.transfer_sender_name || "-"}
              />
              <DetailRow
                label="Bank/Channel Pengirim"
                value={viewPayment.transfer_bank_name || "-"}
              />
              <DetailRow
                label="Waktu Pengiriman Bukti"
                value={formatDateTime(viewPayment.payment_submitted_at)}
              />
              <DetailRow
                label="Waktu Peninjauan Administrator"
                value={formatDateTime(viewPayment.reviewed_at)}
              />
              <DetailRow
                label="Bukti Transfer"
                value={
                  viewPayment.transfer_proof_url ? (
                    <span className="inline-flex flex-wrap items-center gap-3">
                      <a
                        href={resolveAssetUrl(viewPayment.transfer_proof_url) || "#"}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-blue-600 underline-offset-2 hover:underline"
                      >
                        Lihat bukti transfer
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          void handleDownloadProof(viewPayment);
                        }}
                        disabled={
                          isDownloadingProofKey === getPaymentRowKey(viewPayment)
                        }
                        className="inline-flex items-center gap-1 font-medium text-emerald-700 underline-offset-2 hover:underline disabled:cursor-wait disabled:opacity-60"
                      >
                        <Download size={13} />
                        {isDownloadingProofKey === getPaymentRowKey(viewPayment)
                          ? "Mengunduh..."
                          : "Unduh"}
                      </button>
                    </span>
                  ) : (
                    "-"
                  )
                }
              />
              <DetailRow label="Deskripsi" value={viewPayment.description || "-"} />
            </div>

            <div className="flex justify-end border-t bg-slate-50 px-6 py-4">
              <button
                type="button"
                onClick={() => setViewPayment(null)}
                className="h-11 rounded-xl bg-[#1E2746] px-6 font-medium text-white hover:bg-[#141B35]"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-800">
                {formMode === "create" ? "Tambah Tagihan" : "Ubah Tagihan"}
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

            <div className="space-y-4 px-6 py-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Properti
                  </label>
                  <select
                    value={form.propertyId}
                    onChange={(event) => {
                      const nextPropertyId = event.target.value;
                      setForm((previous) => ({
                        ...previous,
                        propertyId: nextPropertyId,
                        unitId: "",
                        leaseId: "",
                      }));
                      setFormError(null);
                      void loadUnitsByProperty(nextPropertyId);
                    }}
                    className="h-11 w-full rounded-xl border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E2746]"
                  >
                    <option value="">Pilih properti</option>
                    {properties.map((property) => (
                      <option key={property.id} value={property.id}>
                        {property.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Unit
                  </label>
                  <select
                    value={form.unitId}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        unitId: event.target.value,
                      }))
                    }
                    disabled={!form.propertyId}
                    className="h-11 w-full rounded-xl border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E2746] disabled:cursor-not-allowed disabled:bg-slate-100"
                  >
                    <option value="">
                      {form.propertyId
                        ? isLoadingUnitsPropertyId === Number(form.propertyId)
                          ? "Memuat unit..."
                          : "Pilih unit"
                        : "Pilih properti dulu"}
                    </option>
                    {availableUnits.map((unit) => (
                      <option key={unit.unit_id} value={unit.unit_id}>
                        {unit.unit_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Penyewa
                  </label>
                  <select
                    value={form.tenantId}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        tenantId: event.target.value,
                      }))
                    }
                    className="h-11 w-full rounded-xl border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E2746]"
                  >
                    <option value="">Pilih penyewa</option>
                    {tenants.map((tenant) => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.full_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Status
                  </label>
                  <select
                    value={form.status}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        status: event.target.value as BillingFormState["status"],
                      }))
                    }
                    className="h-11 w-full rounded-xl border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E2746]"
                  >
                    <option value="waiting">Menunggu</option>
                    <option value="paid">Lunas</option>
                    <option value="overdue">Dibatalkan Otomatis</option>
                    <option value="cancelled">Dibatalkan</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Jatuh Tempo
                  </label>
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        dueDate: event.target.value,
                      }))
                    }
                    className="h-11 w-full rounded-xl border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E2746]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Jumlah
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="1000"
                    value={form.amount}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        amount: event.target.value,
                      }))
                    }
                    className="h-11 w-full rounded-xl border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E2746]"
                    placeholder="3500000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Tanggal Bayar (Opsional)
                  </label>
                  <input
                    type="datetime-local"
                    value={form.paidAt}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        paidAt: event.target.value,
                      }))
                    }
                    className="h-11 w-full rounded-xl border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E2746]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Metode Pembayaran (Opsional)
                  </label>
                  <input
                    value={form.paymentMethod}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        paymentMethod: event.target.value,
                      }))
                    }
                    className="h-11 w-full rounded-xl border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E2746]"
                    placeholder="Transfer Bank / Tunai / E-Wallet"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Deskripsi (Opsional)
                </label>
                <textarea
                  value={form.description}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      description: event.target.value,
                    }))
                  }
                  rows={3}
                  className="w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E2746]"
                  placeholder="Contoh: Tagihan sewa bulanan Maret 2026"
                />
              </div>

              {formError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {formError}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t bg-slate-50 px-6 py-4">
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
                  void handleSavePayment();
                }}
                disabled={isSubmitting}
                className="h-11 rounded-xl bg-[#1E2746] px-5 text-sm font-medium text-white hover:bg-[#141B35] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting
                  ? "Menyimpan..."
                  : formMode === "create"
                    ? "Simpan Tagihan"
                    : "Simpan Perubahan"}
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
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "success" | "danger";
}) {
  const valueStyle =
    tone === "success"
      ? "text-emerald-700"
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

function StatusBadge({
  status,
}: {
  status: "waiting" | "paid" | "overdue" | "cancelled";
}) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${
        paymentStatusStyle[status] || "bg-slate-100 text-slate-700"
      }`}
    >
      {paymentStatusLabel[status] || status}
    </span>
  );
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-2">
      <span className="font-medium text-slate-600">{label}</span>
      <span className="max-w-[62%] break-words text-right text-slate-800">{value}</span>
    </div>
  );
}
