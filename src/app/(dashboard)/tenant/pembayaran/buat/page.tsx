"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Suspense,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import {
  ArrowLeft,
  Building2,
  CalendarClock,
  CalendarDays,
  ChevronDown,
  CheckCircle2,
  CircleAlert,
  Clock3,
  CreditCard,
  FileUp,
  IdCard,
  Landmark,
  LoaderCircle,
  Mail,
  MapPin,
  Phone,
  QrCode,
  ReceiptText,
  Save,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { resolveApiBaseUrl } from "@/lib/api-base-url";
import {
  createTenantBookingPayment,
  getBasicProfileRequiredFields,
  getApiErrorMessage,
  getIncompleteTenantProfileFields,
  getPublicProperties,
  getPublicPropertyUnits,
  getTenantProfile,
  updateTenantProfile,
  type PublicPropertySummary,
  type PublicPropertyUnitSummary,
} from "@/lib/dashboard/tenant.api";
import SafeImage from "@/components/ui/SafeImage";
import { getTenantUnitDisplayName } from "@/lib/dashboard/tenant-unit-display";
import {
  NIK_LENGTH,
  PHONE_INPUT_MAX_LENGTH,
  getEmailValidationMessage,
  getNikValidationMessage,
  getPhoneValidationMessage,
  getTextValidationMessage,
  normalizePhoneNumber,
  normalizeTextInput,
  sanitizeEmailInput,
  sanitizeNikInput,
  sanitizePhoneInput,
} from "@/lib/form-validation";
import type { BackendUser, SessionUser } from "@/types/auth";
import BookingVersionBadge from "@/features/booking/shared/components/BookingVersionBadge";
import {
  BOOKING_V2_DURATION_OPTIONS,
  BOOKING_V2_STORAGE_KEY,
  isBookingV2DurationPreset,
  type BookingV2Draft,
} from "@/features/booking/v2/store/bookingV2Store";

const CURRENCY_FORMATTER = new Intl.NumberFormat("id-ID");
const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;
const ACCEPTED_FILE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
];
const DAYS_IN_MONTH_FOR_DAILY_RATE = 30;
const BSI_QRIS_IMAGE_URL =
  process.env.NEXT_PUBLIC_BSI_QRIS_IMAGE_URL?.trim() || "";

const RENT_DURATION_OPTIONS = BOOKING_V2_DURATION_OPTIONS;

type RentDurationValue = BookingV2Draft["durationPreset"];

const DAILY_DURATION_DAYS: Record<Extract<RentDurationValue, `${number}d`>, number> = {
  "1d": 1,
  "7d": 7,
  "14d": 14,
  "21d": 21,
};

const MONTHLY_DURATION_MONTHS: Record<Exclude<RentDurationValue, `${number}d` | "custom">, number> = {
  "1m": 1,
  "6m": 6,
  "12m": 12,
};

const PAYMENT_METHODS = [
  {
    value: "bank_bsi",
    label: "Transfer Bank BSI",
    description: "BSI : 7283652283",
    owner: "An Astri Kartika",
    icon: <Landmark size={16} />,
  },
  {
    value: "qris_bsi",
    label: "QRIS BSI",
    description: "Scan QRIS untuk melakukan pembayaran",
    owner: "Bank Syariah Indonesia (BSI)",
    icon: <QrCode size={16} />,
  },
] as const;

type PaymentMethodValue = (typeof PAYMENT_METHODS)[number]["value"];

const readBookingV2DraftForPayment = (): BookingV2Draft | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(BOOKING_V2_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as BookingV2Draft) : null;
  } catch {
    return null;
  }
};

type BasicProfileFormState = {
  fullName: string;
  email: string;
  phoneNumber: string;
  nik: string;
  dateOfBirth: string;
  domicileAddress: string;
};

type BasicProfileFormErrors = Partial<
  Record<keyof BasicProfileFormState, string>
>;

type ProfileMessage = {
  type: "success" | "error";
  text: string;
};

const getInitialBasicProfileForm = (): BasicProfileFormState => ({
  fullName: "",
  email: "",
  phoneNumber: "",
  nik: "",
  dateOfBirth: "",
  domicileAddress: "",
});

const toFormValue = (value?: string | number | null) => {
  return value?.toString().trim() || "";
};

const getDateValidationMessage = (value: string, label: string) => {
  if (!value.trim()) {
    return `${label} wajib diisi.`;
  }

  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return `${label} tidak valid.`;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (parsed > today) {
    return `${label} tidak boleh melebihi hari ini.`;
  }

  return null;
};

const getBasicProfileFormErrors = (
  form: BasicProfileFormState
): BasicProfileFormErrors => {
  const errors: BasicProfileFormErrors = {};

  const fullNameError = getTextValidationMessage(form.fullName, {
    label: "Nama lengkap",
    required: true,
  });
  if (fullNameError) {
    errors.fullName = fullNameError;
  }

  const emailError = getEmailValidationMessage(form.email, {
    label: "Email",
    required: true,
  });
  if (emailError) {
    errors.email = emailError;
  }

  const phoneError = getPhoneValidationMessage(form.phoneNumber, {
    label: "Nomor Telepon",
    required: true,
  });
  if (phoneError) {
    errors.phoneNumber = phoneError;
  }

  const nikError = getNikValidationMessage(form.nik, {
    label: "NIK / Nomor Identitas",
    required: true,
  });
  if (nikError) {
    errors.nik = nikError;
  }

  const dateOfBirthError = getDateValidationMessage(
    form.dateOfBirth,
    "Tanggal lahir"
  );
  if (dateOfBirthError) {
    errors.dateOfBirth = dateOfBirthError;
  }

  const domicileAddressError = getTextValidationMessage(
    form.domicileAddress,
    {
      label: "Alamat domisili",
      required: true,
      maxLength: 300,
    }
  );
  if (domicileAddressError) {
    errors.domicileAddress = domicileAddressError;
  }

  return errors;
};

const mapProfileToBasicForm = (
  profile: BackendUser,
  user?: SessionUser | null
): BasicProfileFormState => ({
  fullName: toFormValue(profile.full_name || user?.name),
  email: toFormValue(profile.email || user?.email),
  phoneNumber: sanitizePhoneInput(toFormValue(profile.phone_number)),
  nik: sanitizeNikInput(toFormValue(profile.nik)),
  dateOfBirth: toFormValue(profile.date_of_birth),
  domicileAddress: toFormValue(profile.domicile_address),
});

const formatCurrency = (value?: number | null) => {
  if (!value || value <= 0) {
    return "Hubungi administrator";
  }

  return `Rp ${CURRENCY_FORMATTER.format(value)}`;
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
    month: "long",
    year: "numeric",
  });
};

const toDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const resolveMediaUrl = (path?: string | null) => {
  const normalized = path?.trim();
  if (!normalized) {
    return "/bg.jpg";
  }

  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }

  const baseUrl = resolveApiBaseUrl();

  return `${baseUrl}${normalized.startsWith("/") ? normalized : `/${normalized}`}`;
};

const getPropertyHero = (property: PublicPropertySummary | null) => {
  if (!property) {
    return "/bg.jpg";
  }

  const primary = property.photo_url || property.photo_urls?.[0];
  return resolveMediaUrl(primary);
};

const resolveMonthlyPrice = (
  property: PublicPropertySummary | null,
  unit: PublicPropertyUnitSummary | null
) => {
  if (!property || !unit) {
    return 0;
  }

  return unit.price || property.price_min || property.price_max || 0;
};

const findPropertyById = async (propertyId: number) => {
  const perPage = 100;
  const firstPage = await getPublicProperties({
    page: 1,
    per_page: perPage,
    sort: "newest",
  });

  let found = firstPage.data.find((item) => item.id === propertyId) || null;
  const totalPages = firstPage.meta?.total_pages || 1;

  for (let page = 2; !found && page <= totalPages; page += 1) {
    const nextPage = await getPublicProperties({
      page,
      per_page: perPage,
      sort: "newest",
    });

    found = nextPage.data.find((item) => item.id === propertyId) || null;
  }

  return found;
};

const findUnitById = async (propertyId: number, unitId: number) => {
  const perPage = 100;
  const firstPage = await getPublicPropertyUnits(propertyId, {
    page: 1,
    per_page: perPage,
    sort: "price_asc",
  });

  let found = firstPage.data.find((item) => item.id === unitId) || null;
  const totalPages = firstPage.meta?.total_pages || 1;

  for (let page = 2; !found && page <= totalPages; page += 1) {
    const nextPage = await getPublicPropertyUnits(propertyId, {
      page,
      per_page: perPage,
      sort: "price_asc",
    });

    found = nextPage.data.find((item) => item.id === unitId) || null;
  }

  return found;
};

export default function TenantCreatePaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-5">
          <div className="h-48 animate-pulse rounded-3xl border border-slate-200 bg-white" />
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="h-96 animate-pulse rounded-2xl border border-slate-200 bg-white" />
            <div className="h-96 animate-pulse rounded-2xl border border-slate-200 bg-white" />
          </div>
        </div>
      }
    >
      <TenantCreatePaymentPageContent />
    </Suspense>
  );
}

function TenantCreatePaymentPageContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const propertyId = Number(searchParams.get("property_id"));
  const unitId = Number(searchParams.get("unit_id"));
  const isBookingV2Flow = searchParams.get("booking_version") === "v2";
  const minCheckInDate = useMemo(() => toDateInput(new Date()), []);
  const defaultCheckInDate = useMemo(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return toDateInput(tomorrow);
  }, []);

  const [property, setProperty] = useState<PublicPropertySummary | null>(null);
  const [unit, setUnit] = useState<PublicPropertyUnitSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  const [checkInDate, setCheckInDate] = useState(defaultCheckInDate);
  const [checkOutDate, setCheckOutDate] = useState("");
  const [rentDuration, setRentDuration] = useState<RentDurationValue>("1m");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodValue>(
    PAYMENT_METHODS[0].value
  );
  const [senderSource, setSenderSource] = useState("");
  const [transferProof, setTransferProof] = useState<File | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [tenantProfile, setTenantProfile] = useState<BackendUser | null>(null);
  const [basicProfileForm, setBasicProfileForm] =
    useState<BasicProfileFormState>(getInitialBasicProfileForm);
  const [basicProfileErrors, setBasicProfileErrors] =
    useState<BasicProfileFormErrors>({});
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<ProfileMessage | null>(
    null
  );

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<{
    invoiceId: string;
    status: string;
    dueDate: string | null;
  } | null>(null);

  useEffect(() => {
    if (!isBookingV2Flow) {
      return;
    }

    const draft = readBookingV2DraftForPayment();
    if (!draft) {
      return;
    }

    if (draft.propertyId && draft.propertyId !== propertyId) {
      return;
    }

    if (draft.unitId && draft.unitId !== unitId) {
      return;
    }

    if (draft.checkInDate) {
      setCheckInDate(draft.checkInDate);
    }

    if (draft.checkOutDate) {
      setCheckOutDate(draft.checkOutDate);
    }

    if (isBookingV2DurationPreset(draft.durationPreset)) {
      setRentDuration(draft.durationPreset);
    }
  }, [isBookingV2Flow, propertyId, unitId]);

  const selectedPaymentMethod = useMemo(() => {
    return PAYMENT_METHODS.find((item) => item.value === paymentMethod) || null;
  }, [paymentMethod]);
  const isQrisPayment = paymentMethod === "qris_bsi";

  const monthlyPrice = useMemo(() => {
    return resolveMonthlyPrice(property, unit);
  }, [property, unit]);
  const isCustomDuration = rentDuration === "custom";
  const isDailyRent = rentDuration.endsWith("d") || isCustomDuration;
  const isMonthlyDuration = rentDuration.endsWith("m");
  const durationDays = isDailyRent
    ? rentDuration === "custom"
      ? 0
      : DAILY_DURATION_DAYS[rentDuration as Extract<RentDurationValue, `${number}d`>]
    : 0;
  const durationMonths = isMonthlyDuration
    ? MONTHLY_DURATION_MONTHS[rentDuration as Exclude<RentDurationValue, `${number}d` | "custom">]
    : 1;
  const customDurationDays = useMemo(() => {
    if (!isCustomDuration || !checkInDate || !checkOutDate) {
      return 0;
    }

    const start = new Date(`${checkInDate}T00:00:00`);
    const end = new Date(`${checkOutDate}T00:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return 0;
    }

    const duration = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
    return duration > 0 ? duration : 0;
  }, [checkInDate, checkOutDate, isCustomDuration]);
  const calculatedEndDateInput = useMemo(() => {
    if (!checkInDate) {
      return "";
    }

    const parsed = new Date(`${checkInDate}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) {
      return "";
    }

    if (isCustomDuration) {
      return checkOutDate;
    }

    const endDate = new Date(parsed);
    if (isDailyRent) {
      endDate.setDate(endDate.getDate() + Math.max(1, durationDays) - 1);
    } else {
      endDate.setMonth(endDate.getMonth() + durationMonths);
      endDate.setDate(endDate.getDate() - 1);
    }

    return toDateInput(endDate);
  }, [checkInDate, checkOutDate, durationDays, durationMonths, isCustomDuration, isDailyRent]);
  const dailyPrice = useMemo(() => {
    if (!monthlyPrice || monthlyPrice <= 0) {
      return 0;
    }

    return Math.ceil(monthlyPrice / DAYS_IN_MONTH_FOR_DAILY_RATE);
  }, [monthlyPrice]);
  const bookingDurationValue = useMemo(() => {
    if (isDailyRent) {
      return Math.max(1, isCustomDuration ? customDurationDays : durationDays);
    }

    return Math.max(1, durationMonths);
  }, [customDurationDays, durationDays, durationMonths, isCustomDuration, isDailyRent]);
  const displayedBasePrice = isDailyRent ? dailyPrice : monthlyPrice;
  const displayedUnitName = useMemo(() => {
    return getTenantUnitDisplayName(unit);
  }, [unit]);
  const incompleteProfileFields = useMemo(() => {
    return tenantProfile ? getIncompleteTenantProfileFields(tenantProfile) : [];
  }, [tenantProfile]);
  const isBasicProfileComplete =
    Boolean(tenantProfile) && incompleteProfileFields.length === 0;

  const estimatedTotal = useMemo(() => {
    if (isDailyRent) {
      return dailyPrice * bookingDurationValue;
    }

    if (!monthlyPrice || bookingDurationValue <= 0) {
      return 0;
    }

    return monthlyPrice * bookingDurationValue;
  }, [bookingDurationValue, dailyPrice, isDailyRent, monthlyPrice]);

  const estimatedEndDate = useMemo(() => {
    return calculatedEndDateInput ? formatDate(calculatedEndDateInput) : "-";
  }, [calculatedEndDateInput]);

  useEffect(() => {
    let active = true;

    if (!Number.isFinite(propertyId) || propertyId <= 0) {
      setLoadingError("Properti belum dipilih. Silakan kembali ke detail properti.");
      setIsLoading(false);
      return () => {
        active = false;
      };
    }

    if (!Number.isFinite(unitId) || unitId <= 0) {
      setLoadingError("Unit belum dipilih. Klik tombol Pilih pada unit yang tersedia.");
      setIsLoading(false);
      return () => {
        active = false;
      };
    }

    const loadDetail = async () => {
      setIsLoading(true);
      setLoadingError(null);

      try {
        const [loadedProperty, loadedUnit] = await Promise.all([
          findPropertyById(propertyId),
          findUnitById(propertyId, unitId),
        ]);

        if (!active) {
          return;
        }

        if (!loadedProperty) {
          setProperty(null);
          setUnit(null);
          setLoadingError("Properti tidak ditemukan. Pastikan data masih aktif.");
          return;
        }

        if (!loadedUnit) {
          setProperty(loadedProperty);
          setUnit(null);
          setLoadingError(
            "Unit tidak ditemukan. Pilih ulang unit dari halaman detail properti."
          );
          return;
        }

        setProperty(loadedProperty);
        setUnit(loadedUnit);
      } catch (error) {
        if (!active) {
          return;
        }

        setProperty(null);
        setUnit(null);
        setLoadingError(
          getApiErrorMessage(
            error,
            "Gagal memuat data pembayaran. Silakan coba beberapa saat lagi."
          )
        );
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadDetail();

    return () => {
      active = false;
    };
  }, [propertyId, unitId]);

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      setIsLoadingProfile(true);
      setProfileMessage(null);

      try {
        const response = await getTenantProfile();
        if (!active) {
          return;
        }

        setTenantProfile(response.data);
        setBasicProfileForm(mapProfileToBasicForm(response.data, user));
        setBasicProfileErrors({});
      } catch (error) {
        if (!active) {
          return;
        }

        setTenantProfile(null);
        setBasicProfileForm({
          ...getInitialBasicProfileForm(),
          fullName: toFormValue(user?.name),
          email: toFormValue(user?.email),
        });
        setProfileMessage({
          type: "error",
          text: getApiErrorMessage(
            error,
            "Gagal memuat data diri penyewa. Silakan coba lagi."
          ),
        });
      } finally {
        if (active) {
          setIsLoadingProfile(false);
        }
      }
    };

    void loadProfile();

    return () => {
      active = false;
    };
  }, [user]);

  const updateBasicProfileField = (
    field: keyof BasicProfileFormState,
    value: string
  ) => {
    const nextValue =
      field === "phoneNumber"
        ? sanitizePhoneInput(value)
        : field === "nik"
          ? sanitizeNikInput(value)
          : field === "email"
            ? sanitizeEmailInput(value)
            : value;

    setBasicProfileForm((current) => ({
      ...current,
      [field]: nextValue,
    }));
    setBasicProfileErrors((current) => {
      if (!current[field]) {
        return current;
      }

      const remaining = { ...current };
      delete remaining[field];
      return remaining;
    });
    setProfileMessage(null);
    setSubmitError(null);
  };

  const saveBasicProfile = async (
    options: { showSuccessMessage?: boolean } = {}
  ) => {
    const { showSuccessMessage = true } = options;
    const nextErrors = getBasicProfileFormErrors(basicProfileForm);
    setBasicProfileErrors(nextErrors);

    const firstError = Object.values(nextErrors)[0];
    if (firstError) {
      if (showSuccessMessage) {
        setProfileMessage({ type: "error", text: firstError });
      }
      throw new Error(firstError);
    }

    const userId = tenantProfile?.id ?? user?.id;
    if (!userId) {
      const message = "Data akun penyewa belum siap. Silakan muat ulang halaman.";
      if (showSuccessMessage) {
        setProfileMessage({ type: "error", text: message });
      }
      throw new Error(message);
    }

    setIsSavingProfile(true);
    if (showSuccessMessage) {
      setProfileMessage(null);
    }

    try {
      const response = await updateTenantProfile({
        user_id: userId,
        full_name: normalizeTextInput(basicProfileForm.fullName),
        email: sanitizeEmailInput(basicProfileForm.email),
        phone_number: normalizePhoneNumber(basicProfileForm.phoneNumber),
        nik: sanitizeNikInput(basicProfileForm.nik),
        date_of_birth: basicProfileForm.dateOfBirth,
        domicile_address: normalizeTextInput(basicProfileForm.domicileAddress),
      });

      setTenantProfile(response.data);
      setBasicProfileForm(mapProfileToBasicForm(response.data, user));
      setBasicProfileErrors({});

      if (showSuccessMessage) {
        setProfileMessage({
          type: "success",
          text: response.message || "Data diri penyewa tersimpan.",
        });
      }

      return response.data;
    } catch (error) {
      const message = getApiErrorMessage(
        error,
        "Data diri penyewa gagal disimpan. Silakan cek kembali isian."
      );
      if (showSuccessMessage) {
        setProfileMessage({ type: "error", text: message });
      }
      throw new Error(message);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleProofChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setSubmitError(null);

    if (!file) {
      setTransferProof(null);
      return;
    }

    if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
      setTransferProof(null);
      event.target.value = "";
      setSubmitError("Format bukti pembayaran harus PDF, JPG, JPEG, atau PNG.");
      return;
    }

    if (file.size > MAX_UPLOAD_SIZE) {
      setTransferProof(null);
      event.target.value = "";
      setSubmitError("Ukuran file maksimal 5 MB.");
      return;
    }

    setTransferProof(file);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);

    if (!property || !unit) {
      setSubmitError("Data properti atau unit tidak tersedia.");
      return;
    }

    if (!checkInDate) {
      setSubmitError("Tanggal mulai sewa wajib dipilih.");
      return;
    }

    if (isCustomDuration && !checkOutDate) {
      setSubmitError("Tanggal keluar wajib diisi untuk durasi custom.");
      return;
    }

    if (isCustomDuration && customDurationDays <= 0) {
      setSubmitError("Tanggal keluar harus lebih besar atau sama dengan tanggal mulai.");
      return;
    }

    if (bookingDurationValue <= 0) {
      setSubmitError("Durasi sewa tidak valid.");
      return;
    }

    if (isLoadingProfile) {
      setSubmitError("Data diri penyewa sedang dimuat. Silakan tunggu sebentar.");
      return;
    }

    const nextProfileErrors = getBasicProfileFormErrors(basicProfileForm);
    setBasicProfileErrors(nextProfileErrors);
    const firstProfileError = Object.values(nextProfileErrors)[0];
    if (firstProfileError) {
      setSubmitError(firstProfileError);
      return;
    }

    if (isQrisPayment && !BSI_QRIS_IMAGE_URL) {
      setSubmitError(
        "QRIS BSI belum tersedia. Silakan gunakan Transfer Bank BSI."
      );
      return;
    }

    if (!transferProof) {
      setSubmitError("Unggah bukti pembayaran terlebih dahulu.");
      return;
    }

    if (!termsAccepted) {
      setSubmitError("Setujui syarat dan ketentuan sebelum melanjutkan.");
      return;
    }

    setIsSubmitting(true);
    try {
      await saveBasicProfile({ showSuccessMessage: false });

      const response = await createTenantBookingPayment({
        property_id: property.id,
        unit_id: unit.id,
        check_in_date: checkInDate,
        end_date: isDailyRent ? calculatedEndDateInput : undefined,
        duration_months: bookingDurationValue,
        duration_type: isDailyRent ? "daily" : "monthly",
        payment_method: paymentMethod,
        note: senderSource.trim(),
        terms_accepted: termsAccepted,
        transfer_proof: transferProof,
      });

      setSuccessData({
        invoiceId: response.data.invoice_id,
        status: response.data.status,
        dueDate: response.data.due_date || null,
      });
    } catch (error) {
      const missingProfileFields = getBasicProfileRequiredFields(error);
      if (missingProfileFields) {
        setSubmitError(
          missingProfileFields.length > 0
            ? `Lengkapi data diri penyewa: ${missingProfileFields.join(", ")}.`
            : "Lengkapi data diri penyewa pada Detail Informasi Sewa."
        );
        return;
      }

      setSubmitError(
        getApiErrorMessage(
          error,
          "Pengajuan pembayaran gagal dikirim. Silakan cek data dan coba lagi."
        )
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="h-48 animate-pulse rounded-3xl border border-slate-200 bg-white" />
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="h-96 animate-pulse rounded-2xl border border-slate-200 bg-white" />
          <div className="h-96 animate-pulse rounded-2xl border border-slate-200 bg-white" />
        </div>
      </div>
    );
  }

  if (loadingError || !property || !unit) {
    return (
      <section className="rounded-2xl border border-red-200 bg-red-50 p-6">
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-red-700">
          <CircleAlert size={16} />
          Data pembayaran belum siap
        </p>
        <p className="mt-2 text-sm text-red-700">
          {loadingError || "Unit tidak dapat diproses saat ini."}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/sewa"
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            <ArrowLeft size={14} />
            Kembali ke Halaman Sewa
          </Link>
          {Number.isFinite(propertyId) && propertyId > 0 ? (
            <Link
              href={`/sewa/${propertyId}`}
              className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
            >
              Lihat Detail Properti
            </Link>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-sky-700 via-blue-700 to-indigo-700 p-4 text-white shadow-sm sm:p-6">
        <div className="pointer-events-none absolute -left-10 top-0 h-40 w-40 rounded-full bg-white/15 blur-3xl" />
        <div className="pointer-events-none absolute -right-14 bottom-0 h-52 w-52 rounded-full bg-white/10 blur-3xl" />

        <div className="relative">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <Link
              href={`/sewa/${property.id}`}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/35 bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/20 sm:w-auto"
            >
              <ArrowLeft size={13} />
              Kembali ke Detail Properti
            </Link>
            <BookingVersionBadge
              version={isBookingV2Flow ? "Versi 2" : "Versi 1"}
              tone="light"
            />
          </div>
          <h1 className="mt-4 text-2xl font-semibold sm:text-3xl">Pembayaran Sewa</h1>
          <p className="mt-2 max-w-3xl text-sm text-white/90">
            Lengkapi informasi sewa, pilih kanal pembayaran, lalu unggah bukti
            transfer untuk diteruskan ke administrator.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <StepBadge
              icon={<CalendarClock size={15} />}
              label="1. Detail Informasi Sewa"
            />
            <StepBadge icon={<CreditCard size={15} />} label="2. Pilih Metode Bayar" />
            <StepBadge icon={<FileUp size={15} />} label="3. Unggah Bukti Pembayaran" />
          </div>
        </div>
      </section>

      {successData ? (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:p-6">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700">
            <CheckCircle2 size={16} />
            Pengajuan pembayaran berhasil dikirim
          </p>
          <p className="mt-2 text-sm text-emerald-800">
            Kode pemesanan: <span className="font-semibold">{successData.invoiceId}</span>
          </p>
          <p className="mt-1 text-sm text-emerald-800">
            Status saat ini:{" "}
            <span className="font-semibold">
              {successData.status === "waiting" ? "Menunggu Peninjauan Administrator" : successData.status}
            </span>
          </p>
          <p className="mt-1 text-sm text-emerald-800">
            Batas verifikasi: {formatDate(successData.dueDate)}
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Link
              href="/tenant/pembayaran"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Lihat Status Pembayaran
            </Link>
            <Link
              href={`/sewa/${property.id}`}
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
            >
              Kembali ke Detail Properti
            </Link>
          </div>
        </section>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]"
      >
        <div className="space-y-4 sm:space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <h2 className="text-lg font-semibold text-slate-900">
              Detail Informasi Sewa
            </h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <LabelField label="Tanggal Mulai Sewa">
                <input
                  type="date"
                  min={minCheckInDate}
                  value={checkInDate}
                  onChange={(event) => setCheckInDate(event.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-400"
                />
              </LabelField>

              <LabelField label="Durasi Sewa">
                <div className="relative">
                  <select
                    value={rentDuration}
                    onChange={(event) => {
                      const nextDuration = event.target.value as RentDurationValue;
                      setRentDuration(nextDuration);
                      if (nextDuration !== "custom") {
                        setCheckOutDate("");
                      }
                    }}
                    className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 pr-10 text-sm text-slate-700 outline-none transition focus:border-blue-400"
                  >
                    {RENT_DURATION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={16}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                </div>
              </LabelField>

              {isCustomDuration ? (
                <LabelField label="Tanggal Keluar">
                  <input
                    type="date"
                    min={checkInDate || minCheckInDate}
                    value={checkOutDate}
                    onChange={(event) => setCheckOutDate(event.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-400"
                  />
                </LabelField>
              ) : null}
            </div>

            <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Data Diri Penyewa
                  </h3>
                  <p className="mt-1 text-xs text-slate-600">
                    Data ini diperlukan untuk memproses booking dan sewa unit.
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    isBasicProfileComplete
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {isBasicProfileComplete ? "Data lengkap" : "Perlu dilengkapi"}
                </span>
              </div>

              {isLoadingProfile ? (
                <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-blue-100 bg-white px-3 py-2 text-xs text-blue-700">
                  <LoaderCircle size={14} className="animate-spin" />
                  Memuat data diri penyewa...
                </div>
              ) : (
                <>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <ProfileField
                      label="Nama Lengkap"
                      icon={<UserRound size={14} />}
                      error={basicProfileErrors.fullName}
                    >
                      <input
                        type="text"
                        value={basicProfileForm.fullName}
                        onChange={(event) =>
                          updateBasicProfileField("fullName", event.target.value)
                        }
                        placeholder="Nama sesuai identitas"
                        aria-invalid={Boolean(basicProfileErrors.fullName)}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-400"
                      />
                    </ProfileField>

                    <ProfileField
                      label="Email"
                      icon={<Mail size={14} />}
                      error={basicProfileErrors.email}
                    >
                      <input
                        type="email"
                        inputMode="email"
                        value={basicProfileForm.email}
                        onChange={(event) =>
                          updateBasicProfileField("email", event.target.value)
                        }
                        placeholder="nama@email.com"
                        aria-invalid={Boolean(basicProfileErrors.email)}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-400"
                      />
                    </ProfileField>

                    <ProfileField
                      label="Nomor Telepon"
                      icon={<Phone size={14} />}
                      error={basicProfileErrors.phoneNumber}
                    >
                      <input
                        type="tel"
                        inputMode="numeric"
                        maxLength={PHONE_INPUT_MAX_LENGTH}
                        value={basicProfileForm.phoneNumber}
                        onChange={(event) =>
                          updateBasicProfileField(
                            "phoneNumber",
                            event.target.value
                          )
                        }
                        placeholder="081234567890"
                        aria-invalid={Boolean(basicProfileErrors.phoneNumber)}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-400"
                      />
                    </ProfileField>

                    <ProfileField
                      label="NIK / Nomor Identitas"
                      icon={<IdCard size={14} />}
                      error={basicProfileErrors.nik}
                    >
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={NIK_LENGTH}
                        value={basicProfileForm.nik}
                        onChange={(event) =>
                          updateBasicProfileField("nik", event.target.value)
                        }
                        placeholder="16 digit nomor identitas"
                        aria-invalid={Boolean(basicProfileErrors.nik)}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-400"
                      />
                    </ProfileField>

                    <ProfileField
                      label="Tanggal Lahir"
                      icon={<CalendarClock size={14} />}
                      error={basicProfileErrors.dateOfBirth}
                    >
                      <input
                        type="date"
                        max={minCheckInDate}
                        value={basicProfileForm.dateOfBirth}
                        onChange={(event) =>
                          updateBasicProfileField(
                            "dateOfBirth",
                            event.target.value
                          )
                        }
                        aria-invalid={Boolean(basicProfileErrors.dateOfBirth)}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-400"
                      />
                    </ProfileField>

                    <ProfileField
                      label="Alamat Domisili"
                      icon={<MapPin size={14} />}
                      error={basicProfileErrors.domicileAddress}
                      className="md:col-span-2"
                    >
                      <textarea
                        rows={3}
                        value={basicProfileForm.domicileAddress}
                        onChange={(event) =>
                          updateBasicProfileField(
                            "domicileAddress",
                            event.target.value
                          )
                        }
                        placeholder="Alamat tempat tinggal saat ini"
                        aria-invalid={Boolean(
                          basicProfileErrors.domicileAddress
                        )}
                        className="min-h-24 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-400"
                      />
                    </ProfileField>
                  </div>

                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <button
                      type="button"
                      onClick={() => {
                        void saveBasicProfile().catch(() => {});
                      }}
                      disabled={isSavingProfile || isSubmitting}
                      className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-4 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                    >
                      {isSavingProfile ? (
                        <>
                          <LoaderCircle size={15} className="animate-spin" />
                          Menyimpan...
                        </>
                      ) : (
                        <>
                          <Save size={15} />
                          Simpan Data Diri
                        </>
                      )}
                    </button>

                    {profileMessage ? (
                      <p
                        className={`rounded-lg px-3 py-2 text-xs ${
                          profileMessage.type === "success"
                            ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border border-red-200 bg-red-50 text-red-700"
                        }`}
                      >
                        {profileMessage.text}
                      </p>
                    ) : null}
                  </div>
                </>
              )}
            </div>

            <LabelField
              label={
                isQrisPayment
                  ? "Sumber Pembayaran (Opsional)"
                  : "Asal Transfer (Opsional)"
              }
              className="mt-4"
            >
              <input
                type="text"
                value={senderSource}
                onChange={(event) => setSenderSource(event.target.value)}
                placeholder={
                  isQrisPayment
                    ? "Contoh: BSI Mobile / GoPay"
                    : "Contoh: BCA a.n. Budi Santoso"
                }
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-400"
              />
            </LabelField>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              <p className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                <Clock3 size={14} className="text-blue-700" />
                Estimasi akhir sewa: {estimatedEndDate}
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <h2 className="text-lg font-semibold text-slate-900">Metode Pembayaran</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {PAYMENT_METHODS.map((method) => {
                const isSelected = paymentMethod === method.value;
                return (
                  <button
                    key={method.value}
                    type="button"
                    onClick={() => setPaymentMethod(method.value)}
                    className={`rounded-xl border px-4 py-3 text-left transition ${
                      isSelected
                        ? "border-blue-300 bg-blue-50 shadow-sm"
                        : "border-slate-200 bg-white hover:border-blue-200"
                    }`}
                  >
                    <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                      {method.icon}
                      {method.label}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">{method.description}</p>
                    <p className="text-xs text-slate-500">{method.owner}</p>
                  </button>
                );
              })}
            </div>

            {selectedPaymentMethod ? (
              <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                <p className="text-xs font-semibold text-blue-800">
                  Tujuan Pembayaran
                </p>
                <p className="mt-1 text-sm text-blue-900">
                  {selectedPaymentMethod.label}
                </p>
                <p className="text-sm text-blue-900">{selectedPaymentMethod.description}</p>
                <p className="text-sm text-blue-900">{selectedPaymentMethod.owner}</p>

                {isQrisPayment ? (
                  <div className="mt-4 rounded-xl border border-blue-100 bg-white p-3">
                    {BSI_QRIS_IMAGE_URL ? (
                      <>
                        <div className="relative mx-auto aspect-square w-full max-w-64 overflow-hidden rounded-xl bg-white sm:max-w-72">
                          <Image
                            src={BSI_QRIS_IMAGE_URL}
                            alt="QRIS BSI KIKOST"
                            fill
                            unoptimized
                            sizes="288px"
                            className="object-contain"
                          />
                        </div>
                        <p className="mt-3 text-center text-xs leading-5 text-slate-600">
                          Scan menggunakan aplikasi mobile banking atau dompet
                          digital yang mendukung QRIS.
                        </p>
                      </>
                    ) : (
                      <div className="flex min-h-48 flex-col items-center justify-center rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/60 px-5 text-center sm:min-h-56">
                        <QrCode size={42} className="text-blue-300" />
                        <p className="mt-3 text-sm font-semibold text-blue-900">
                          Gambar QRIS BSI belum tersedia
                        </p>
                        <p className="mt-1 max-w-xs text-xs leading-5 text-blue-700">
                          Gunakan Transfer Bank BSI sementara waktu.
                        </p>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <h2 className="text-lg font-semibold text-slate-900">
              Unggah Bukti Pembayaran
            </h2>
            <label className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center transition hover:border-blue-300 hover:bg-blue-50 sm:py-8">
              <FileUp size={20} className="text-blue-700" />
              <span className="text-sm font-medium text-slate-700">
                Klik untuk memilih file bukti pembayaran
              </span>
              <span className="text-xs text-slate-500">
                Format: PDF / JPG / JPEG / PNG (maksimal 5 MB)
              </span>
              <input
                type="file"
                accept=".pdf,image/jpeg,image/jpg,image/png"
                onChange={handleProofChange}
                className="hidden"
              />
            </label>

            {transferProof ? (
              <p className="mt-3 inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                <CheckCircle2 size={14} />
                {transferProof.name}
              </p>
            ) : null}

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <label className="inline-flex items-start gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(event) => setTermsAccepted(event.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>
                  Saya menyetujui syarat dan ketentuan sewa, data pemesanan, serta
                  proses verifikasi pembayaran oleh administrator.
                </span>
              </label>
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="sticky top-20 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:top-24">
            <div className="relative h-40 sm:h-44">
              <SafeImage
                src={getPropertyHero(property)}
                alt={property.name}
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
              <p className="absolute bottom-3 left-3 right-3 line-clamp-2 text-sm font-semibold text-white">
                {property.name}
              </p>
            </div>

            <div className="space-y-3 p-4">
              <h3 className="text-sm font-semibold text-slate-900">Ringkasan Pemesanan</h3>

              <SummaryRow
                icon={<Building2 size={14} />}
                label="Unit"
                value={displayedUnitName}
              />
              <SummaryRow
                icon={<ReceiptText size={14} />}
                label={isDailyRent ? "Tarif Harian" : "Harga per bulan"}
                value={formatCurrency(displayedBasePrice)}
              />
              <SummaryRow
                icon={<CalendarClock size={14} />}
                label="Durasi"
                value={
                  isCustomDuration
                    ? "Custom"
                    : isDailyRent
                      ? `${bookingDurationValue} Hari`
                      : `${durationMonths} Bulan`
                }
              />
              <SummaryRow
                icon={<Clock3 size={14} />}
                label="Mulai sewa"
                value={formatDate(checkInDate)}
              />
              <SummaryRow
                icon={<CalendarDays size={14} />}
                label="Tanggal Keluar"
                value={estimatedEndDate}
              />

              <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
                <p className="text-xs text-blue-700">Estimasi total pembayaran</p>
                <p className="mt-1 text-lg font-semibold text-blue-900">
                  {formatCurrency(estimatedTotal)}
                </p>
              </div>

                <p className="inline-flex items-start gap-1.5 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                <ShieldCheck size={13} className="mt-0.5" />
                Pembayaran akan masuk ke admin untuk proses peninjauan.
              </p>

              {submitError ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {submitError}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-700 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <LoaderCircle size={16} className="animate-spin" />
                    Mengirim Pembayaran...
                  </>
                ) : (
                  <>
                    <CreditCard size={16} />
                    Kirim Bukti Pembayaran
                  </>
                )}
              </button>
            </div>
          </section>
        </aside>
      </form>
    </div>
  );
}

function StepBadge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="rounded-xl border border-white/30 bg-white/10 px-3 py-2 text-xs text-white/90 backdrop-blur-sm">
      <p className="inline-flex items-center gap-1.5">
        {icon}
        {label}
      </p>
    </div>
  );
}

function LabelField({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function ProfileField({
  label,
  icon,
  error,
  children,
  className = "",
}: {
  label: string;
  icon: React.ReactNode;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 inline-flex items-center gap-1.5 text-sm font-medium text-slate-700">
        <span className="text-blue-700">{icon}</span>
        {label}
      </span>
      {children}
      {error ? <span className="mt-1 block text-xs text-red-600">{error}</span> : null}
    </label>
  );
}

function SummaryRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 sm:flex-row sm:items-start sm:justify-between">
      <p className="inline-flex items-center gap-1.5 text-xs text-slate-600">
        {icon}
        {label}
      </p>
      <p className="text-left text-xs font-semibold text-slate-800 sm:text-right">{value}</p>
    </div>
  );
}
