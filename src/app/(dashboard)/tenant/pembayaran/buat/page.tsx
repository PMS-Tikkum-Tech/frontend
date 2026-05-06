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
  ReceiptText,
  Save,
  ShieldCheck,
  UserRound,
  WalletCards,
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

const CURRENCY_FORMATTER = new Intl.NumberFormat("id-ID");
const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;
const ACCEPTED_FILE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
];
const DAYS_IN_MONTH_FOR_DAILY_RATE = 30;

const RENT_DURATION_OPTIONS = [
  { value: "daily", label: "1 Hari" },
  { value: "6", label: "6 bulan" },
  { value: "12", label: "12 bulan" },
] as const;

type RentDurationValue = (typeof RENT_DURATION_OPTIONS)[number]["value"];

const PAYMENT_METHODS = [
  {
    value: "bank_bca",
    label: "Transfer Bank BCA",
    description: "No. Rekening 1234567890",
    owner: "a.n. PT Kyra Stay Indonesia",
    icon: <Landmark size={16} />,
  },
  {
    value: "bank_mandiri",
    label: "Transfer Bank Mandiri",
    description: "No. Rekening 9876543210",
    owner: "a.n. PT Kyra Stay Indonesia",
    icon: <Landmark size={16} />,
  },
  {
    value: "ewallet_gopay",
    label: "GoPay",
    description: "Nomor 0812-0000-0000",
    owner: "a.n. Kyra Stay",
    icon: <WalletCards size={16} />,
  },
  {
    value: "ewallet_ovo",
    label: "OVO",
    description: "Nomor 0813-0000-0000",
    owner: "a.n. Kyra Stay",
    icon: <WalletCards size={16} />,
  },
] as const;

type PaymentMethodValue = (typeof PAYMENT_METHODS)[number]["value"];

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
    return "/bg-1200.webp";
  }

  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }

  const baseUrl = resolveApiBaseUrl();

  return `${baseUrl}${normalized.startsWith("/") ? normalized : `/${normalized}`}`;
};

const getPropertyHero = (property: PublicPropertySummary | null) => {
  if (!property) {
    return "/bg-1200.webp";
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
  const [rentDuration, setRentDuration] = useState<RentDurationValue>("6");
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

  const selectedPaymentMethod = useMemo(() => {
    return PAYMENT_METHODS.find((item) => item.value === paymentMethod) || null;
  }, [paymentMethod]);

  const monthlyPrice = useMemo(() => {
    return resolveMonthlyPrice(property, unit);
  }, [property, unit]);
  const isDailyRent = rentDuration === "daily";
  const durationMonths = isDailyRent ? 1 : Number(rentDuration);
  const dailyPrice = useMemo(() => {
    if (!monthlyPrice || monthlyPrice <= 0) {
      return 0;
    }

    return Math.ceil(monthlyPrice / DAYS_IN_MONTH_FOR_DAILY_RATE);
  }, [monthlyPrice]);
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
      return dailyPrice;
    }

    if (!monthlyPrice || durationMonths <= 0) {
      return 0;
    }

    return monthlyPrice * durationMonths;
  }, [dailyPrice, durationMonths, isDailyRent, monthlyPrice]);

  const estimatedEndDate = useMemo(() => {
    if (!checkInDate) {
      return "-";
    }

    const parsed = new Date(`${checkInDate}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) {
      return "-";
    }

    if (isDailyRent) {
      return formatDate(parsed.toISOString());
    }

    const endDate = new Date(parsed);
    endDate.setMonth(endDate.getMonth() + durationMonths);
    endDate.setDate(endDate.getDate() - 1);

    return formatDate(endDate.toISOString());
  }, [checkInDate, durationMonths, isDailyRent]);

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
      setSubmitError("Format bukti transfer harus PDF, JPG, JPEG, atau PNG.");
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

    if (durationMonths <= 0) {
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

    if (!transferProof) {
      setSubmitError("Unggah bukti transfer terlebih dahulu.");
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
        duration_months: durationMonths,
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
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-sky-700 via-blue-700 to-indigo-700 p-6 text-white shadow-sm">
        <div className="pointer-events-none absolute -left-10 top-0 h-40 w-40 rounded-full bg-white/15 blur-3xl" />
        <div className="pointer-events-none absolute -right-14 bottom-0 h-52 w-52 rounded-full bg-white/10 blur-3xl" />

        <div className="relative">
          <Link
            href={`/sewa/${property.id}`}
            className="inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/20"
          >
            <ArrowLeft size={13} />
            Kembali ke Detail Properti
          </Link>
          <h1 className="mt-4 text-3xl font-semibold">Pembayaran Sewa</h1>
          <p className="mt-2 max-w-3xl text-sm text-white/90">
            Lengkapi informasi sewa, pilih kanal pembayaran, lalu unggah bukti
            transfer untuk diteruskan ke administrator.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <StepBadge
              icon={<CalendarClock size={15} />}
              label="1. Detail Informasi Sewa"
            />
            <StepBadge icon={<CreditCard size={15} />} label="2. Pilih Metode Bayar" />
            <StepBadge icon={<FileUp size={15} />} label="3. Unggah Bukti Transfer" />
          </div>
        </div>
      </section>

      {successData ? (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
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
          <div className="mt-4 flex flex-wrap gap-2">
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
        className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]"
      >
        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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
                    onChange={(event) =>
                      setRentDuration(event.target.value as RentDurationValue)
                    }
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
            </div>

            <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
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

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        void saveBasicProfile().catch(() => {});
                      }}
                      disabled={isSavingProfile || isSubmitting}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-4 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
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

            <LabelField label="Asal Transfer (Opsional)" className="mt-4">
              <input
                type="text"
                value={senderSource}
                onChange={(event) => setSenderSource(event.target.value)}
                placeholder="Contoh: BCA a.n. Budi Santoso"
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

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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
              </div>
            ) : null}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Unggah Bukti Transfer
            </h2>
            <label className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center transition hover:border-blue-300 hover:bg-blue-50">
              <FileUp size={20} className="text-blue-700" />
              <span className="text-sm font-medium text-slate-700">
                Klik untuk memilih file bukti transfer
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
          <section className="sticky top-24 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="relative h-44">
              <Image
                src={getPropertyHero(property)}
                alt={property.name}
                fill
                unoptimized
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
                value={isDailyRent ? "1 Hari" : `${durationMonths} bulan`}
              />
              <SummaryRow
                icon={<Clock3 size={14} />}
                label="Mulai sewa"
                value={formatDate(checkInDate)}
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
    <div className="flex items-start justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="inline-flex items-center gap-1.5 text-xs text-slate-600">
        {icon}
        {label}
      </p>
      <p className="text-right text-xs font-semibold text-slate-800">{value}</p>
    </div>
  );
}
