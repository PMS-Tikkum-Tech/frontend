"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Bell,
  CheckCircle2,
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
  createAdminPayment,
  deleteAdminPayment,
  getAdminManualRentalBookings,
  getAdminPayments,
  getAdminProperties,
  getAdminPropertyUnits,
  getAdminTenants,
  getApiErrorMessage,
  pushAdminPaymentInvoice,
  updateAdminPayment,
  type AdminPayment,
  type AdminPropertyListItem,
  type AdminPropertyUnitRow,
  type AdminUser,
} from "@/lib/dashboard/admin.api";

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
  overdue: "Terlambat",
  cancelled: "Dibatalkan",
};

const paymentStatusStyle: Record<string, string> = {
  waiting: "bg-blue-100 text-blue-700",
  paid: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-700",
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

const normalizeOptional = (value: string) => {
  const trimmed = value.trim();
  return trimmed || undefined;
};

const getPaymentRowKey = (payment: AdminPayment) =>
  `${payment.record_type || "payment"}:${payment.id}`;

const isManualBookingRecord = (payment: AdminPayment) =>
  payment.record_type === "manual_booking";

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
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<BillingFormMode>("create");
  const [editingPaymentId, setEditingPaymentId] = useState<number | null>(null);
  const [form, setForm] = useState<BillingFormState>(getInitialForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<number | null>(null);
  const [isPushingId, setIsPushingId] = useState<number | null>(null);
  const [isApprovingId, setIsApprovingId] = useState<number | null>(null);
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

  const filtered = useMemo(() => {
    const filteredItems = payments.filter((payment) => {
      const searchable = `${payment.invoice_id} ${payment.property.name || ""} ${
        payment.unit.name || ""
      } ${payment.tenant.full_name || ""} ${payment.booking_status_label || ""} ${
        payment.transfer_sender_name || ""
      } ${payment.transfer_bank_name || ""}`.toLowerCase();

      return (
        searchable.includes(search.toLowerCase()) &&
        (status ? payment.status === status : true) &&
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
    const waiting = payments.filter((payment) => payment.status === "waiting").length;
    const paid = payments.filter((payment) => payment.status === "paid").length;
    const overdue = payments.filter((payment) => payment.status === "overdue").length;
    const totalOutstanding = payments
      .filter((payment) => payment.status === "waiting" || payment.status === "overdue")
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

    return {
      total: payments.length,
      waiting,
      paid,
      overdue,
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
          "Booking pembayaran tenant manual tidak bisa dihapus dari tabel tagihan ini.",
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

  const handlePushInvoice = async (payment: AdminPayment) => {
    if (isManualBookingRecord(payment)) {
      setNotice({
        variant: "error",
        message:
          "Booking pembayaran tenant manual tidak dikirim ke Xendit dari tabel ini.",
      });
      return;
    }

    setIsPushingId(payment.id);
    setNotice(null);

    try {
      await pushAdminPaymentInvoice(payment.id);
      setNotice({
        variant: "success",
        message: `Invoice #${payment.invoice_id} berhasil dikirim ke Xendit.`,
      });
      setRefreshKey((previous) => previous + 1);
    } catch (pushError) {
      setNotice({
        variant: "error",
        message: getApiErrorMessage(pushError, "Gagal mengirim invoice."),
      });
    } finally {
      setIsPushingId(null);
    }
  };

  const handleApprovePayment = async (payment: AdminPayment) => {
    if (isManualBookingRecord(payment)) {
      setNotice({
        variant: "error",
        message:
          "Booking manual tenant perlu direview melalui alur persetujuan booking, bukan ACC tagihan biasa.",
      });
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
      setRefreshKey((previous) => previous + 1);
    } catch (approveError) {
      setNotice({
        variant: "error",
        message: getApiErrorMessage(approveError, "Gagal melakukan ACC pembayaran."),
      });
    } finally {
      setIsApprovingId(null);
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
              Modul Tagihan
            </p>
            <h1 className="mt-3 text-2xl font-semibold md:text-3xl">
              Kelola Tagihan & Pembayaran
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-white/85">
              Pantau status pembayaran, atur tagihan, dan kirim invoice ke Xendit.
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
        <SummaryCard label="Terlambat" value={String(stats.overdue)} tone="danger" />
        <SummaryCard
          label="Outstanding"
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
              placeholder="Cari invoice, properti, unit, atau penyewa..."
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
              <option value="waiting">Menunggu</option>
              <option value="paid">Lunas</option>
              <option value="overdue">Terlambat</option>
              <option value="cancelled">Dibatalkan</option>
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
          <table className="min-w-[1120px] w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="p-4 text-left">Invoice</th>
                <th className="p-4 text-left">Properti</th>
                <th className="p-4 text-left">Penyewa</th>
                <th className="p-4 text-left">Jatuh Tempo</th>
                <th className="p-4 text-left">Jumlah</th>
                <th className="p-4 text-left">Status</th>
                <th className="p-4 text-left">Xendit</th>
                <th className="p-4 text-left">Aksi</th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-slate-500">
                    Memuat data tagihan...
                  </td>
                </tr>
              ) : pagedPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-slate-500">
                    Tidak ada data tagihan.
                  </td>
                </tr>
              ) : (
                pagedPayments.map((payment) => (
                  <tr
                    key={getPaymentRowKey(payment)}
                    className="border-t border-slate-100 hover:bg-slate-50"
                  >
                    <td className="p-4">
                      <p className="font-semibold text-slate-800">#{payment.invoice_id}</p>
                      <p className="text-xs text-slate-500">
                        Dibuat: {formatDate(payment.created_at)}
                      </p>
                      {payment.transfer_proof_url ? (
                        <a
                          href={resolveAssetUrl(payment.transfer_proof_url) || "#"}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 inline-flex text-xs font-medium text-emerald-600 underline-offset-2 hover:underline"
                        >
                          Lihat bukti transfer
                        </a>
                      ) : (
                        <p className="mt-1 text-xs text-slate-500">
                          Bukti transfer belum ada
                        </p>
                      )}
                    </td>

                    <td className="p-4">
                      <p className="text-slate-700">{payment.property.name || "-"}</p>
                      <p className="text-xs text-slate-500">
                        Unit: {payment.unit.name || "-"}
                      </p>
                    </td>

                    <td className="p-4 text-slate-700">
                      {payment.tenant.full_name || "-"}
                    </td>

                    <td className="p-4">
                      <p className="text-slate-700">{formatDate(payment.due_date)}</p>
                      <p className="text-xs text-slate-500">
                        Bayar: {formatDateTime(payment.paid_at)}
                      </p>
                    </td>

                    <td className="p-4 font-semibold text-slate-800">
                      Rp {Number(payment.amount || 0).toLocaleString("id-ID")}
                    </td>

                    <td className="p-4">
                      <StatusBadge status={payment.status} />
                      {payment.booking_status_label ? (
                        <p className="mt-1 text-xs text-slate-500">
                          Booking: {payment.booking_status_label}
                        </p>
                      ) : null}
                    </td>

                    <td className="p-4">
                      {isManualBookingRecord(payment) ? (
                        <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                          Manual
                        </span>
                      ) : payment.xendit_invoice_id ? (
                        <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                          Terkirim
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                          Belum
                        </span>
                      )}
                    </td>

                    <td className="p-4">
                      <div className="flex items-center gap-2">
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
                          onClick={() => openEditModal(payment)}
                          disabled={isManualBookingRecord(payment)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                          title={
                            isManualBookingRecord(payment)
                              ? "Booking manual tenant tidak diedit dari tabel ini"
                              : "Edit tagihan"
                          }
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            void handleDeletePayment(payment);
                          }}
                          disabled={isManualBookingRecord(payment) || isDeletingId === payment.id}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                          title={
                            isManualBookingRecord(payment)
                              ? "Booking manual tenant tidak dihapus dari tabel ini"
                              : "Hapus tagihan"
                          }
                        >
                          <Trash2 size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            void handleApprovePayment(payment);
                          }}
                          disabled={
                            isManualBookingRecord(payment) ||
                            payment.status === "paid" ||
                            isApprovingId === payment.id
                          }
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                          title={
                            isManualBookingRecord(payment)
                              ? "Booking manual tenant memakai alur review terpisah"
                              : payment.status === "paid"
                              ? "Pembayaran sudah lunas"
                              : "ACC pembayaran"
                          }
                        >
                          <CheckCircle2 size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            void handlePushInvoice(payment);
                          }}
                          disabled={
                            isManualBookingRecord(payment) ||
                            isPushingId === payment.id ||
                            Boolean(payment.xendit_invoice_id)
                          }
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                          title={
                            isManualBookingRecord(payment)
                              ? "Booking manual tenant tidak dikirim ke Xendit"
                              : payment.xendit_invoice_id
                              ? "Invoice sudah dikirim ke Xendit"
                              : "Kirim invoice ke Xendit"
                          }
                        >
                          <Bell size={16} />
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
                  Invoice #{viewPayment.invoice_id}
                </p>
                <p className="mt-1 font-semibold text-slate-800">
                  {viewPayment.property.name || "-"} • {viewPayment.unit.name || "-"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Penyewa: {viewPayment.tenant.full_name || "-"}
                </p>
              </div>
              <DetailRow label="Invoice" value={`#${viewPayment.invoice_id}`} />
              <DetailRow
                label="Xendit Invoice ID"
                value={viewPayment.xendit_invoice_id || "-"}
              />
              <DetailRow label="Properti" value={viewPayment.property.name || "-"} />
              <DetailRow label="Unit" value={viewPayment.unit.name || "-"} />
              <DetailRow
                label="Penyewa"
                value={viewPayment.tenant.full_name || "-"}
              />
              <DetailRow
                label="Status"
                value={paymentStatusLabel[viewPayment.status] || viewPayment.status}
              />
              <DetailRow
                label="Status Booking Tenant"
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
                label="Waktu Submit Bukti"
                value={formatDateTime(viewPayment.payment_submitted_at)}
              />
              <DetailRow
                label="Waktu Review Admin"
                value={formatDateTime(viewPayment.reviewed_at)}
              />
              <DetailRow
                label="Bukti Transfer"
                value={
                  viewPayment.transfer_proof_url ? (
                    <a
                      href={resolveAssetUrl(viewPayment.transfer_proof_url) || "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-blue-600 underline-offset-2 hover:underline"
                    >
                      Lihat bukti transfer
                    </a>
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
                {formMode === "create" ? "Tambah Tagihan" : "Edit Tagihan"}
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
                    <option value="overdue">Terlambat</option>
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
      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
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
