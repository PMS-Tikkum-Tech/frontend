"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Ban,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Filter,
  Pencil,
  PiggyBank,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format as formatDateFns,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  isWithinInterval,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  approveAdminManualRentalBooking,
  cancelAdminManualRentalBookingNonRefund,
  cancelAdminManualRentalBookingToDeposit,
  createAdminFinancialTransaction,
  createAdminPayment,
  deleteAdminPayment,
  getAllAdminManualRentalBookings,
  getAllAdminPayments,
  getAllAdminProperties,
  getAllAdminPropertyUnits,
  getAllAdminTenants,
  getAllAdminUsers,
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
const BILLING_DATE_RANGE_STORAGE_KEY = "admin-billing-date-range-v1";

type BillingDateRange = {
  startDate: string;
  endDate: string;
};

type BillingQuickDateRangeKey =
  | "today"
  | "thisWeek"
  | "thisMonth"
  | "lastMonth";

const billingQuickDateRanges: Array<{
  key: BillingQuickDateRangeKey;
  label: string;
}> = [
  { key: "today", label: "Today" },
  { key: "thisWeek", label: "This Week" },
  { key: "thisMonth", label: "This Month" },
  { key: "lastMonth", label: "Last Month" },
];

const billingWeekdayLabels = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

const toBillingDateKey = (date: Date) => formatDateFns(date, "yyyy-MM-dd");

const parseBillingDate = (value?: string | null) => {
  if (!value) {
    return null;
  }

  const parsed = parseISO(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
};

const normalizeBillingDateRange = (
  startDate: string,
  endDate: string,
): BillingDateRange | null => {
  const parsedStart = parseBillingDate(startDate);
  const parsedEnd = parseBillingDate(endDate);

  if (!parsedStart || !parsedEnd) {
    return null;
  }

  if (isAfter(parsedStart, parsedEnd)) {
    return {
      startDate: toBillingDateKey(parsedEnd),
      endDate: toBillingDateKey(parsedStart),
    };
  }

  return {
    startDate: toBillingDateKey(parsedStart),
    endDate: toBillingDateKey(parsedEnd),
  };
};

const getCurrentBillingMonthDateRange = (): BillingDateRange => {
  const today = new Date();

  return {
    startDate: toBillingDateKey(startOfMonth(today)),
    endDate: toBillingDateKey(endOfMonth(today)),
  };
};

const getBillingQuickDateRange = (
  rangeKey: BillingQuickDateRangeKey,
): BillingDateRange => {
  const today = new Date();

  switch (rangeKey) {
    case "today":
      return {
        startDate: toBillingDateKey(today),
        endDate: toBillingDateKey(today),
      };
    case "thisWeek":
      return {
        startDate: toBillingDateKey(startOfWeek(today, { weekStartsOn: 1 })),
        endDate: toBillingDateKey(endOfWeek(today, { weekStartsOn: 1 })),
      };
    case "lastMonth": {
      const lastMonth = subMonths(today, 1);

      return {
        startDate: toBillingDateKey(startOfMonth(lastMonth)),
        endDate: toBillingDateKey(endOfMonth(lastMonth)),
      };
    }
    case "thisMonth":
    default:
      return getCurrentBillingMonthDateRange();
  }
};

const getStoredBillingDateRange = (): BillingDateRange | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(BILLING_DATE_RANGE_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<BillingDateRange>;
    if (
      typeof parsed.startDate !== "string" ||
      typeof parsed.endDate !== "string"
    ) {
      return null;
    }

    return normalizeBillingDateRange(parsed.startDate, parsed.endDate);
  } catch {
    return null;
  }
};

const formatBillingDateLabel = (value: string) => {
  const parsed = parseBillingDate(value);

  if (!parsed) {
    return value;
  }

  return formatDateFns(parsed, "dd MMM yyyy", { locale: idLocale });
};

const formatBillingDateRangeLabel = (startDate: string, endDate: string) =>
  `${formatBillingDateLabel(startDate)} → ${formatBillingDateLabel(endDate)}`;

const buildBillingCalendarDates = (month: Date) =>
  eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
  });

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

const formatCurrency = (value: number | string) =>
  `Rp ${Number(value || 0).toLocaleString("id-ID")}`;

const getInvoiceDescription = (payment: AdminPayment) => {
  const details = parseBillingDescription(payment.description);
  const duration = details.rentalDuration || "Periode sewa";
  const checkIn = details.checkInDate ? formatDate(details.checkInDate) : null;
  const checkOut = details.checkOutDate
    ? formatDate(details.checkOutDate)
    : null;

  return [
    "Tagihan sewa kamar",
    duration,
    checkIn && checkOut ? `${checkIn} - ${checkOut}` : null,
  ]
    .filter(Boolean)
    .join(" / ");
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

const canCancelManualBooking = (payment: AdminPayment) =>
  isManualBookingRecord(payment) &&
  (payment.booking_status === "pending_review" ||
    payment.booking_status === "booked");

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
      ...(payment.tenant.id ? { tenant_id: payment.tenant.id } : {}),
      ...(isManualBookingRecord(payment)
        ? { rental_booking_id: payment.id }
        : {}),
      category: "income",
      transaction_type: "income",
      income_category: "unit_rental",
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
  const defaultDateRange = useMemo(() => getCurrentBillingMonthDateRange(), []);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [propertyFilter, setPropertyFilter] = useState("");
  const [startDate, setStartDate] = useState(defaultDateRange.startDate);
  const [endDate, setEndDate] = useState(defaultDateRange.endDate);
  const [tempStartDate, setTempStartDate] = useState(
    defaultDateRange.startDate,
  );
  const [tempEndDate, setTempEndDate] = useState(defaultDateRange.endDate);
  const [isDateRangeReady, setIsDateRangeReady] = useState(false);
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
  const [isCancellingId, setIsCancellingId] = useState<number | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<number | null>(null);
  const [isDownloadingProofKey, setIsDownloadingProofKey] = useState<
    string | null
  >(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const storedDateRange = getStoredBillingDateRange();
    const initialDateRange =
      storedDateRange || getCurrentBillingMonthDateRange();

    setStartDate(initialDateRange.startDate);
    setEndDate(initialDateRange.endDate);
    setTempStartDate(initialDateRange.startDate);
    setTempEndDate(initialDateRange.endDate);
    setIsDateRangeReady(true);
  }, []);

  useEffect(() => {
    if (!isDateRangeReady) {
      return;
    }

    try {
      window.localStorage.setItem(
        BILLING_DATE_RANGE_STORAGE_KEY,
        JSON.stringify({ startDate, endDate }),
      );
    } catch {
      // Billing filters remain usable even when storage is unavailable.
    }
  }, [endDate, isDateRangeReady, startDate]);

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
          getAllAdminPayments(),
          getAllAdminManualRentalBookings(),
          getAllAdminProperties(),
          getAllAdminTenants(),
          getAllAdminUsers(),
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
      const response = await getAllAdminPropertyUnits(parsedPropertyId);

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

  const dateRangePayments = useMemo(() => {
    const selectedStartDate = parseBillingDate(startDate);
    const selectedEndDate = parseBillingDate(endDate);

    if (!selectedStartDate || !selectedEndDate) {
      return payments;
    }

    return payments.filter((payment) => {
      const filterDate = parseBillingDate(
        toInputDate(payment.due_date) ||
          toInputDate(payment.paid_at) ||
          toInputDate(payment.created_at),
      );

      if (!filterDate) {
        return true;
      }

      return isWithinInterval(filterDate, {
        start: selectedStartDate,
        end: selectedEndDate,
      });
    });
  }, [endDate, payments, startDate]);

  const filtered = useMemo(() => {
    const filteredItems = dateRangePayments.filter((payment) => {
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
  }, [dateRangePayments, search, status, propertyFilter, sortBy]);

  const stats = useMemo(() => {
    const waiting = dateRangePayments.filter(
      (payment) => getPaymentDisplayStatus(payment) === "waiting",
    ).length;
    const paid = dateRangePayments.filter(
      (payment) => getPaymentDisplayStatus(payment) === "paid",
    ).length;
    const cancelled = dateRangePayments.filter(
      (payment) => getPaymentDisplayStatus(payment) === "cancelled",
    ).length;
    const totalOutstanding = dateRangePayments
      .filter((payment) => getPaymentDisplayStatus(payment) === "waiting")
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

    return {
      total: dateRangePayments.length,
      waiting,
      paid,
      cancelled,
      totalOutstanding,
    };
  }, [dateRangePayments]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const pagedPayments = filtered.slice(startIndex, startIndex + PAGE_SIZE);

  useEffect(() => {
    setCurrentPage(1);
  }, [endDate, propertyFilter, search, sortBy, startDate, status]);

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

  const handleDateChange = (nextStartDate: string, nextEndDate: string) => {
    const normalizedDateRange = normalizeBillingDateRange(
      nextStartDate,
      nextEndDate,
    );

    if (!normalizedDateRange) {
      return;
    }

    setTempStartDate(normalizedDateRange.startDate);
    setTempEndDate(normalizedDateRange.endDate);
  };

  const handleApply = () => {
    const normalizedDateRange = normalizeBillingDateRange(
      tempStartDate,
      tempEndDate,
    );

    if (!normalizedDateRange) {
      return;
    }

    setStartDate(normalizedDateRange.startDate);
    setEndDate(normalizedDateRange.endDate);
    setTempStartDate(normalizedDateRange.startDate);
    setTempEndDate(normalizedDateRange.endDate);
    setCurrentPage(1);
  };

  const handleCancel = () => {
    setTempStartDate(startDate);
    setTempEndDate(endDate);
  };

  const handleResetFilters = () => {
    const currentMonthDateRange = getCurrentBillingMonthDateRange();

    setSearch("");
    setStatus("");
    setPropertyFilter("");
    setStartDate(currentMonthDateRange.startDate);
    setEndDate(currentMonthDateRange.endDate);
    setTempStartDate(currentMonthDateRange.startDate);
    setTempEndDate(currentMonthDateRange.endDate);
    setSortBy("newest");
    setCurrentPage(1);
  };

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

  const handleCancelManualBooking = async (
    payment: AdminPayment,
    mode: "non_refund" | "deposit",
  ) => {
    if (!canCancelManualBooking(payment)) {
      setNotice({
        variant: "error",
        message:
          "Pemesanan ini tidak berada pada status yang bisa dibatalkan dari modul tagihan.",
      });
      return;
    }

    const isDepositMode = mode === "deposit";
    const confirmed = window.confirm(
      isDepositMode
        ? `Jadikan pembayaran booking #${payment.invoice_id} sebagai deposit? Transaksi income tidak akan dibuat.`
        : `Batalkan booking #${payment.invoice_id} sebagai non-refund? Nominal akan dicatat sebagai pemasukan lainnya.`,
    );

    if (!confirmed) {
      return;
    }

    setIsCancellingId(payment.id);
    setNotice(null);

    try {
      if (isDepositMode) {
        await cancelAdminManualRentalBookingToDeposit(payment.id);
      } else {
        await cancelAdminManualRentalBookingNonRefund(payment.id);
      }

      setNotice({
        variant: "success",
        message: isDepositMode
          ? `Booking #${payment.invoice_id} dibatalkan dan dana dicatat sebagai deposit.`
          : `Booking #${payment.invoice_id} dibatalkan sebagai non-refund dan tercatat di keuangan.`,
      });
      setRefreshKey((previous) => previous + 1);
    } catch (cancelError) {
      setNotice({
        variant: "error",
        message: getApiErrorMessage(
          cancelError,
          isDepositMode
            ? "Gagal menjadikan pembayaran sebagai deposit."
            : "Gagal membatalkan booking sebagai non-refund.",
        ),
      });
    } finally {
      setIsCancellingId(null);
    }
  };

  const handleDeletePayment = async (payment: AdminPayment) => {
    if (isManualBookingRecord(payment)) {
      setNotice({
        variant: "error",
        message:
          "Data booking penyewa tidak bisa dihapus dari tombol hapus tagihan sementara.",
      });
      return;
    }

    const confirmed = window.confirm(
      `Hapus tagihan #${payment.invoice_id}? Tindakan ini tidak bisa dibatalkan.`,
    );

    if (!confirmed) {
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
      if (
        viewPayment?.id === payment.id &&
        !isManualBookingRecord(viewPayment)
      ) {
        setViewPayment(null);
      }
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

  const approveConfirmationIsManual = approveConfirmationPayment
    ? isManualBookingRecord(approveConfirmationPayment)
    : false;
  const isApproveConfirmationBusy = approveConfirmationPayment
    ? isApprovingId === approveConfirmationPayment.id
    : false;

  return (
    <div className="space-y-4 sm:space-y-7">
      <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-[#1E2746] via-[#273965] to-[#2C62A5] p-4 text-white shadow-sm sm:rounded-3xl sm:p-6">
        <div className="pointer-events-none absolute -left-12 top-0 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -right-12 bottom-0 h-44 w-44 rounded-full bg-white/10 blur-3xl" />

        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="inline-flex rounded-full border border-white/35 bg-white/10 px-3 py-1 text-xs font-medium">
              Modul Tagihan
            </p>
            <h1 className="mt-3 text-xl font-semibold sm:text-2xl md:text-3xl">
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

      <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-5">
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

      <section className="overflow-visible rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <Filter size={17} className="shrink-0 text-slate-500" />
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-slate-800">
                Filter Tagihan
              </h2>
              <p className="hidden text-xs text-slate-500 sm:block">
                Saring tagihan berdasarkan status, properti, dan periode.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleResetFilters}
            className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <RotateCcw size={14} />
            Atur Ulang
          </button>
        </div>

        <div className="space-y-4 p-4 sm:p-5">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-600">
              Pencarian
            </span>
            <span className="relative block">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                placeholder="Cari faktur, properti, unit, atau penyewa..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-800 transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:outline-none"
              />
            </span>
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-12">
            <label className="min-w-0 xl:col-span-3">
              <span className="mb-1.5 block text-xs font-medium text-slate-600">
                Status
              </span>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 focus:border-blue-400 focus:bg-white focus:outline-none"
              >
                <option value="">Semua Status</option>
                {statusFilterOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="min-w-0 xl:col-span-3">
              <span className="mb-1.5 block text-xs font-medium text-slate-600">
                Properti
              </span>
              <select
                value={propertyFilter}
                onChange={(event) => setPropertyFilter(event.target.value)}
                className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 focus:border-blue-400 focus:bg-white focus:outline-none"
              >
                <option value="">Semua Properti</option>
                {propertyFilterOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="min-w-0 xl:col-span-4">
              <span className="mb-1.5 block text-xs font-medium text-slate-600">
                Periode
              </span>
              <BillingDateRangePicker
                startDate={startDate}
                endDate={endDate}
                tempStartDate={tempStartDate}
                tempEndDate={tempEndDate}
                onDateChange={handleDateChange}
                onApply={handleApply}
                onCancel={handleCancel}
              />
            </div>

            <label className="min-w-0 sm:col-span-2 xl:col-span-2">
              <span className="mb-1.5 block text-xs font-medium text-slate-600">
                Urutkan
              </span>
              <select
                value={sortBy}
                onChange={(event) =>
                  setSortBy(
                    event.target.value as "newest" | "oldest" | "due_date",
                  )
                }
                className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 focus:border-blue-400 focus:bg-white focus:outline-none"
              >
                <option value="newest">Terbaru</option>
                <option value="oldest">Terlama</option>
                <option value="due_date">Tanggal</option>
              </select>
            </label>
          </div>
        </div>

        <div className="rounded-b-xl border-t border-slate-100 bg-slate-50/60 px-4 py-3 sm:px-5">
          <p className="text-xs leading-5 text-slate-500">
            Menampilkan{" "}
            <span className="font-semibold text-slate-700">
              {filtered.length}
            </span>{" "}
            dari{" "}
            <span className="font-semibold text-slate-700">
              {dateRangePayments.length}
            </span>{" "}
            tagihan dalam periode.
          </p>
        </div>
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
        <div className="admin-responsive-table overflow-x-auto">
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
                  <td
                    data-label=""
                    colSpan={7}
                    className="p-6 text-center text-slate-500"
                  >
                    Memuat data tagihan...
                  </td>
                </tr>
              ) : pagedPayments.length === 0 ? (
                <tr>
                  <td
                    data-label=""
                    colSpan={7}
                    className="p-6 text-center text-slate-500"
                  >
                    Tidak ada data tagihan.
                  </td>
                </tr>
              ) : (
                pagedPayments.map((payment) => (
                  <tr
                    key={getPaymentRowKey(payment)}
                    className="border-t border-slate-100 align-top hover:bg-slate-50"
                  >
                    <td
                      data-label="Faktur"
                      data-mobile-primary="true"
                      className="px-4 py-4"
                    >
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

                    <td data-label="Unit / Kamar" className="px-4 py-4">
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

                    <td
                      data-label="Penyewa"
                      className="px-4 py-4 text-slate-700"
                    >
                      <p
                        className="line-clamp-3 break-words"
                        title={payment.tenant.full_name || "-"}
                      >
                        {payment.tenant.full_name || "-"}
                      </p>
                    </td>

                    <td data-label="Tanggal" className="space-y-1 px-4 py-4">
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

                    <td
                      data-label="Total Harga"
                      className="whitespace-nowrap px-4 py-4 font-semibold text-slate-800"
                    >
                      Rp {Number(payment.amount || 0).toLocaleString("id-ID")}
                    </td>

                    <td data-label="Status" className="space-y-2 px-4 py-4">
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

                    <td
                      data-label="Aksi"
                      data-mobile-actions="true"
                      className="px-4 py-4"
                    >
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
                            isApprovingId === payment.id ||
                            isCancellingId === payment.id ||
                            isDeletingId === payment.id
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
                        {!isManualBookingRecord(payment) ? (
                          <button
                            type="button"
                            onClick={() => {
                              void handleDeletePayment(payment);
                            }}
                            disabled={
                              isDeletingId === payment.id ||
                              isApprovingId === payment.id ||
                              isCancellingId === payment.id
                            }
                            className="inline-flex h-9 w-full items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-wait disabled:opacity-40"
                            title="Hapus tagihan"
                          >
                            <Trash2 size={16} />
                          </button>
                        ) : null}
                        {canCancelManualBooking(payment) ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                void handleCancelManualBooking(
                                  payment,
                                  "non_refund",
                                );
                              }}
                              disabled={
                                isCancellingId === payment.id ||
                                isApprovingId === payment.id
                              }
                              className="inline-flex h-9 w-full items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-wait disabled:opacity-40"
                              title="Batalkan sebagai non-refund"
                            >
                              <Ban size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                void handleCancelManualBooking(
                                  payment,
                                  "deposit",
                                );
                              }}
                              disabled={
                                isCancellingId === payment.id ||
                                isApprovingId === payment.id
                              }
                              className="inline-flex h-9 w-full items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-wait disabled:opacity-40"
                              title="Jadikan pembayaran sebagai deposit"
                            >
                              <PiggyBank size={16} />
                            </button>
                          </>
                        ) : null}
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

          <div className="admin-pagination inline-flex items-center gap-2 self-start">
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
        <div className="admin-mobile-dialog fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="admin-mobile-dialog-panel w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
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
        <div className="admin-mobile-dialog fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="admin-mobile-dialog-panel max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Faktur Pembayaran
                </p>
                <h2 className="mt-1 text-lg font-semibold text-slate-900">
                  #{viewPayment.invoice_id}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setViewPayment(null)}
                className="rounded-lg p-2 hover:bg-slate-100"
                title="Tutup"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-6 px-6 py-5 text-sm">
              <section className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1.4fr_1fr]">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Ditagihkan oleh
                  </p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">
                    Kyra Stay
                  </p>
                  <p className="mt-1 max-w-md text-sm leading-6 text-slate-600">
                    Pengelolaan hunian dan pembayaran sewa properti.
                  </p>
                </div>

                <div className="grid gap-3 rounded-lg bg-white p-4 shadow-sm">
                  <InvoiceMetaRow label="Status">
                    <StatusBadge
                      status={getPaymentDisplayStatus(viewPayment)}
                    />
                  </InvoiceMetaRow>
                  <InvoiceMetaRow
                    label="Tanggal Faktur"
                    value={formatDate(viewPayment.created_at)}
                  />
                  <InvoiceMetaRow
                    label="Batas Bayar"
                    value={formatDueDate(viewPayment.due_date)}
                  />
                  <InvoiceMetaRow
                    label="Tanggal Lunas"
                    value={formatDateTime(viewPayment.paid_at)}
                  />
                </div>
              </section>

              <section className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Ditagihkan kepada
                  </p>
                  <p className="mt-2 text-base font-semibold text-slate-900">
                    {viewPayment.tenant.full_name || "-"}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    ID Penyewa: {viewPayment.tenant.id}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Detail hunian
                  </p>
                  <p className="mt-2 text-base font-semibold text-slate-900">
                    {viewPayment.property.name || "-"}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Nomor kamar: {viewPayment.unit.name || "-"}
                  </p>
                </div>
              </section>

              <section className="overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3 text-left">Deskripsi</th>
                      <th className="px-4 py-3 text-right">Jumlah</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-slate-100">
                      <td className="px-4 py-4">
                        <p className="font-medium text-slate-900">
                          {getInvoiceDescription(viewPayment)}
                        </p>
                        <div className="mt-2 grid gap-1 text-xs text-slate-500 sm:grid-cols-2">
                          {getBillingDescriptionRows(
                            viewPayment.description,
                          ).map((row) => (
                            <p key={row.label}>
                              <span className="font-medium text-slate-600">
                                {row.label}:
                              </span>{" "}
                              {row.value}
                            </p>
                          ))}
                          {viewPayment.booking_status_label ? (
                            <p>
                              <span className="font-medium text-slate-600">
                                Status pemesanan:
                              </span>{" "}
                              {viewPayment.booking_status_label}
                            </p>
                          ) : null}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-right font-semibold text-slate-900">
                        {formatCurrency(viewPayment.amount)}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot className="border-t border-slate-200 bg-slate-50">
                    <tr>
                      <td className="px-4 py-3 text-right font-semibold text-slate-700">
                        Total
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-lg font-semibold text-slate-900">
                        {formatCurrency(viewPayment.amount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </section>

              <section className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="font-semibold text-slate-900">
                    Informasi pembayaran
                  </p>
                  <div className="mt-3 space-y-2">
                    <InvoiceMetaRow
                      label="Metode"
                      value={viewPayment.payment_method || "-"}
                    />
                    <InvoiceMetaRow
                      label="Pengirim"
                      value={viewPayment.transfer_sender_name || "-"}
                    />
                    <InvoiceMetaRow
                      label="Bank/Channel"
                      value={viewPayment.transfer_bank_name || "-"}
                    />
                    <InvoiceMetaRow
                      label="Bukti dikirim"
                      value={formatDateTime(viewPayment.payment_submitted_at)}
                    />
                    <InvoiceMetaRow
                      label="Direview"
                      value={formatDateTime(viewPayment.reviewed_at)}
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="font-semibold text-slate-900">
                    Dokumen & catatan
                  </p>
                  <div className="mt-3 space-y-3">
                    {viewPayment.transfer_proof_url ? (
                      <div className="flex flex-wrap gap-2">
                        <a
                          href={
                            resolveAssetUrl(viewPayment.transfer_proof_url) ||
                            "#"
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-9 items-center rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-semibold text-blue-700 hover:bg-blue-100"
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
                          className="inline-flex h-9 items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:cursor-wait disabled:opacity-60"
                        >
                          <Download size={13} />
                          {isDownloadingProofKey ===
                          getPaymentRowKey(viewPayment)
                            ? "Mengunduh..."
                            : "Unduh bukti"}
                        </button>
                      </div>
                    ) : (
                      <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-500">
                        Bukti transfer belum tersedia.
                      </p>
                    )}
                    <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-600">
                      {getBillingRemarks(viewPayment.description)}
                    </p>
                  </div>
                </div>
              </section>

              {getPaymentDisplayStatus(viewPayment) === "waiting" ? (
                <section className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                  <span className="font-semibold">Sisa waktu pembayaran: </span>
                  <DeadlineCountdown value={viewPayment.due_date} />
                </section>
              ) : null}

              {isPaymentAutoCancelledByDueDate(viewPayment) ? (
                <section className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800">
                  Pembayaran dibatalkan otomatis karena melewati batas
                  pembayaran
                  {viewPayment.due_date
                    ? ` (${formatDueDate(viewPayment.due_date)}).`
                    : "."}
                </section>
              ) : null}
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
        <div className="admin-mobile-dialog fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="admin-mobile-dialog-panel max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-xl">
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

            <div className="flex flex-col-reverse gap-3 border-t bg-slate-50 px-4 py-4 sm:flex-row sm:justify-end sm:px-6">
              <button
                type="button"
                onClick={closeFormModal}
                disabled={isSubmitting}
                className="h-11 w-full rounded-xl border px-5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleSavePayment();
                }}
                disabled={isSubmitting}
                className="h-11 w-full rounded-xl bg-[#1E2746] px-5 text-sm font-medium text-white hover:bg-[#141B35] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
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

type BillingDateRangePickerProps = {
  startDate: string;
  endDate: string;
  tempStartDate: string;
  tempEndDate: string;
  onDateChange: (startDate: string, endDate: string) => void;
  onApply: () => void;
  onCancel: () => void;
};

function BillingDateRangePicker({
  startDate,
  endDate,
  tempStartDate,
  tempEndDate,
  onDateChange,
  onApply,
  onCancel,
}: BillingDateRangePickerProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() =>
    startOfMonth(parseBillingDate(tempStartDate) || new Date()),
  );
  const [isSelectingRangeEnd, setIsSelectingRangeEnd] = useState(false);

  const selectedStart = parseBillingDate(tempStartDate);
  const selectedEnd = parseBillingDate(tempEndDate);
  const rangeStart =
    selectedStart && selectedEnd && isAfter(selectedStart, selectedEnd)
      ? selectedEnd
      : selectedStart;
  const rangeEnd =
    selectedStart && selectedEnd && isAfter(selectedStart, selectedEnd)
      ? selectedStart
      : selectedEnd;
  const leftMonth = startOfMonth(visibleMonth);
  const rightMonth = addMonths(leftMonth, 1);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        onCancel();
        setIsOpen(false);
        setIsSelectingRangeEnd(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isOpen, onCancel]);

  const handleTogglePicker = () => {
    if (isOpen) {
      onCancel();
      setIsOpen(false);
      setIsSelectingRangeEnd(false);
      return;
    }

    setVisibleMonth(
      startOfMonth(
        parseBillingDate(tempStartDate) ||
          parseBillingDate(startDate) ||
          new Date(),
      ),
    );
    setIsSelectingRangeEnd(false);
    setIsOpen(true);
  };

  const handleDayClick = (date: Date) => {
    const selectedDateKey = toBillingDateKey(date);

    if (!isSelectingRangeEnd) {
      onDateChange(selectedDateKey, selectedDateKey);
      setIsSelectingRangeEnd(true);
      return;
    }

    const anchorDate = parseBillingDate(tempStartDate) || date;
    const nextStartDate = isBefore(date, anchorDate) ? date : anchorDate;
    const nextEndDate = isBefore(date, anchorDate) ? anchorDate : date;

    onDateChange(
      toBillingDateKey(nextStartDate),
      toBillingDateKey(nextEndDate),
    );
    setIsSelectingRangeEnd(false);
  };

  const handleQuickSelect = (rangeKey: BillingQuickDateRangeKey) => {
    const nextRange = getBillingQuickDateRange(rangeKey);

    onDateChange(nextRange.startDate, nextRange.endDate);
    setVisibleMonth(
      startOfMonth(parseBillingDate(nextRange.startDate) || new Date()),
    );
    setIsSelectingRangeEnd(false);
  };

  const handleApplyClick = () => {
    onApply();
    setIsOpen(false);
    setIsSelectingRangeEnd(false);
  };

  const handleCancelClick = () => {
    onCancel();
    setIsOpen(false);
    setIsSelectingRangeEnd(false);
  };

  const renderMonth = (month: Date) => (
    <div className="min-w-0">
      <div className="mb-3 text-center text-sm font-semibold text-slate-800">
        {formatDateFns(month, "MMMM yyyy", { locale: idLocale })}
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-slate-400">
        {billingWeekdayLabels.map((weekday) => (
          <span key={weekday} className="py-1">
            {weekday}
          </span>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {buildBillingCalendarDates(month).map((date) => {
          const dateKey = toBillingDateKey(date);
          const isOutsideMonth = !isSameMonth(date, month);
          const isStart = Boolean(rangeStart && isSameDay(date, rangeStart));
          const isEnd = Boolean(rangeEnd && isSameDay(date, rangeEnd));
          const isRangeEdge = isStart || isEnd;
          const isInRange = Boolean(
            rangeStart &&
            rangeEnd &&
            isWithinInterval(date, { start: rangeStart, end: rangeEnd }),
          );

          const dayClassName = [
            "h-9 w-full rounded-lg text-sm transition",
            isOutsideMonth ? "text-slate-300" : "text-slate-700",
            isInRange ? "bg-blue-50 text-blue-700" : "hover:bg-slate-100",
            isRangeEdge
              ? "bg-[#1E2746] font-semibold text-white hover:bg-[#1E2746]"
              : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <button
              key={dateKey}
              type="button"
              onClick={() => handleDayClick(date)}
              aria-pressed={isRangeEdge}
              className={dayClassName}
            >
              {formatDateFns(date, "d")}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div ref={wrapperRef} className="relative min-w-0 w-full">
      <button
        type="button"
        onClick={handleTogglePicker}
        className="flex h-11 w-full items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 text-left text-sm text-slate-700 hover:bg-white focus:border-blue-400 focus:bg-white focus:outline-none"
      >
        <span className="inline-flex min-w-0 items-center gap-2">
          <CalendarDays size={16} className="shrink-0 text-slate-400" />
          <span className="truncate">
            {formatBillingDateRangeLabel(startDate, endDate)}
          </span>
        </span>
        <ChevronRight
          size={16}
          className={`shrink-0 text-slate-400 transition ${
            isOpen ? "rotate-90" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-[calc(100%+0.5rem)] z-40 w-[min(720px,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-800">
                Periode Jatuh Tempo
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {formatBillingDateRangeLabel(tempStartDate, tempEndDate)}
              </p>
            </div>

            <div className="inline-flex items-center gap-2 self-start">
              <button
                type="button"
                onClick={() => setVisibleMonth((month) => addMonths(month, -1))}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                title="Bulan sebelumnya"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => setVisibleMonth((month) => addMonths(month, 1))}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                title="Bulan berikutnya"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[160px_1fr]">
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-1 lg:content-start">
              {billingQuickDateRanges.map((range) => {
                const quickRange = getBillingQuickDateRange(range.key);
                const isActive =
                  tempStartDate === quickRange.startDate &&
                  tempEndDate === quickRange.endDate;

                return (
                  <button
                    key={range.key}
                    type="button"
                    onClick={() => handleQuickSelect(range.key)}
                    className={`h-10 rounded-xl border px-3 text-left text-sm font-medium transition ${
                      isActive
                        ? "border-[#1E2746] bg-[#1E2746] text-white"
                        : "border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {range.label}
                  </button>
                );
              })}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {renderMonth(leftMonth)}
              {renderMonth(rightMonth)}
            </div>
          </div>

          <div className="mt-4 flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={handleCancelClick}
              className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApplyClick}
              className="h-10 rounded-xl bg-[#1E2746] px-5 text-sm font-semibold text-white hover:bg-[#141B35]"
            >
              Apply
            </button>
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
    <div className="h-full rounded-2xl border border-slate-200 bg-white p-3 shadow-sm last:col-span-2 sm:p-4 xl:last:col-span-1">
      <p className="text-xs text-slate-500">{label}</p>
      <p
        className={`mt-1 break-words text-xl font-semibold sm:text-2xl ${valueStyle}`}
      >
        {value}
      </p>
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

function InvoiceMetaRow({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="max-w-[60%] break-words text-right font-medium text-slate-800">
        {children || value || "-"}
      </span>
    </div>
  );
}
