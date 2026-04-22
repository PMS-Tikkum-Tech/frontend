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
  Landmark,
  LoaderCircle,
  ReceiptText,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import {
  createTenantBookingPayment,
  getApiErrorMessage,
  getPublicProperties,
  getPublicPropertyUnits,
  type PublicPropertySummary,
  type PublicPropertyUnitSummary,
} from "@/lib/dashboard/tenant.api";

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

  const baseUrl =
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
    "http://127.0.0.1:3001";

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
                value={unit.name || `Unit ${unit.id}`}
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
