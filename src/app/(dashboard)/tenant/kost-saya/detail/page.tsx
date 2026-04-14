"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
  getPublicProperties,
  getPublicPropertyUnits,
  getTenantMaintenanceRequests,
  getTenantPayments,
  type PublicPropertySummary,
  type PublicPropertyUnitSummary,
  type TenantPayment,
} from "@/lib/dashboard/tenant.api";

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

const resolveAssetUrl = (value?: string | null) => {
  const normalized = value?.trim();
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

export default function TenantKostDetailPage() {
  const [payments, setPayments] = useState<TenantPayment[]>([]);
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
        const [paymentsResponse, maintenanceResponse] = await Promise.all([
          getTenantPayments({ page: 1, per_page: 100, sort: "due_date" }),
          getTenantMaintenanceRequests({ page: 1, per_page: 100 }),
        ]);

        if (!active) {
          return;
        }

        const sortedPayments = [...paymentsResponse.data].sort((a, b) => {
          const aDate = getTimestamp(a.due_date || a.created_at);
          const bDate = getTimestamp(b.due_date || b.created_at);
          return bDate - aDate;
        });
        setPayments(sortedPayments);

        const maintenanceActive = maintenanceResponse.data.filter((item) => {
          return item.status !== "completed" && item.status !== "cancelled";
        }).length;
        setActiveMaintenanceCount(maintenanceActive);

        const latestPayment = sortedPayments[0];
        if (!latestPayment) {
          setProperty(null);
          setUnit(null);
          return;
        }

        try {
          const propertyDetail =
            latestPayment.property.id > 0
              ? await findPropertyById(latestPayment.property.id)
              : null;
          if (!active) {
            return;
          }
          setProperty(propertyDetail);

          if (propertyDetail && latestPayment.unit.id > 0) {
            const unitDetail = await findUnitById(propertyDetail.id, latestPayment.unit.id);
            if (!active) {
              return;
            }
            setUnit(unitDetail);
          } else {
            setUnit(null);
          }
        } catch {
          if (!active) {
            return;
          }

          setProperty(null);
          setUnit(null);
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
  }, [refreshKey]);

  const latestPayment = payments[0] || null;

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-green-600">Detail Kost</h1>
          <p className="mt-1 text-slate-600">
            Informasi lengkap hunian kamu saat ini.
          </p>
        </div>

        <Link
          href="/tenant/kost-saya"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-green-300 hover:text-green-700"
        >
          <ArrowLeft size={16} />
          Kembali ke Kost Saya
        </Link>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border bg-white p-8 text-sm text-slate-500">
          Memuat detail kost...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={() => setRefreshKey((value) => value + 1)}
            className="mt-3 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm text-red-700"
          >
            Coba Lagi
          </button>
        </div>
      ) : !latestPayment ? (
        <div className="rounded-2xl border bg-white p-10 text-center">
          <h2 className="text-xl font-semibold text-green-600">
            Belum Ada Data Hunian
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-slate-600">
            Setelah kamu memilih unit dan melakukan pembayaran, detail kost akan
            muncul di halaman ini.
          </p>
          <Link
            href="/sewa"
            className="mt-6 inline-flex rounded-xl bg-green-600 px-6 py-2 font-medium text-white hover:bg-green-700"
          >
            Cari Kost
          </Link>
        </div>
      ) : (
        <>
          <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-900 p-6 text-white shadow-sm">
            <Image
              src={heroImage}
              alt={latestPayment.property.name || "Detail kost"}
              fill
              className="object-cover opacity-35"
              sizes="100vw"
              unoptimized
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/80 to-slate-900/30" />

            <div className="relative z-10 space-y-3">
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${paymentStatusMap[latestPayment.status].className}`}
              >
                {paymentStatusMap[latestPayment.status].label}
              </span>
              <h2 className="text-2xl font-semibold">
                {latestPayment.property.name || "-"}
              </h2>
              <p className="text-sm text-slate-200">{latestPayment.unit.name || "-"}</p>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              icon={<ReceiptText size={16} />}
              label="Tagihan Terakhir"
              value={formatCurrency(latestPayment.amount)}
              helper={`Invoice #${latestPayment.invoice_id}`}
            />
            <SummaryCard
              icon={<CalendarClock size={16} />}
              label="Jatuh Tempo"
              value={formatDate(latestPayment.due_date)}
              helper={latestPayment.status === "paid" ? "Sudah dibayar" : "Perhatikan tanggal bayar"}
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
              value={paymentStatusMap[latestPayment.status].label}
              helper={`Diperbarui ${formatDate(latestPayment.updated_at)}`}
            />
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <h3 className="text-base font-semibold text-slate-800">Informasi Properti</h3>
              <div className="mt-4 space-y-3 text-sm text-slate-700">
                <DetailRow
                  icon={<Building2 size={14} />}
                  label="Nama Properti"
                  value={property?.name || latestPayment.property.name || "-"}
                />
                <DetailRow
                  icon={<MapPin size={14} />}
                  label="Alamat"
                  value={property?.address || "-"}
                />
                <DetailRow
                  icon={<Home size={14} />}
                  label="Tipe Properti"
                  value={property?.property_type || "-"}
                />
                <DetailRow
                  icon={<CheckCircle2 size={14} />}
                  label="Kondisi"
                  value={property?.condition || "-"}
                />
              </div>
            </div>

            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <h3 className="text-base font-semibold text-slate-800">Informasi Unit</h3>
              <div className="mt-4 space-y-3 text-sm text-slate-700">
                <DetailRow
                  icon={<Home size={14} />}
                  label="Nama Unit"
                  value={unit?.name || latestPayment.unit.name || "-"}
                />
                <DetailRow
                  icon={<Building2 size={14} />}
                  label="Tipe Unit"
                  value={unit?.unit_type || "-"}
                />
                <DetailRow
                  icon={<Users size={14} />}
                  label="Kapasitas"
                  value={
                    unit?.people_allowed && unit.people_allowed > 0
                      ? `${unit.people_allowed} orang`
                      : "-"
                  }
                />
                <DetailRow
                  icon={<ReceiptText size={14} />}
                  label="Harga per Bulan"
                  value={formatCurrency(unit?.price || latestPayment.amount)}
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-slate-800">Fasilitas</h3>
            <div className="mt-4 flex flex-wrap gap-2">
              {(property?.facilities || []).length > 0 ? (
                (property?.facilities || []).map((facility) => (
                  <span
                    key={facility}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700"
                  >
                    {facility}
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
            <section className="rounded-2xl border bg-white p-5 shadow-sm">
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

function SummaryCard({
  icon,
  label,
  value,
  helper,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-green-50 text-green-700">
        {icon}
      </div>
      <p className="mt-3 text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-base font-semibold text-slate-800">{value}</p>
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
    <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
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
