"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, DoorOpen, Home, Plus, Wallet } from "lucide-react";
import AddPropertyModal from "@/components/dashboard/admin/properties/AddPropertyModal";
import PropertyCard from "@/components/dashboard/admin/properties/PropertyCard";
import PropertyFilters from "@/components/dashboard/admin/properties/PropertyFilters";
import StatCard from "@/components/dashboard/admin/cards/StatCard";
import {
  buildPeriodParams,
  createAdminProperty,
  getAdminFinancialDashboard,
  getAdminOwners,
  getAdminProperties,
  getApiErrorMessage,
  mapPropertyToCard,
  type AdminPropertyUpsertPayload,
  type AdminUser,
} from "@/lib/dashboard/admin.api";
import { hasFilterOption, uniqueFilterOptions } from "@/lib/filter-options";
import type { Property } from "@/types/dashboard";

interface PropertySummary {
  totalProperty: number;
  occupiedUnit: number;
  vacantUnit: number;
  totalRevenue: number;
}

const initialSummary: PropertySummary = {
  totalProperty: 0,
  occupiedUnit: 0,
  vacantUnit: 0,
  totalRevenue: 0,
};

const propertyStatusLabelMap: Record<string, string> = {
  occupied: "Terisi",
  booking: "Booking",
  vacant: "Kosong",
  maintenance: "Perawatan",
  cleaning: "Pembersihan",
  renovation: "Renovasi",
};

export default function AdminPropertiesPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [openModal, setOpenModal] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [owners, setOwners] = useState<AdminUser[]>([]);
  const [summary, setSummary] = useState<PropertySummary>(initialSummary);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;

    const loadProperties = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [propertiesResponse, dashboardResponse, ownersResponse] = await Promise.all([
          getAdminProperties({
            page: 1,
            per_page: 100,
          }),
          getAdminFinancialDashboard(buildPeriodParams("year")),
          getAdminOwners({
            page: 1,
            per_page: 100,
          }),
        ]);

        if (!active) {
          return;
        }

        const mappedProperties = propertiesResponse.data.map(mapPropertyToCard);
        const occupiedUnit = propertiesResponse.data.reduce(
          (sum, property) => sum + property.occupied_units,
          0
        );
        const vacantUnit = propertiesResponse.data.reduce(
          (sum, property) => sum + property.vacant_units,
          0
        );

        setProperties(mappedProperties);
        setOwners(ownersResponse.data);
        setSummary({
          totalProperty:
            propertiesResponse.meta?.total_count || propertiesResponse.data.length,
          occupiedUnit,
          vacantUnit,
          totalRevenue: dashboardResponse.data.summary.total_revenue,
        });
      } catch (loadError) {
        if (!active) {
          return;
        }

        setError(
          getApiErrorMessage(
            loadError,
            "Data properti gagal dimuat. Coba ulang beberapa saat lagi."
          )
        );
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadProperties();

    return () => {
      active = false;
    };
  }, [refreshKey]);

  const filtered = useMemo(() => {
    return properties.filter((property) => {
      return (
        property.name.toLowerCase().includes(search.toLowerCase()) &&
        (status ? property.status === status : true)
      );
    });
  }, [properties, search, status]);

  const statusFilterOptions = useMemo(
    () =>
      uniqueFilterOptions(
        properties,
        (property) => property.status,
        (value) => propertyStatusLabelMap[value]
      ),
    [properties]
  );

  useEffect(() => {
    if (!hasFilterOption(statusFilterOptions, status)) {
      setStatus("");
    }
  }, [status, statusFilterOptions]);

  const totalPropertyCount = properties.length;

  const handleCreateProperty = async (payload: AdminPropertyUpsertPayload) => {
    setIsSaving(true);

    try {
      await createAdminProperty(payload);
      setRefreshKey((prev) => prev + 1);
    } catch (saveError) {
      throw new Error(
        getApiErrorMessage(
          saveError,
          "Properti gagal disimpan. Periksa kembali data input."
        )
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-7">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-[#1E2746] via-[#24305A] to-[#295A9A] p-6 text-white shadow-sm">
        <div className="pointer-events-none absolute -left-12 top-0 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -right-12 bottom-0 h-44 w-44 rounded-full bg-white/10 blur-3xl" />

        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="inline-flex items-center rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-medium">
              Modul Properti
            </p>
            <h1 className="mt-3 text-2xl font-semibold md:text-3xl">
              Kelola Properti & Unit Kyra Stay
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-white/85">
              Pantau status unit, media properti, dan kelola detail properti
              langsung dari satu modul.
            </p>
          </div>

          <button
            onClick={() => setOpenModal(true)}
            disabled={isSaving || owners.length === 0}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-[#1E2746] transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus size={16} />
            Tambah Properti
          </button>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 mb-8 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Properti"
          value={isLoading ? "..." : summary.totalProperty}
          icon={<Building2 size={20} />}
        />

        <StatCard
          title="Unit Terisi"
          value={isLoading ? "..." : summary.occupiedUnit}
          icon={<Home size={20} />}
        />

        <StatCard
          title="Unit Kosong"
          value={isLoading ? "..." : summary.vacantUnit}
          icon={<DoorOpen size={20} />}
        />

        <StatCard
          title="Total Pendapatan"
          value={
            isLoading
              ? "..."
              : `Rp ${summary.totalRevenue.toLocaleString("id-ID")}`
          }
          icon={<Wallet size={20} />}
        />
      </div>

      <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
        Properti yang baru dibuat belum otomatis tampil di sisi penyewa. Katalog penyewa
        mengambil data dari unit yang tersedia, jadi setiap properti harus punya
        minimal satu unit dengan status <span className="font-semibold">kosong</span>
        {" "}agar muncul di sisi penyewa.
      </div>

      <PropertyFilters
        search={search}
        setSearch={setSearch}
        status={status}
        setStatus={setStatus}
        statusOptions={statusFilterOptions}
        resultCount={filtered.length}
        totalCount={totalPropertyCount}
        onReset={() => {
          setSearch("");
          setStatus("");
        }}
      />

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-[355px] animate-pulse rounded-2xl border border-slate-200 bg-white"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <h2 className="text-lg font-semibold text-slate-800">
            Tidak ada properti yang sesuai filter
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Coba ubah kata kunci pencarian atau atur ulang penyaring status properti.
          </p>
          <button
            onClick={() => {
              setSearch("");
              setStatus("");
            }}
            className="mt-4 inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Atur Ulang Filter
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((property) => (
            <PropertyCard key={property.id} data={property} />
          ))}
        </div>
      )}

      <AddPropertyModal
        open={openModal}
        owners={owners}
        onClose={() => setOpenModal(false)}
        onSave={handleCreateProperty}
      />
    </div>
  );
}
