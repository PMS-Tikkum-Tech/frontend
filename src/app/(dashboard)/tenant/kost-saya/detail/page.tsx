"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  CalendarClock,
  CheckCircle2,
  Home,
  MapPin,
  ReceiptText,
  Users,
  Wrench,
} from "lucide-react";
import {
  getApiErrorMessage,
  getTenantCurrentStay,
  getTenantMaintenanceRequests,
  getTenantPayments,
  getTenantStayDetail,
  getTenantStays,
  type PublicPropertySummary,
  type PublicPropertyUnitSummary,
  type TenantCurrentStay,
  type TenantPayment,
  type TenantStaySummary,
} from "@/lib/dashboard/tenant.api";
import { resolveApiBaseUrl } from "@/lib/api-base-url";
import { formatFilterLabel } from "@/lib/filter-options";
import DeadlineCountdown from "@/components/ui/DeadlineCountdown";
import { getTenantUnitDisplayName } from "@/lib/dashboard/tenant-unit-display";
import { formatDueDate, isDueDateReached } from "@/lib/due-date";

const CURRENCY_FORMATTER = new Intl.NumberFormat("id-ID");

const paymentStatusMap: Record<
  TenantPayment["status"],
  {
    label: string;
    className: string;
  }
> = {
  waiting: {
    label: "Menunggu Pembayaran",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  paid: {
    label: "Lunas",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  overdue: {
    label: "Terlambat",
    className: "border-red-200 bg-red-50 text-red-700",
  },
  cancelled: {
    label: "Dibatalkan",
    className: "border-slate-200 bg-slate-100 text-slate-700",
  },
};

const formatCurrency = (value?: number | null) => {
  if (!value || value <= 0) {
    return "-";
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
    month: "short",
    year: "numeric",
  });
};

const getTimestamp = (value?: string | null) => {
  if (!value) {
    return 0;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 0;
  }

  return date.getTime();
};

const getPaymentDisplayStatus = (
  payment: Pick<TenantPayment, "status" | "due_date" | "booking_status">
): TenantPayment["status"] => {
  if (payment.status === "overdue") {
    return "cancelled";
  }

  const canAutoCancelByDueDate =
    !payment.booking_status || payment.booking_status === "awaiting_payment";

  if (
    canAutoCancelByDueDate &&
    payment.status === "waiting" &&
    isDueDateReached(payment.due_date)
  ) {
    return "cancelled";
  }

  return payment.status;
};

const resolveAssetUrl = (value?: string | null) => {
  const normalized = value?.trim();
  if (!normalized) {
    return "/bg-1200.webp";
  }

  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }

  const baseUrl = resolveApiBaseUrl();

  return `${baseUrl}${normalized.startsWith("/") ? normalized : `/${normalized}`}`;
};

const mapCurrentStayToSummary = (
  stay: TenantCurrentStay | null
): TenantStaySummary | null => {
  if (!stay?.booking_id) {
    return null;
  }

  return {
    booking_id: stay.booking_id,
    booking_code: stay.booking_code || null,
    occupancy_status: stay.occupancy_status || null,
    status_label: stay.status_label || null,
    property_name: stay.property?.name || null,
    unit_name: stay.unit?.name || null,
    unit_number: stay.unit?.unit_number ?? stay.unit?.room_number ?? stay.unit?.number ?? null,
    room_number: stay.unit?.room_number ?? null,
    building_name: stay.unit?.building_name || stay.unit?.block_name || null,
    block_name: stay.unit?.block_name || stay.unit?.building_name || null,
    monthly_rent_amount:
      stay.monthly_rent_amount ?? stay.unit?.monthly_rent_amount ?? null,
    start_date: stay.start_date || null,
    end_date: stay.end_date || null,
    duration_months: stay.duration_months ?? null,
    roomphoto_urls: (stay.unit?.roomphoto_urls || []).map((path) => {
      return resolveAssetUrl(path);
    }),
    transfer_proof_url: stay.transfer_proof_url || null,
    can_report_maintenance: true,
    can_submit_payment: stay.lease?.payment_status !== "paid",
  };
};

const mapCurrentStayProperty = (
  property: TenantCurrentStay["property"]
): PublicPropertySummary | null => {
  if (!property?.id) {
    return null;
  }

  return {
    id: property.id,
    name: property.name || `Properti #${property.id}`,
    address: property.address || null,
    property_type: property.property_type || null,
    condition: property.condition || null,
    facilities: [],
    photo_url: null,
    photo_urls: [],
    video_urls: [],
    video_url: null,
    video_360_url: null,
    photo_360_url: null,
  };
};

const mapCurrentStayUnit = (
  unit: TenantCurrentStay["unit"]
): PublicPropertyUnitSummary | null => {
  if (!unit?.id) {
    return null;
  }

  const photoUrls = Array.from(new Set(unit.roomphoto_urls || []));

  return {
    id: unit.id,
    name: unit.name || `Unit ${unit.id}`,
    unit_number: unit.unit_number ?? unit.room_number ?? unit.number ?? null,
    room_number: unit.room_number ?? null,
    number: unit.number ?? null,
    building_name: unit.building_name || unit.block_name || null,
    block_name: unit.block_name || unit.building_name || null,
    unit_type: unit.unit_type || null,
    status: unit.status || null,
    people_allowed: unit.people_allowed ?? null,
    price: unit.monthly_rent_amount ?? null,
    photo_url: photoUrls[0] || null,
    photo_urls: photoUrls,
  };
};

export default function TenantKostDetailPage() {
  return (
    <Suspense fallback={<DetailPageLoadingState />}>
      <TenantKostDetailContent />
    </Suspense>
  );
}

function TenantKostDetailContent() {
  const searchParams = useSearchParams();
  const bookingIdParam = searchParams.get("booking_id");
  const [payments, setPayments] = useState<TenantPayment[]>([]);
  const [stays, setStays] = useState<TenantStaySummary[]>([]);
  const [currentStay, setCurrentStay] = useState<TenantCurrentStay | null>(null);
  const [property, setProperty] = useState<PublicPropertySummary | null>(null);
  const [unit, setUnit] = useState<PublicPropertyUnitSummary | null>(null);
  const [activeMaintenanceCount, setActiveMaintenanceCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [staysResponse, currentStayResponse, paymentsResponse, maintenanceResponse] =
          await Promise.all([
            getTenantStays({ page: 1, per_page: 100, tab: "active" }),
          getTenantCurrentStay(),
          getTenantPayments({ page: 1, per_page: 100, sort: "due_date" }),
          getTenantMaintenanceRequests({ page: 1, per_page: 100 }),
          ]);

        if (!active) {
          return;
        }

        const fallbackStaySummary = mapCurrentStayToSummary(currentStayResponse.data);
        const activeStays =
          staysResponse.data.length > 0
            ? staysResponse.data
            : fallbackStaySummary
              ? [fallbackStaySummary]
              : [];
        const parsedBookingId = bookingIdParam ? Number(bookingIdParam) : NaN;
        const selectedBookingId = Number.isFinite(parsedBookingId)
          ? parsedBookingId
          : activeStays[0]?.booking_id || currentStayResponse.data?.booking_id || null;

        const selectedStayResponse =
          selectedBookingId != null
            ? await getTenantStayDetail(selectedBookingId).catch(() => {
                return currentStayResponse;
              })
            : currentStayResponse;

        const sortedPayments = [...paymentsResponse.data].sort((a, b) => {
          const aDate = getTimestamp(a.due_date || a.created_at);
          const bDate = getTimestamp(b.due_date || b.created_at);
          return bDate - aDate;
        });
        const resolvedCurrentStay = selectedStayResponse.data?.booking_id
          ? selectedStayResponse.data
          : null;

        setStays(activeStays);
        setPayments(sortedPayments);
        setCurrentStay(resolvedCurrentStay);
        setProperty(mapCurrentStayProperty(resolvedCurrentStay?.property || null));
        setUnit(mapCurrentStayUnit(resolvedCurrentStay?.unit || null));

        const maintenanceActive = maintenanceResponse.data.filter((item) => {
          return (
            item.status !== "completed" &&
            item.status !== "cancelled" &&
            item.property.id === resolvedCurrentStay?.property?.id &&
            item.unit.id === resolvedCurrentStay?.unit?.id
          );
        }).length;
        setActiveMaintenanceCount(maintenanceActive);

        if (!resolvedCurrentStay && sortedPayments.length === 0) {
          return;
        }
      } catch (loadError) {
        if (!active) {
          return;
        }

        setError(
          getApiErrorMessage(
            loadError,
            "Detail kost gagal dimuat. Silakan coba lagi."
          )
        );
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [bookingIdParam, refreshKey]);

  const stayPayments = useMemo(() => {
    if (!currentStay?.booking_id) {
      return [] as TenantPayment[];
    }

    return payments.filter((payment) => payment.id === currentStay.booking_id);
  }, [currentStay?.booking_id, payments]);

  const latestPayment = stayPayments.sort((a, b) => {
    const aDate = getTimestamp(a.due_date || a.created_at);
    const bDate = getTimestamp(b.due_date || b.created_at);
    return bDate - aDate;
  })[0] || null;
  const displayedPropertyName =
    property?.name || currentStay?.property?.name || latestPayment?.property.name || "-";
  const displayedUnitName =
    unit
      ? getTenantUnitDisplayName(unit)
      : currentStay?.unit
        ? getTenantUnitDisplayName(currentStay.unit)
        : latestPayment?.unit
          ? getTenantUnitDisplayName(latestPayment.unit)
          : "-";
  const displayStatus = latestPayment
    ? getPaymentDisplayStatus(latestPayment)
    : "paid";
  const statusBadge = latestPayment
    ? paymentStatusMap[displayStatus]
    : currentStay?.status_label
      ? {
          label: currentStay.status_label,
          className: "border-sky-200 bg-sky-50 text-sky-700",
        }
      : {
          label: "Status Hunian",
          className: "border-slate-200 bg-slate-100 text-slate-700",
        };

  const galleryImages = useMemo(() => {
    const candidates = [
      property?.photo_url,
      ...(property?.photo_urls || []),
      unit?.photo_url,
      ...(unit?.photo_urls || []),
    ]
      .map((item) => item?.trim())
      .filter((item): item is string => Boolean(item));

    return Array.from(new Set(candidates)).slice(0, 8);
  }, [property, unit]);

  const heroImage = resolveAssetUrl(galleryImages[0] || property?.photo_url);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-green-600 sm:text-3xl">Detail Kost</h1>
          <p className="mt-1 text-slate-600">
            Informasi lengkap hunian kamu saat ini.
          </p>
        </div>

        <Link
          href="/tenant/kost-saya"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-green-300 hover:text-green-700 sm:w-auto"
        >
          <ArrowLeft size={16} />
          Kembali ke Kost Saya
        </Link>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border bg-white p-4 text-sm text-slate-500 sm:p-8">
          Memuat detail kost...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 sm:p-6">
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={() => setRefreshKey((value) => value + 1)}
            className="mt-3 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm text-red-700"
          >
            Coba Lagi
          </button>
        </div>
      ) : !currentStay?.booking_id && !latestPayment ? (
        <div className="rounded-2xl border bg-white p-4 text-center sm:p-10">
          <h2 className="text-lg font-semibold text-green-600 sm:text-xl">
            Belum Ada Data Hunian
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-slate-600">
            Setelah kamu memilih unit dan melakukan pembayaran, detail kost akan
            muncul di halaman ini.
          </p>
          <Link
            href="/sewa"
            className="mt-6 inline-flex w-full justify-center rounded-xl bg-green-600 px-6 py-2 font-medium text-white hover:bg-green-700 sm:w-auto"
          >
            Cari Kost
          </Link>
        </div>
      ) : (
        <>
          {stays.length > 1 ? (
            <section className="rounded-2xl border bg-white p-4 shadow-sm sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-slate-800">
                    Pilih Hunian
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Tenant ini memiliki beberapa unit aktif. Pilih unit yang ingin dilihat.
                  </p>
                </div>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
                  {stays.length} unit aktif
                </span>
              </div>

              <div className="mt-4 flex overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none]">
                <div className="flex w-max gap-2">
                {stays.map((stay) => {
                  const isActive = stay.booking_id === currentStay?.booking_id;

                  return (
                    <Link
                      key={stay.booking_id}
                      href={`/tenant/kost-saya/detail?booking_id=${stay.booking_id}`}
                      className={`shrink-0 whitespace-nowrap rounded-xl border px-3 py-2 text-sm font-medium transition ${
                        isActive
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:text-emerald-700"
                      }`}
                    >
                      {stay.property_name || "-"} •{" "}
                      {getTenantUnitDisplayName({
                        name: stay.unit_name,
                        unit_name: stay.unit_name,
                        unit_number: stay.unit_number,
                        room_number: stay.room_number,
                        building_name: stay.building_name,
                        block_name: stay.block_name,
                      })}
                    </Link>
                  );
                })}
                </div>
              </div>
            </section>
          ) : null}

          <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-900 p-4 text-white shadow-sm sm:p-6">
            <Image
              src={heroImage}
              alt={displayedPropertyName || "Detail kost"}
              fill
              className="object-cover opacity-35"
              sizes="100vw"
              unoptimized
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/80 to-slate-900/30" />

            <div className="relative z-10 space-y-3">
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${statusBadge.className}`}
              >
                {statusBadge.label}
              </span>
              <h2 className="text-xl font-semibold sm:text-2xl">
                {displayedPropertyName}
              </h2>
              <p className="text-sm text-slate-200">{displayedUnitName}</p>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              icon={<ReceiptText size={16} />}
              label="Tagihan Terakhir"
              value={formatCurrency(latestPayment?.amount ?? currentStay?.monthly_rent_amount)}
              helper={
                latestPayment?.invoice_id
                  ? `Faktur #${latestPayment.invoice_id}`
                  : currentStay?.booking_code
                    ? `Pemesanan #${currentStay.booking_code}`
                    : "Belum ada faktur"
              }
            />
            <SummaryCard
              icon={<CalendarClock size={16} />}
              label="Batas Pembayaran"
              value={
                latestPayment?.due_date
                  ? formatDueDate(latestPayment.due_date)
                  : formatDate(currentStay?.end_date)
              }
              helper={
                latestPayment
                  ? getPaymentDisplayStatus(latestPayment) === "paid"
                    ? "Sudah dibayar"
                    : (
                      <DeadlineCountdown
                        value={latestPayment.due_date}
                        variant="text"
                      />
                    )
                  : currentStay?.end_date
                    ? "Akhir periode hunian saat ini"
                    : "Tanggal belum tersedia"
              }
            />
            <SummaryCard
              icon={<Wrench size={16} />}
              label="Perawatan Aktif"
              value={`${activeMaintenanceCount} laporan`}
              helper={activeMaintenanceCount > 0 ? "Sedang diproses" : "Tidak ada laporan"}
            />
            <SummaryCard
              icon={<CheckCircle2 size={16} />}
              label="Status"
              value={latestPayment ? paymentStatusMap[displayStatus].label : currentStay?.status_label || "-"}
              helper={`Diperbarui ${formatDate(currentStay?.updated_at || latestPayment?.updated_at)}`}
            />
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border bg-white p-4 shadow-sm sm:p-5">
              <h3 className="text-base font-semibold text-slate-800">Informasi Kost</h3>
              <div className="mt-4 space-y-3 text-sm text-slate-700">
                <DetailRow
                  icon={<Building2 size={14} />}
                  label="Nama Kost"
                  value={displayedPropertyName}
                />
                <DetailRow
                  icon={<MapPin size={14} />}
                  label="Alamat"
                  value={property?.address || currentStay?.property?.address || "-"}
                />
                <DetailRow
                  icon={<Home size={14} />}
                  label="Tipe Kost"
                  value={property?.property_type || currentStay?.property?.property_type || "-"}
                />
                <DetailRow
                  icon={<CheckCircle2 size={14} />}
                  label="Kondisi"
                  value={property?.condition || currentStay?.property?.condition || "-"}
                />
              </div>
            </div>

            <div className="rounded-2xl border bg-white p-4 shadow-sm sm:p-5">
              <h3 className="text-base font-semibold text-slate-800">Informasi Unit</h3>
              <div className="mt-4 space-y-3 text-sm text-slate-700">
                <DetailRow
                  icon={<Home size={14} />}
                  label="Nama Unit"
                  value={displayedUnitName}
                />
                <DetailRow
                  icon={<Building2 size={14} />}
                  label="Tipe Unit"
                  value={unit?.unit_type || currentStay?.unit?.unit_type || "-"}
                />
                <DetailRow
                  icon={<Users size={14} />}
                  label="Kapasitas"
                  value={
                    (unit?.people_allowed || currentStay?.unit?.people_allowed || 0) > 0
                      ? `${unit?.people_allowed || currentStay?.unit?.people_allowed} orang`
                      : "-"
                  }
                />
                <DetailRow
                  icon={<ReceiptText size={14} />}
                  label="Harga per Bulan"
                  value={formatCurrency(
                    unit?.price ||
                      currentStay?.unit?.monthly_rent_amount ||
                      latestPayment?.amount ||
                      currentStay?.monthly_rent_amount
                  )}
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border bg-white p-4 shadow-sm sm:p-5">
            <h3 className="text-base font-semibold text-slate-800">Fasilitas</h3>
            <div className="mt-4 flex flex-wrap gap-2">
              {(property?.facilities || []).length > 0 ? (
                (property?.facilities || []).map((facility) => (
                  <span
                    key={facility}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700"
                  >
                    {formatFilterLabel(facility)}
                  </span>
                ))
              ) : (
                <p className="text-sm text-slate-500">
                  Data fasilitas belum tersedia untuk unit ini.
                </p>
              )}
            </div>
          </section>

          {galleryImages.length > 0 ? (
            <section className="rounded-2xl border bg-white p-4 shadow-sm sm:p-5">
              <h3 className="text-base font-semibold text-slate-800">Galeri Kost</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {galleryImages.map((imagePath) => (
                  <div
                    key={imagePath}
                    className="relative aspect-[4/3] overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
                  >
                    <Image
                      src={resolveAssetUrl(imagePath)}
                      alt="Galeri kost"
                      fill
                      className="object-cover"
                      sizes="(max-width: 1024px) 50vw, 25vw"
                      unoptimized
                    />
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}

function DetailPageLoadingState() {
  return (
      <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-green-600 sm:text-3xl">Detail Kost</h1>
          <p className="mt-1 text-slate-600">
            Informasi lengkap hunian kamu saat ini.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-4 text-sm text-slate-500 sm:p-8">
        Memuat detail kost...
      </div>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  helper,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  helper: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-green-50 text-green-700">
        {icon}
      </div>
      <p className="mt-3 text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-800 sm:text-base">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{helper}</p>
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-slate-100 bg-slate-50 p-3 sm:flex-row sm:items-start sm:gap-3">
      <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-md bg-white text-slate-500">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="mt-0.5 text-sm font-medium text-slate-800">{value}</p>
      </div>
    </div>
  );
}
