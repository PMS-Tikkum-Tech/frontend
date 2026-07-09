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
  X,
} from "lucide-react";
import {
  approveAdminManualRentalBooking,
  createAdminFinancialTransaction,
  createAdminPayment,
  getAdminManualRentalBookings,
  getAdminPayments,
  getAdminProperties,
  getAdminPropertyUnits,
  getAdminTenants,
  getAdminUsers,
  getApiErrorMessage,
  updateAdminPayment,
  type AdminPayment,
  type AdminPropertyListItem,
  type AdminPropertyUnitRow,
  type AdminUser,
} from "@/lib/dashboard/admin.api";
import DeadlineCountdown from "@/components/ui/DeadlineCountdown";
import { resolveApiBaseUrl } from "@/lib/api-base-url";
import { formatDueDate, isDueDateReached } from "@/lib/due-date";
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

const formatRupiahInputValue = (value: number | string) => {
  const numericValue = String(value ?? "").replace(/\D/g, "");
  if (!numericValue) {
    return "";
  }

  return Number(numericValue).toLocaleString("id-ID");
};

const parseRupiahInputValue = (value: string) => {
  const numericValue = value.replace(/\D/g, "");
  return numericValue ? Number(numericValue) : 0;
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

const parseDateInput = (value: string) => {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getWholeMonthDifference = (startDate: Date, endDate: Date) => {
  let months =
    (endDate.getFullYear() - startDate.getFullYear()) * 12 +
    endDate.getMonth() -
    startDate.getMonth();

  if (endDate.getDate() < startDate.getDate()) {
    months -= 1;
  }

  return Math.max(0, months);
};

const formatRentalDuration = (checkInDate: string, checkOutDate: string) => {
  const startDate = parseDateInput(checkInDate);
  const endDate = parseDateInput(checkOutDate);

  if (!startDate || !endDate) {
    return "";
  }

  const dayCount = Math.round(
    (endDate.getTime() - startDate.getTime()) / 86_400_000,
  );

  if (dayCount < 0) {
    return "";
  }

  if (dayCount === 0) {
    return "1 hari";
  }

  const wholeMonths = getWholeMonthDifference(startDate, endDate);
  if (wholeMonths >= 12 && wholeMonths % 12 === 0) {
    const years = wholeMonths / 12;
    return `${years} tahun`;
  }

  if (wholeMonths > 0 && dayCount >= 28) {
    return `${wholeMonths} bulan`;
  }

  return `${dayCount} hari`;
};

const resolveAssetUrl = (value?: string | null) => {
  const normalized = value?.trim();
  if (!normalized) {
    return null;
  }

  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }

  const baseUrl = resolveApiBaseUrl();

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
  paymentMethod: string;
  checkInDate: string;
  checkOutDate: string;
  rentalDuration: string;
  customerService: string;
  remarks: string;
};

const getInitialForm = (): BillingFormState => ({
  propertyId: "",
  unitId: "",
  tenantId: "",
  leaseId: "",
  status: "waiting",
  dueDate: new Date().toISOString().slice(0, 10),
  amount: "",
  paymentMethod: "",
  checkInDate: "",
  checkOutDate: "",
  rentalDuration: "",
  customerService: "",
  remarks: "",
});

type BillingDescriptionFields = Pick<
  BillingFormState,
  | "checkInDate"
  | "checkOutDate"
  | "rentalDuration"
  | "customerService"
  | "remarks"
>;

const getEmptyBillingDescriptionFields = (): BillingDescriptionFields => ({
  checkInDate: "",
  checkOutDate: "",
  rentalDuration: "",
  customerService: "",
  remarks: "",
});

const normalizeBillingDescriptionLabel = (value: string) =>
  value
    .toLowerCase()
    .replace(/[\s_-]+/g, " ")
    .trim();

const parseBillingDescription = (
  description?: string | null,
): BillingDescriptionFields => {
  const parsed = getEmptyBillingDescriptionFields();
  const value = description?.trim();

  if (!value) {
    return parsed;
  }

  const unmatchedLines: string[] = [];
  const labelToField: Record<string, keyof BillingDescriptionFields> = {
    "check in": "checkInDate",
    "check out": "checkOutDate",
    "lama sewa": "rentalDuration",
    "durasi sewa": "rentalDuration",
    cs: "customerService",
    "customer service": "customerService",
    keterangan: "remarks",
    catatan: "remarks",
  };

  value.split(/\r?\n/).forEach((line) => {
    const trimmedLine = line.trim();
    const match = /^([^:]+):\s*(.*)$/.exec(trimmedLine);

    if (!trimmedLine) {
      return;
    }

    if (!match) {
      unmatchedLines.push(trimmedLine);
      return;
    }

    const field = labelToField[normalizeBillingDescriptionLabel(match[1])];
    if (!field) {
      unmatchedLines.push(trimmedLine);
      return;
    }

    parsed[field] = match[2].trim();
  });

  if (unmatchedLines.length > 0 && !parsed.remarks) {
    parsed.remarks = unmatchedLines.join("\n");
  }

  return parsed;
};

const buildBillingDescription = (form: BillingFormState) =>
  [
    ["Check In", form.checkInDate],
    ["Check Out", form.checkOutDate],
    [
      "Lama Sewa",
      formatRentalDuration(form.checkInDate, form.checkOutDate) ||
        form.rentalDuration,
    ],
    ["CS", form.customerService],
    ["Keterangan", form.remarks],
  ]
    .filter(([, value]) => value.trim())
    .map(([label, value]) => `${label}: ${value.trim()}`)
    .join("\n");

const getBillingDescriptionRows = (description?: string | null) => {
  const details = parseBillingDescription(description);

  return [
    details.checkInDate
      ? { label: "Check In", value: formatDate(details.checkInDate) }
      : null,
    details.checkOutDate
      ? { label: "Check Out", value: formatDate(details.checkOutDate) }
      : null,
    details.rentalDuration
      ? { label: "Lama Sewa", value: details.rentalDuration }
      : null,
    details.customerService
      ? { label: "CS", value: details.customerService }
      : null,
  ].filter((row): row is { label: string; value: string } => Boolean(row));
};

const getBillingRemarks = (description?: string | null) => {
  const details = parseBillingDescription(description);

  return details.remarks || description?.trim() || "-";
};

const isPaymentAutoCancelledByDueDate = (
  payment: Pick<AdminPayment, "status" | "due_date" | "booking_status">,
) => {
  const canAutoCancelByDueDate =
    !payment.booking_status || payment.booking_status === "awaiting_payment";

  return (
    payment.status === "overdue" ||
    (canAutoCancelByDueDate &&
      payment.status === "waiting" &&
      isDueDateReached(payment.due_date))
  );
};

const getPaymentDisplayStatus = (
  payment: Pick<AdminPayment, "status" | "due_date" | "booking_status">,
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

const getAccountDisplayName = (user: AdminUser) =>
  user.full_name?.trim() || user.email || `Akun #${user.id}`;

const isSelectableCsAccount = (user: AdminUser) =>
  user.account_status === "active" &&
  user.role === "admin" &&
  user.occupation?.trim().toLowerCase() === "cs";

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
  contentType?: string | null,
) => {
  const safeInvoiceId = invoiceId.replace(/[^a-z0-9-]/gi, "-").toLowerCase();
  const extension =
    getProofExtensionFromContentType(contentType) ||
    getProofExtensionFromUrl(sourceUrl);

  return `bukti-transfer-${safeInvoiceId}${extension}`;
};

const fetchProofAsFile = async (proofUrl: string): Promise<File | null> => {
  try {
    const absoluteUrl = resolveAssetUrl(proofUrl);
    if (!absoluteUrl) {
      return null;
    }

    const response = await fetch(absoluteUrl);
    if (!response.ok) {
      return null;
    }

    const blob = await response.blob();
    const contentType =
      blob.type ||
      response.headers.get("content-type") ||
      "application/octet-stream";
    const ext = contentType.includes("pdf")
      ? ".pdf"
      : contentType.includes("png")
        ? ".png"
        : contentType.includes("jpeg") || contentType.includes("jpg")
          ? ".jpg"
          : "";
    const fileName = `bukti-transfer-${Date.now()}${ext}`;

    return new File([blob], fileName, { type: contentType });
  } catch {
    return null;
  }
};

const recordPaymentAsIncome = async (payment: AdminPayment) => {
  const propertyId = payment.property.id;
  const amount = Number(payment.amount || 0);

  if (!propertyId || amount <= 0) {
    return false;
  }

  const tenantName = payment.tenant.full_name?.trim() || "Penyewa";
  const description = `Pembayaran sewa #${payment.invoice_id} - ${tenantName}`;

  const receiptFile = payment.transfer_proof_url
    ? await fetchProofAsFile(payment.transfer_proof_url)
    : null;

  try {
    await createAdminFinancialTransaction({
      property_id: propertyId,
      ...(payment.unit.id ? { unit_id: payment.unit.id } : {}),
      category: "income",
      transaction_date: new Date().toISOString().slice(0, 10),
      amount,
      description,
      ...(receiptFile ? { receipt: receiptFile } : {}),
    });
    return true;
  } catch {
    return false;
  }
};

export default function AdminBillingPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [propertyFilter, setPropertyFilter] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "due_date">(
    "newest",
  );
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [properties, setProperties] = useState<AdminPropertyListItem[]>([]);
  const [tenants, setTenants] = useState<AdminUser[]>([]);
  const [csAccounts, setCsAccounts] = useState<AdminUser[]>([]);
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
  const [isApprovingId, setIsApprovingId] = useState<number | null>(null);
  const [isDownloadingProofKey, setIsDownloadingProofKey] = useState<
    string | null
  >(null);
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
          usersResponse,
        ] = await Promise.all([
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
          getAdminUsers({
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
        setCsAccounts(
          usersResponse.data
            .filter(isSelectableCsAccount)
            .sort((first, second) =>
              getAccountDisplayName(first).localeCompare(
                getAccountDisplayName(second),
                "id-ID",
              ),
            ),
        );
      } catch (loadError) {
        if (!active) {
          return;
        }

        setError(
          getApiErrorMessage(
            loadError,
            "Data tagihan gagal dimuat. Coba lagi.",
          ),
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
      setFormError(getApiErrorMessage(loadError, "Daftar unit gagal dimuat."));
    } finally {
      setIsLoadingUnitsPropertyId((current) =>
        current === parsedPropertyId ? null : current,
      );
    }
  };

  const statusFilterOptions = useMemo(
    () =>
      uniqueFilterOptions(
        payments,
        (payment) => getPaymentDisplayStatus(payment),
        (value) => paymentStatusLabel[value],
      ),
    [payments],
  );

  const propertyFilterOptions = useMemo(
    () =>
      uniqueFilterOptions(
        payments,
        (payment) => payment.property.id || null,
        (value, payment) => payment.property.name || `Properti #${value}`,
      ),
    [payments],
  );

  const filtered = useMemo(() => {
    const filteredItems = payments.filter((payment) => {
      const searchable =
        `${payment.invoice_id} ${payment.property.name || ""} ${
          payment.unit.name || ""
        } ${payment.tenant.full_name || ""} ${payment.booking_status_label || ""} ${
          payment.transfer_sender_name || ""
        } ${payment.transfer_bank_name || ""} ${payment.payment_method || ""} ${
          payment.description || ""
        }`.toLowerCase();
      const displayStatus = getPaymentDisplayStatus(payment);

      return (
        searchable.includes(search.toLowerCase()) &&
        (status ? displayStatus === status : true) &&
        (propertyFilter
          ? String(payment.property.id || "") === propertyFilter
          : true)
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
      (payment) => getPaymentDisplayStatus(payment) === "waiting",
    ).length;
    const paid = payments.filter(
      (payment) => getPaymentDisplayStatus(payment) === "paid",
    ).length;
    const cancelled = payments.filter(
      (payment) => getPaymentDisplayStatus(payment) === "cancelled",
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

  const customerServiceOptions = useMemo(
    () =>
      csAccounts.map((account) => ({
        id: account.id,
        value: getAccountDisplayName(account),
        label: getAccountDisplayName(account),
      })),
    [csAccounts],
  );

  const selectedCustomerServiceIsAvailable =
    !form.customerService ||
    customerServiceOptions.some(
      (option) => option.value === form.customerService,
    );
  const computedRentalDuration = formatRentalDuration(
    form.checkInDate,
    form.checkOutDate,
  );

  const openCreateModal = () => {
    setNotice(null);
    setFormMode("create");
    setEditingPaymentId(null);
    setForm(getInitialForm());
    setFormError(null);
    setIsFormOpen(true);
  };

  const openEditModal = (payment: AdminPayment) => {
    const billingDescription = parseBillingDescription(payment.description);

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
      amount: formatRupiahInputValue(payment.amount || ""),
      paymentMethod: payment.payment_method || "",
      checkInDate: billingDescription.checkInDate,
      checkOutDate: billingDescription.checkOutDate,
      rentalDuration: billingDescription.rentalDuration,
      customerService: billingDescription.customerService,
      remarks: billingDescription.remarks,
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
    const amount = parseRupiahInputValue(form.amount);

    if (!propertyId || !unitId || !tenantId) {
      setFormError("Unit, nomor kamar, dan nama penyewa wajib dipilih.");
      return;
    }

    if (!form.dueDate) {
      setFormError("Tanggal wajib diisi.");
      return;
    }

    if (!amount || Number.isNaN(amount) || amount <= 0) {
      setFormError("Total harga harus lebih dari 0.");
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
        ...(normalizeOptional(form.paymentMethod)
          ? { payment_method: normalizeOptional(form.paymentMethod) }
          : {}),
        ...(normalizeOptional(buildBillingDescription(form))
          ? { description: normalizeOptional(buildBillingDescription(form)) }
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
        blob.type || response.headers.get("content-type"),
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
          "Gagal mengunduh bukti transfer.",
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
        message:
          "Tagihan sudah dibatalkan otomatis karena melewati batas pembayaran.",
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
        message:
          "Tagihan sudah dibatalkan otomatis karena melewati batas pembayaran.",
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

        const incomeRecorded = await recordPaymentAsIncome(payment);

        setNotice({
          variant: incomeRecorded ? "success" : "error",
          message: incomeRecorded
            ? `Pembayaran pemesanan #${payment.invoice_id} berhasil di-ACC dan tercatat di keuangan.`
            : `Pembayaran pemesanan #${payment.invoice_id} berhasil di-ACC, tetapi pencatatan keuangan gagal. Catat transaksi secara manual di menu Keuangan.`,
        });
        setApproveConfirmationPayment(null);
        setRefreshKey((previous) => previous + 1);
      } catch (approveError) {
        setNotice({
          variant: "error",
          message: getApiErrorMessage(
            approveError,
            "Gagal melakukan ACC pembayaran pemesanan.",
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

      const incomeRecorded = await recordPaymentAsIncome(payment);

      setNotice({
        variant: incomeRecorded ? "success" : "error",
        message: incomeRecorded
          ? `Pembayaran #${payment.invoice_id} berhasil di-ACC dan tercatat di keuangan.`
          : `Pembayaran #${payment.invoice_id} berhasil di-ACC, tetapi pencatatan keuangan gagal. Catat transaksi secara manual di menu Keuangan.`,
      });
      setApproveConfirmationPayment(null);
      setRefreshKey((previous) => previous + 1);
    } catch (approveError) {
      setNotice({
        variant: "error",
        message: getApiErrorMessage(
          approveError,
          "Gagal melakukan ACC pembayaran.",
        ),
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
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-[#1E2746] via-[#273965] to-[#2C62A5] p-4 text-white shadow-sm sm:p-6">
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
              Pantau status pembayaran, atur tagihan, dan tinjau bukti
              pembayaran.
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
        <SummaryCard
          label="Menunggu"
          value={String(stats.waiting)}
          tone="default"
        />
        <SummaryCard label="Lunas" value={String(stats.paid)} tone="success" />
        <SummaryCard
          label="Dibatalkan"
          value={String(stats.cancelled)}
          tone="danger"
        />
        <SummaryCard
          label="Nominal Menunggu"
          value={`Rp ${stats.totalOutstanding.toLocaleString("id-ID")}`}
        />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
          <div className="relative w-full min-w-0 flex-1">
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

          <div className="relative w-full md:min-w-[170px]">
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
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm focus:border-blue-400 focus:bg-white focus:outline-none"
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
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm focus:border-blue-400 focus:bg-white focus:outline-none"
          >
            <option value="newest">Terbaru</option>
            <option value="oldest">Terlama</option>
            <option value="due_date">Tanggal</option>
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
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 md:w-auto"
          >
            <RotateCcw size={14} />
            Atur Ulang
          </button>
        </div>

        <p className="mt-3 text-xs text-slate-500">
          Menampilkan <span className="font-semibold">{filtered.length}</span>{" "}
          dari <span className="font-semibold">{payments.length}</span> tagihan.
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
              <col className="w-[190px]" />
              <col className="w-[220px]" />
              <col className="w-[150px]" />
              <col className="w-[205px]" />
              <col className="w-[135px]" />
              <col className="w-[155px]" />
              <col className="w-[105px]" />
            </colgroup>
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">Faktur</th>
                <th className="px-4 py-3 text-left">Unit / Nomor Kamar</th>
                <th className="px-4 py-3 text-left">Nama Penyewa</th>
                <th className="px-4 py-3 text-left">Tanggal</th>
                <th className="px-4 py-3 text-left">Total Harga</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-center">Aksi</th>
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
                    <td className="px-4 py-4">
                      <p
                        className="break-words font-mono text-xs font-semibold text-slate-800"
                        title={`#${payment.invoice_id}`}
                      >
                        #{payment.invoice_id}
                      </p>
                      <p className="whitespace-nowrap text-xs text-slate-500">
                        Dibuat: {formatDate(payment.created_at)}
                      </p>
                      {payment.transfer_proof_url ? (
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <a
                            href={
                              resolveAssetUrl(payment.transfer_proof_url) || "#"
                            }
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
                              isDownloadingProofKey ===
                              getPaymentRowKey(payment)
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

                    <td className="px-4 py-4">
                      <p
                        className="line-clamp-2 break-words font-medium text-slate-800"
                        title={payment.property.name || "-"}
                      >
                        {payment.property.name || "-"}
                      </p>
                      <p
                        className="mt-1 line-clamp-2 break-words text-xs text-slate-500"
                        title={payment.unit.name || "-"}
                      >
                        Nomor kamar: {payment.unit.name || "-"}
                      </p>
                    </td>

                    <td className="px-4 py-4 text-slate-700">
                      <p
                        className="line-clamp-3 break-words"
                        title={payment.tenant.full_name || "-"}
                      >
                        {payment.tenant.full_name || "-"}
                      </p>
                    </td>

                    <td className="space-y-1 px-4 py-4">
                      <p className="font-medium text-slate-700">
                        {formatDueDate(payment.due_date)}
                      </p>
                      {getPaymentDisplayStatus(payment) === "waiting" ? (
                        <DeadlineCountdown
                          value={payment.due_date}
                          variant="text"
                          className="mt-1"
                        />
                      ) : null}
                      <p className="whitespace-nowrap text-xs text-slate-500">
                        Bayar: {formatDateTime(payment.paid_at)}
                      </p>
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 font-semibold text-slate-800">
                      Rp {Number(payment.amount || 0).toLocaleString("id-ID")}
                    </td>

                    <td className="space-y-2 px-4 py-4">
                      <StatusBadge status={getPaymentDisplayStatus(payment)} />
                      {isPaymentAutoCancelledByDueDate(payment) ? (
                        <p
                          className="inline-flex rounded-lg border border-red-100 bg-red-50 px-2 py-1 text-xs font-medium text-red-700"
                          title="Dibatalkan otomatis karena melewati batas pembayaran."
                        >
                          Batal otomatis
                        </p>
                      ) : null}
                      {payment.booking_status_label ? (
                        <p
                          className="line-clamp-2 break-words text-xs text-slate-500"
                          title={payment.booking_status_label}
                        >
                          Pemesanan: {payment.booking_status_label}
                        </p>
                      ) : null}
                    </td>

                    <td className="px-4 py-4">
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setViewPayment(payment)}
                          className="inline-flex h-9 w-full items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:border-green-200 hover:bg-green-50 hover:text-green-700"
                          title="Lihat detail"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEditPayment(payment)}
                          className="inline-flex h-9 w-full items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                          title="Ubah tagihan"
                        >
                          <Pencil size={16} />
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
                          className="inline-flex h-9 w-full items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
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
            dari{" "}
            <span className="font-semibold text-slate-700">
              {filtered.length}
            </span>{" "}
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
                  <span className="text-slate-500">Nama Penyewa</span>
                  <span className="text-right font-medium text-slate-800">
                    {approveConfirmationPayment.tenant.full_name || "-"}
                  </span>
                </div>
                <div className="mt-3 flex items-start justify-between gap-4">
                  <span className="text-slate-500">Unit</span>
                  <span className="text-right font-medium text-slate-800">
                    {approveConfirmationPayment.property.name || "-"}
                  </span>
                </div>
                <div className="mt-3 flex items-start justify-between gap-4">
                  <span className="text-slate-500">Nomor Kamar</span>
                  <span className="text-right font-medium text-slate-800">
                    {approveConfirmationPayment.unit.name || "-"}
                  </span>
                </div>
                <div className="mt-3 flex items-start justify-between gap-4">
                  <span className="text-slate-500">Total Harga</span>
                  <span className="whitespace-nowrap text-right font-semibold text-slate-900">
                    Rp{" "}
                    {Number(
                      approveConfirmationPayment.amount || 0,
                    ).toLocaleString("id-ID")}
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
                {isApproveConfirmationBusy
                  ? "Memproses..."
                  : "Ya, ACC Pembayaran"}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-800">
                Detail Tagihan
              </h2>
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
                  {viewPayment.property.name || "-"} •{" "}
                  {viewPayment.unit.name || "-"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Nama penghuni: {viewPayment.tenant.full_name || "-"}
                </p>
              </div>
              <DetailRow label="Faktur" value={`#${viewPayment.invoice_id}`} />
              <DetailRow
                label="Unit"
                value={viewPayment.property.name || "-"}
              />
              <DetailRow
                label="Nomor Kamar"
                value={viewPayment.unit.name || "-"}
              />
              <DetailRow
                label="Nama Penyewa"
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
                  value={`Pembayaran dibatalkan otomatis karena melewati batas pembayaran${
                    viewPayment.due_date
                      ? ` (${formatDueDate(viewPayment.due_date)}).`
                      : "."
                  }`}
                />
              ) : null}
              <DetailRow
                label="Status Pemesanan Penyewa"
                value={viewPayment.booking_status_label || "-"}
              />
              <DetailRow
                label="Total Harga"
                value={`Rp ${viewPayment.amount.toLocaleString("id-ID")}`}
              />
              <DetailRow
                label="Tanggal"
                value={formatDueDate(viewPayment.due_date)}
              />
              {getBillingDescriptionRows(viewPayment.description).map((row) => (
                <DetailRow
                  key={row.label}
                  label={row.label}
                  value={row.value}
                />
              ))}
              {getPaymentDisplayStatus(viewPayment) === "waiting" ? (
                <DetailRow
                  label="Sisa Waktu Pembayaran"
                  value={<DeadlineCountdown value={viewPayment.due_date} />}
                />
              ) : null}
              <DetailRow
                label="Tanggal Bayar"
                value={formatDateTime(viewPayment.paid_at)}
              />
              <DetailRow
                label="Pembayaran"
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
                        href={
                          resolveAssetUrl(viewPayment.transfer_proof_url) || "#"
                        }
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
                          isDownloadingProofKey ===
                          getPaymentRowKey(viewPayment)
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
              <DetailRow
                label="Keterangan"
                value={getBillingRemarks(viewPayment.description)}
              />
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
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-xl">
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
                    Tanggal
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
                    Unit
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
                        checkInDate: "",
                        checkOutDate: "",
                        amount: "",
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
                    Nomor Kamar
                  </label>
                  <select
                    value={form.unitId}
                    onChange={(event) => {
                      const nextUnitId = event.target.value;
                      const selectedUnit = availableUnits.find(
                        (unit) => String(unit.unit_id) === nextUnitId,
                      );
                      const nextCheckIn = toInputDate(
                        selectedUnit?.check_in_date ||
                          selectedUnit?.lease_start,
                      );
                      const nextCheckOut = toInputDate(
                        selectedUnit?.check_out_date || selectedUnit?.lease_end,
                      );
                      const nextAmount =
                        selectedUnit && Number(selectedUnit.price || 0) > 0
                          ? formatRupiahInputValue(selectedUnit.price)
                          : "";

                      setForm((previous) => ({
                        ...previous,
                        unitId: nextUnitId,
                        checkInDate: previous.checkInDate || nextCheckIn,
                        checkOutDate: previous.checkOutDate || nextCheckOut,
                        rentalDuration: "",
                        amount: previous.amount || nextAmount,
                      }));
                    }}
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
                    Nama Penyewa
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
                    Check In
                  </label>
                  <input
                    type="date"
                    value={form.checkInDate}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        checkInDate: event.target.value,
                        rentalDuration: "",
                      }))
                    }
                    className="h-11 w-full rounded-xl border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E2746]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Check Out
                  </label>
                  <input
                    type="date"
                    value={form.checkOutDate}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        checkOutDate: event.target.value,
                        rentalDuration: "",
                      }))
                    }
                    className="h-11 w-full rounded-xl border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E2746]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Lama Sewa
                  </label>
                  <input
                    value={computedRentalDuration || form.rentalDuration}
                    readOnly
                    className="h-11 w-full rounded-xl border bg-slate-50 px-4 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1E2746]"
                    placeholder="Terhitung otomatis"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Total Harga
                  </label>
                  <div className="flex h-11 overflow-hidden rounded-xl border focus-within:ring-2 focus-within:ring-[#1E2746]">
                    <span className="inline-flex items-center border-r bg-slate-50 px-4 text-sm font-medium text-slate-600">
                      Rp
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={form.amount}
                      onChange={(event) =>
                        setForm((previous) => ({
                          ...previous,
                          amount: formatRupiahInputValue(event.target.value),
                        }))
                      }
                      className="h-full min-w-0 flex-1 px-4 text-sm focus:outline-none"
                      placeholder="1.500.000"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Pembayaran
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
                    placeholder="Transfer Bank / Tunai / E-Wallet / DP"
                  />
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
                        status: event.target
                          .value as BillingFormState["status"],
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
                    CS (Opsional)
                  </label>
                  <select
                    value={form.customerService}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        customerService: event.target.value,
                      }))
                    }
                    className="h-11 w-full rounded-xl border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E2746]"
                  >
                    <option value="">Tanpa CS</option>
                    {!selectedCustomerServiceIsAvailable ? (
                      <option value={form.customerService}>
                        {form.customerService}
                      </option>
                    ) : null}
                    {customerServiceOptions.map((option) => (
                      <option key={option.id} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Keterangan
                </label>
                <textarea
                  value={form.remarks}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      remarks: event.target.value,
                    }))
                  }
                  rows={3}
                  className="w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E2746]"
                  placeholder="Catatan tambahan untuk tagihan ini"
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
      <span className="max-w-[62%] break-words text-right text-slate-800">
        {value}
      </span>
    </div>
  );
}
