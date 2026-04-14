"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  Building2,
  CircleX,
  DoorOpen,
  Image as ImageIcon,
  MapPin,
  Pencil,
  Plus,
  RotateCcw,
  Users,
  Video,
  Wrench,
} from "lucide-react";
import AddPropertyModal from "@/components/dashboard/admin/properties/AddPropertyModal";
import {
  createAdminUnit,
  deleteAdminProperty,
  getAdminOwners,
  getAdminPropertyDetail,
  getAdminPropertyMaintenance,
  getAdminPropertyTenants,
  getAdminPropertyUnits,
  getApiErrorMessage,
  toAbsoluteAssetUrl,
  type AdminPropertyDetailPayload,
  type AdminPropertyMaintenanceRow,
  type AdminPropertyTenantRow,
  type AdminPropertyUnitRow,
  type AdminPropertyUpsertPayload,
  type AdminUser,
  updateAdminProperty,
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

const paymentLabelMap: Record<string, string> = {
  paid: "Lunas",
  unpaid: "Belum Bayar",
};

const unitStatusLabelMap: Record<string, string> = {
  vacant: "Kosong",
  occupied: "Terisi",
  maintenance: "Perawatan",
};

const paymentBadgeClassMap: Record<string, string> = {
  paid: "border-emerald-200 bg-emerald-50 text-emerald-700",
  unpaid: "border-amber-200 bg-amber-50 text-amber-700",
};

const unitBadgeClassMap: Record<string, string> = {
  occupied: "border-emerald-200 bg-emerald-50 text-emerald-700",
  vacant: "border-sky-200 bg-sky-50 text-sky-700",
  maintenance: "border-amber-200 bg-amber-50 text-amber-700",
};

const propertyTypeLabelMap: Record<string, string> = {
  kost: "Kost",
  apartment: "Apartemen",
  house: "Rumah",
  villa: "Vila",
  studio_apartment: "Apartemen Studio",
  townhouse: "Rumah Deret",
};

const conditionLabelMap: Record<string, string> = {
  excellent: "Sangat Baik",
  good: "Baik",
  fair: "Cukup",
  maintenance: "Butuh Perawatan",
};

const maintenanceStatusLabelMap: Record<string, string> = {
  unassigned: "Belum Ditugaskan",
  assigned: "Sudah Ditugaskan",
  in_progress: "Dikerjakan",
  pending_vendor: "Menunggu Vendor",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

const maintenanceStatusClassMap: Record<string, string> = {
  unassigned: "border-slate-200 bg-slate-100 text-slate-700",
  assigned: "border-blue-200 bg-blue-50 text-blue-700",
  in_progress: "border-amber-200 bg-amber-50 text-amber-700",
  pending_vendor: "border-purple-200 bg-purple-50 text-purple-700",
  completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  cancelled: "border-red-200 bg-red-50 text-red-700",
};

const maintenancePriorityLabelMap: Record<string, string> = {
  low: "Rendah",
  medium: "Sedang",
  high: "Tinggi",
};

const maintenancePriorityClassMap: Record<string, string> = {
  low: "border-slate-200 bg-slate-100 text-slate-700",
  medium: "border-amber-200 bg-amber-50 text-amber-700",
  high: "border-red-200 bg-red-50 text-red-700",
};

const formatPriceRange = (
  priceRange?: { min: number; max: number } | null
) => {
  if (!priceRange) {
    return "-";
  }

  const minValue = Number(priceRange.min || 0);
  const maxValue = Number(priceRange.max || 0);

  if (minValue <= 0 && maxValue <= 0) {
    return "-";
  }

  if (minValue === maxValue) {
    return `Rp ${minValue.toLocaleString("id-ID")}`;
  }

  return `Rp ${minValue.toLocaleString("id-ID")} - Rp ${maxValue.toLocaleString(
    "id-ID"
  )}`;
};

const resolveMediaImageUrl = (path?: string | null) => {
  if (!path) {
    return "/bg.jpg";
  }

  if (path === "/bg.jpg") {
    return path;
  }

  return toAbsoluteAssetUrl(path) || path;
};

const formatFacilityLabel = (value: string) => {
  if (!value) {
    return "-";
  }

  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const formatReadableText = (value?: string | null) => {
  if (!value) {
    return "-";
  }

  return value
    .split("_")
    .join(" ")
    .split("-")
    .join(" ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

type Notice = {
  variant: "success" | "error";
  message: string;
} | null;

export default function DetailPropertiPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const propertyId = params?.id;

  const [propertyDetail, setPropertyDetail] =
    useState<AdminPropertyDetailPayload | null>(null);
  const [owners, setOwners] = useState<AdminUser[]>([]);
  const [tenantRows, setTenantRows] = useState<AdminPropertyTenantRow[]>([]);
  const [unitRows, setUnitRows] = useState<AdminPropertyUnitRow[]>([]);
  const [maintenanceRows, setMaintenanceRows] = useState<
    AdminPropertyMaintenanceRow[]
  >([]);

  const [tenantSearch, setTenantSearch] = useState("");
  const [tenantStatus, setTenantStatus] = useState("");
  const [unitSearch, setUnitSearch] = useState("");
  const [unitStatus, setUnitStatus] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddUnitForm, setShowAddUnitForm] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [newUnitForm, setNewUnitForm] = useState({
    name: "",
    unit_type: "standard",
    status: "vacant" as "vacant" | "occupied" | "maintenance",
    people_allowed: "1",
    price: "",
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isAddingUnit, setIsAddingUnit] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!propertyId) {
      return;
    }

    let active = true;

    const loadPropertyDetail = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [
          detailResponse,
          tenantResponse,
          unitResponse,
          maintenanceResponse,
          ownersResponse,
        ] = await Promise.all([
          getAdminPropertyDetail(propertyId),
          getAdminPropertyTenants(propertyId, { page: 1, per_page: 100 }),
          getAdminPropertyUnits(propertyId, { page: 1, per_page: 100 }),
          getAdminPropertyMaintenance(propertyId, { page: 1, per_page: 100 }),
          getAdminOwners({ page: 1, per_page: 100 }),
        ]);

        if (!active) {
          return;
        }

        setPropertyDetail(detailResponse.data);
        setOwners(ownersResponse.data);
        setTenantRows(tenantResponse.data);
        setUnitRows(unitResponse.data);
        setMaintenanceRows(maintenanceResponse.data);
      } catch (loadError) {
        if (!active) {
          return;
        }

        setError(
          getApiErrorMessage(
            loadError,
            "Detail properti gagal dimuat. Silakan coba lagi."
          )
        );
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadPropertyDetail();

    return () => {
      active = false;
    };
  }, [propertyId, refreshKey]);

  const tenantFiltered = useMemo(() => {
    return tenantRows.filter((tenant) => {
      return (
        tenant.tenant_name.toLowerCase().includes(tenantSearch.toLowerCase()) &&
        (tenantStatus ? tenant.payment_status === tenantStatus : true)
      );
    });
  }, [tenantRows, tenantSearch, tenantStatus]);

  const unitFiltered = useMemo(() => {
    return unitRows.filter((unit) => {
      return (
        unit.unit_name.toLowerCase().includes(unitSearch.toLowerCase()) &&
        (unitStatus ? unit.status === unitStatus : true)
      );
    });
  }, [unitRows, unitSearch, unitStatus]);

  const maintenanceActiveCount = useMemo(() => {
    return maintenanceRows.filter(
      (item) => item.status !== "completed" && item.status !== "cancelled"
    ).length;
  }, [maintenanceRows]);

  const maintenanceSorted = useMemo(() => {
    return [...maintenanceRows].sort((a, b) => {
      const aTime = new Date(a.date || "").getTime();
      const bTime = new Date(b.date || "").getTime();
      return (Number.isFinite(bTime) ? bTime : 0) - (Number.isFinite(aTime) ? aTime : 0);
    });
  }, [maintenanceRows]);

  const images = useMemo(() => {
    if (!propertyDetail) {
      return ["/bg.jpg"];
    }

    const source = propertyDetail.property.photo_urls?.length
      ? propertyDetail.property.photo_urls
      : propertyDetail.property.roomphoto_urls?.length
        ? propertyDetail.property.roomphoto_urls
        : ["/bg.jpg"];

    return source.map((item) => resolveMediaImageUrl(item));
  }, [propertyDetail]);

  useEffect(() => {
    setActiveImageIndex(0);
  }, [propertyDetail?.property.id, images.length]);

  const selectedImage = images[Math.min(activeImageIndex, images.length - 1)] || "/bg.jpg";

  const videos = useMemo(() => {
    const source = propertyDetail?.property.video_urls || [];
    return source
      .map((item) => toAbsoluteAssetUrl(item) || item)
      .filter((item): item is string => Boolean(item));
  }, [propertyDetail]);

  const video360Url = propertyDetail?.property.video_360_url
    ? toAbsoluteAssetUrl(propertyDetail.property.video_360_url) ||
      propertyDetail.property.video_360_url
    : null;

  const photo360Url = propertyDetail?.property.photo_360_url
    ? toAbsoluteAssetUrl(propertyDetail.property.photo_360_url) ||
      propertyDetail.property.photo_360_url
    : null;

  const modalOwners = useMemo(() => {
    if (owners.length > 0) {
      return owners;
    }

    const owner = propertyDetail?.property.user;
    if (!owner) {
      return [];
    }

    return [
      {
        id: owner.id,
        full_name: owner.full_name,
        email: owner.email,
        role: "owner",
        account_status: "active",
      },
    ] as AdminUser[];
  }, [owners, propertyDetail]);

  const editInitialValue = useMemo(() => {
    if (!propertyDetail) {
      return undefined;
    }

    return {
      owner_id: propertyDetail.property.user?.id,
      name: propertyDetail.property.name,
      address: propertyDetail.property.address,
      latitude: propertyDetail.property.latitude,
      longitude: propertyDetail.property.longitude,
      property_type: propertyDetail.property.property_type,
      condition: propertyDetail.property.condition,
      description: propertyDetail.property.description,
      rules: propertyDetail.property.rules,
      facilities: propertyDetail.property.facilities,
      video_360_url: propertyDetail.property.video_360_url,
    };
  }, [propertyDetail]);

  const handleDeleteProperty = async () => {
    if (!propertyId || isDeleting) {
      return;
    }

    const agreed = window.confirm(
      "Yakin ingin menghapus properti ini? Data yang terhapus tidak bisa dikembalikan."
    );
    if (!agreed) {
      return;
    }

    setIsDeleting(true);
    setError(null);
    setNotice(null);

    try {
      await deleteAdminProperty(propertyId);
      router.push("/admin/properties");
      router.refresh();
    } catch (deleteError) {
      setError(
        getApiErrorMessage(
          deleteError,
          "Gagal menghapus properti. Pastikan tidak ada data terkait yang mengunci properti."
        )
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdateProperty = async (payload: AdminPropertyUpsertPayload) => {
    if (!propertyId || isUpdating) {
      return;
    }

    setIsUpdating(true);
    setError(null);
    setNotice(null);

    try {
      await updateAdminProperty(propertyId, {
        owner_id: payload.owner_id,
        name: payload.name,
        address: payload.address,
        latitude: payload.latitude,
        longitude: payload.longitude,
        property_type: payload.property_type,
        condition: payload.condition,
        description: payload.description,
        rules: payload.rules,
        facilities: payload.facilities,
        photos: payload.photos,
        video: payload.video || payload.videos?.[0] || null,
        video_360: payload.video_360 || payload.photo_360 || null,
      });
      setShowEditModal(false);
      setNotice({
        variant: "success",
        message: "Data properti berhasil diperbarui.",
      });
      setRefreshKey((prev) => prev + 1);
    } catch (updateError) {
      const message = getApiErrorMessage(
        updateError,
        "Gagal memperbarui properti. Coba lagi beberapa saat."
      );
      setError(message);
      throw new Error(message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddUnit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!propertyId || isAddingUnit) {
      return;
    }

    const parsedPropertyId = Number(propertyId);
    const parsedPeopleAllowed = Number(newUnitForm.people_allowed);
    const parsedPrice = Number(newUnitForm.price);

    if (
      !Number.isFinite(parsedPropertyId) ||
      parsedPropertyId <= 0 ||
      newUnitForm.name.trim() === "" ||
      !Number.isFinite(parsedPeopleAllowed) ||
      parsedPeopleAllowed <= 0 ||
      !Number.isFinite(parsedPrice) ||
      parsedPrice <= 0
    ) {
      setError("Data unit belum valid. Periksa nama unit, kapasitas, dan harga.");
      return;
    }

    setIsAddingUnit(true);
    setError(null);
    setNotice(null);

    try {
      await createAdminUnit({
        property_id: parsedPropertyId,
        name: newUnitForm.name.trim(),
        unit_type: newUnitForm.unit_type,
        status: newUnitForm.status,
        people_allowed: parsedPeopleAllowed,
        price: parsedPrice,
      });

      setNewUnitForm({
        name: "",
        unit_type: "standard",
        status: "vacant",
        people_allowed: "1",
        price: "",
      });
      setShowAddUnitForm(false);
      setNotice({
        variant: "success",
        message: "Unit baru berhasil ditambahkan.",
      });
      setRefreshKey((prev) => prev + 1);
    } catch (addError) {
      setError(
        getApiErrorMessage(
          addError,
          "Gagal menambahkan unit. Coba lagi beberapa saat."
        )
      );
    } finally {
      setIsAddingUnit(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-r from-[#1E2746] to-[#2A3B78] p-5 text-white shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-blue-100">
              Modul Properti
            </p>
            <h1 className="text-2xl font-semibold">
              {propertyDetail?.property.name || "Detail Properti"}
            </h1>
            <p className="max-w-3xl text-sm text-blue-100">
              {propertyDetail?.property.address ||
                "Pantau media, unit, penghuni, dan status perawatan properti."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => router.push("/admin/properties")}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-white/15 px-4 text-sm font-medium text-white hover:bg-white/25"
            >
              <ArrowLeft size={16} />
              Kembali
            </button>

            <button
              type="button"
              onClick={() => {
                setError(null);
                setNotice(null);
                setRefreshKey((prev) => prev + 1);
              }}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-[#1E2746] hover:bg-slate-100"
            >
              <RotateCcw size={15} />
              Muat Ulang
            </button>

            <button
              type="button"
              onClick={() => setShowEditModal(true)}
              disabled={isLoading || !propertyDetail || isUpdating || isDeleting}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-[#1E2746] hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Pencil size={16} />
              {isUpdating ? "Menyimpan..." : "Edit Properti"}
            </button>

            <button
              type="button"
              onClick={() => {
                void handleDeleteProperty();
              }}
              disabled={isDeleting || isLoading || !propertyDetail || isUpdating}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-red-300 bg-red-100 px-4 text-sm font-semibold text-red-700 hover:bg-red-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <CircleX size={16} />
              {isDeleting ? "Menghapus..." : "Hapus Properti"}
            </button>
          </div>
        </div>
      </section>

      {notice && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            notice.variant === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {notice.message}
        </div>
      )}

      {error && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-700">{error}</p>
          <button
            type="button"
            onClick={() => setRefreshKey((prev) => prev + 1)}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-red-200 bg-white px-3 text-xs font-medium text-red-700"
          >
            <RotateCcw size={14} />
            Coba Lagi
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          Memuat detail properti...
        </div>
      ) : !propertyDetail ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          Data properti tidak ditemukan.
        </div>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard
              icon={<Building2 size={16} />}
              label="Total Unit"
              value={String(propertyDetail.stats.total_units)}
              tone="default"
            />
            <StatCard
              icon={<Users size={16} />}
              label="Unit Terisi"
              value={String(propertyDetail.stats.occupied_units)}
              tone="success"
            />
            <StatCard
              icon={<DoorOpen size={16} />}
              label="Unit Kosong"
              value={String(propertyDetail.stats.vacant_units)}
              tone="info"
            />
            <StatCard
              icon={<Wrench size={16} />}
              label="Perawatan Aktif"
              value={String(maintenanceActiveCount)}
              tone="warning"
            />
            <StatCard
              icon={<Users size={16} />}
              label="Total Penyewa"
              value={String(propertyDetail.stats.total_tenants)}
              tone="default"
            />
          </section>

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <div className="space-y-5 xl:col-span-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <ImageIcon size={18} className="text-slate-500" />
                  <h2 className="text-lg font-semibold text-slate-800">
                    Galeri Properti
                  </h2>
                </div>

                <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                  <img
                    src={selectedImage}
                    alt={propertyDetail.property.name}
                    loading="lazy"
                    onError={(event) => {
                      event.currentTarget.src = "/bg.jpg";
                    }}
                    className="aspect-[16/9] w-full object-cover"
                  />
                </div>

                {images.length > 1 && (
                  <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">
                    {images.map((image, index) => (
                      <button
                        key={`${image}-${index}`}
                        type="button"
                        onClick={() => setActiveImageIndex(index)}
                        className={`overflow-hidden rounded-xl border transition ${
                          index === activeImageIndex
                            ? "border-[#1E2746] ring-2 ring-[#1E2746]/20"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <img
                          src={image}
                          alt={`${propertyDetail.property.name} ${index + 1}`}
                          loading="lazy"
                          onError={(event) => {
                            event.currentTarget.src = "/bg.jpg";
                          }}
                          className="h-20 w-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <Video size={18} className="text-slate-500" />
                  <h2 className="text-lg font-semibold text-slate-800">
                    Media Video & 360
                  </h2>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-700">
                      Video Properti
                    </p>
                    {videos.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                        Belum ada video properti.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {videos.map((video, index) => (
                          <div
                            key={`${video}-${index}`}
                            className="overflow-hidden rounded-xl border border-slate-200 bg-black"
                          >
                            <video
                              src={video}
                              controls
                              preload="metadata"
                              className="h-52 w-full"
                            >
                              Browser Anda tidak mendukung pemutar video.
                            </video>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-700">Media 360</p>
                    {video360Url ? (
                      <div className="overflow-hidden rounded-xl border border-slate-200 bg-black">
                        <video
                          src={video360Url}
                          controls
                          preload="metadata"
                          className="h-52 w-full"
                        />
                      </div>
                    ) : photo360Url ? (
                      <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                        <img
                          src={photo360Url}
                          alt={`Foto 360 ${propertyDetail.property.name}`}
                          loading="lazy"
                          onError={(event) => {
                            event.currentTarget.src = "/bg.jpg";
                          }}
                          className="h-52 w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                        Belum ada media 360.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-slate-800">
                  Informasi Properti
                </h2>

                <div className="space-y-2">
                  <InfoRow
                    label="Tipe Properti"
                    value={
                      propertyTypeLabelMap[propertyDetail.property.property_type] ||
                      formatReadableText(propertyDetail.property.property_type)
                    }
                  />
                  <InfoRow
                    label="Kondisi"
                    value={
                      conditionLabelMap[propertyDetail.property.condition] ||
                      formatReadableText(propertyDetail.property.condition)
                    }
                  />
                  <InfoRow
                    label="Kisaran Harga"
                    value={formatPriceRange(propertyDetail.stats.price_range)}
                  />
                  <InfoRow
                    label="Pemilik"
                    value={propertyDetail.property.user?.full_name || "-"}
                  />
                  <InfoRow
                    label="Email Pemilik"
                    value={propertyDetail.property.user?.email || "-"}
                  />
                  <InfoRow
                    label="Latitude"
                    value={
                      typeof propertyDetail.property.latitude === "number"
                        ? propertyDetail.property.latitude.toString()
                        : "-"
                    }
                  />
                  <InfoRow
                    label="Longitude"
                    value={
                      typeof propertyDetail.property.longitude === "number"
                        ? propertyDetail.property.longitude.toString()
                        : "-"
                    }
                  />
                </div>

                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                  <p className="mb-1 inline-flex items-center gap-1 font-medium text-slate-700">
                    <MapPin size={15} />
                    Alamat
                  </p>
                  <p className="leading-relaxed">{propertyDetail.property.address || "-"}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="mb-2 font-semibold text-slate-800">Deskripsi</h3>
                <p className="text-sm leading-relaxed text-slate-600">
                  {propertyDetail.property.description || "-"}
                </p>

                <h3 className="mb-2 mt-4 font-semibold text-slate-800">Peraturan</h3>
                <p className="text-sm leading-relaxed text-slate-600">
                  {propertyDetail.property.rules || "-"}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold text-slate-800">Fasilitas</h2>
            <div className="flex flex-wrap gap-2">
              {propertyDetail.property.facilities.length === 0 ? (
                <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-sm text-slate-600">
                  Tidak ada fasilitas
                </span>
              ) : (
                propertyDetail.property.facilities.map((facility) => (
                  <span
                    key={facility}
                    className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-sm text-slate-700"
                  >
                    {formatFacilityLabel(facility)}
                  </span>
                ))
              )}
            </div>
          </section>

          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-slate-800">
                Daftar Penghuni ({tenantFiltered.length})
              </h2>
            </div>

            <div className="flex flex-wrap gap-3">
              <input
                placeholder="Cari nama penghuni"
                value={tenantSearch}
                onChange={(event) => setTenantSearch(event.target.value)}
                className="h-11 w-full max-w-xs rounded-xl border border-slate-200 px-4 text-sm focus:border-[#1E2746] focus:outline-none focus:ring-2 focus:ring-[#1E2746]/20"
              />

              <select
                value={tenantStatus}
                onChange={(event) => setTenantStatus(event.target.value)}
                className="h-11 rounded-xl border border-slate-200 px-4 text-sm focus:border-[#1E2746] focus:outline-none focus:ring-2 focus:ring-[#1E2746]/20"
              >
                <option value="">Semua Status Pembayaran</option>
                <option value="paid">Lunas</option>
                <option value="unpaid">Belum Bayar</option>
              </select>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-[760px] w-full text-sm">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="p-3 text-left font-semibold">Nama</th>
                    <th className="p-3 text-left font-semibold">Unit</th>
                    <th className="p-3 text-left font-semibold">Telepon</th>
                    <th className="p-3 text-left font-semibold">Akhir Sewa</th>
                    <th className="p-3 text-left font-semibold">Status Pembayaran</th>
                  </tr>
                </thead>

                <tbody>
                  {tenantFiltered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-slate-500">
                        Tidak ada data penghuni.
                      </td>
                    </tr>
                  ) : (
                    tenantFiltered.map((tenant) => (
                      <tr
                        key={tenant.lease_id}
                        className="border-t border-slate-100 hover:bg-slate-50"
                      >
                        <td className="p-3 font-medium text-slate-800">{tenant.tenant_name}</td>
                        <td className="p-3 text-slate-700">{tenant.unit_name}</td>
                        <td className="p-3 text-slate-700">{tenant.mobile_phone || "-"}</td>
                        <td className="p-3 text-slate-700">{formatDate(tenant.lease_end)}</td>
                        <td className="p-3">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                              paymentBadgeClassMap[tenant.payment_status || ""] ||
                              "border-slate-200 bg-slate-100 text-slate-600"
                            }`}
                          >
                            {paymentLabelMap[tenant.payment_status || ""] ||
                              tenant.payment_status ||
                              "-"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-slate-800">
                Daftar Unit ({unitFiltered.length})
              </h2>
              <button
                type="button"
                onClick={() => setShowAddUnitForm((prev) => !prev)}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-semibold text-blue-700"
              >
                <Plus size={14} />
                {showAddUnitForm ? "Tutup Form Unit" : "Tambah Unit"}
              </button>
            </div>

            {showAddUnitForm && (
              <form
                onSubmit={(event) => {
                  void handleAddUnit(event);
                }}
                className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2"
              >
                <input
                  placeholder="Nama / Nomor Unit"
                  value={newUnitForm.name}
                  onChange={(event) =>
                    setNewUnitForm((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                  className="h-11 rounded-xl border border-slate-200 px-3 text-sm focus:border-[#1E2746] focus:outline-none focus:ring-2 focus:ring-[#1E2746]/20"
                />

                <select
                  value={newUnitForm.unit_type}
                  onChange={(event) =>
                    setNewUnitForm((prev) => ({
                      ...prev,
                      unit_type: event.target.value,
                    }))
                  }
                  className="h-11 rounded-xl border border-slate-200 px-3 text-sm focus:border-[#1E2746] focus:outline-none focus:ring-2 focus:ring-[#1E2746]/20"
                >
                  <option value="standard">Standard</option>
                  <option value="deluxe">Deluxe</option>
                  <option value="exclusive">Exclusive</option>
                  <option value="premium">Premium</option>
                  <option value="studio">Studio</option>
                  <option value="suite">Suite</option>
                </select>

                <input
                  type="number"
                  min={1}
                  placeholder="Kapasitas (orang)"
                  value={newUnitForm.people_allowed}
                  onChange={(event) =>
                    setNewUnitForm((prev) => ({
                      ...prev,
                      people_allowed: event.target.value,
                    }))
                  }
                  className="h-11 rounded-xl border border-slate-200 px-3 text-sm focus:border-[#1E2746] focus:outline-none focus:ring-2 focus:ring-[#1E2746]/20"
                />

                <input
                  type="number"
                  min={1}
                  placeholder="Harga per bulan"
                  value={newUnitForm.price}
                  onChange={(event) =>
                    setNewUnitForm((prev) => ({
                      ...prev,
                      price: event.target.value,
                    }))
                  }
                  className="h-11 rounded-xl border border-slate-200 px-3 text-sm focus:border-[#1E2746] focus:outline-none focus:ring-2 focus:ring-[#1E2746]/20"
                />

                <select
                  value={newUnitForm.status}
                  onChange={(event) =>
                    setNewUnitForm((prev) => ({
                      ...prev,
                      status: event.target.value as
                        | "vacant"
                        | "occupied"
                        | "maintenance",
                    }))
                  }
                  className="h-11 rounded-xl border border-slate-200 px-3 text-sm focus:border-[#1E2746] focus:outline-none focus:ring-2 focus:ring-[#1E2746]/20"
                >
                  <option value="vacant">Kosong</option>
                  <option value="occupied">Terisi</option>
                  <option value="maintenance">Perawatan</option>
                </select>

                <div className="flex items-center justify-end md:col-span-2">
                  <button
                    type="submit"
                    disabled={isAddingUnit}
                    className="inline-flex h-11 items-center rounded-xl bg-[#1E2746] px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isAddingUnit ? "Menyimpan Unit..." : "Simpan Unit"}
                  </button>
                </div>
              </form>
            )}

            <div className="flex flex-wrap gap-3">
              <input
                placeholder="Cari nama / nomor unit"
                value={unitSearch}
                onChange={(event) => setUnitSearch(event.target.value)}
                className="h-11 w-full max-w-xs rounded-xl border border-slate-200 px-4 text-sm focus:border-[#1E2746] focus:outline-none focus:ring-2 focus:ring-[#1E2746]/20"
              />

              <select
                value={unitStatus}
                onChange={(event) => setUnitStatus(event.target.value)}
                className="h-11 rounded-xl border border-slate-200 px-4 text-sm focus:border-[#1E2746] focus:outline-none focus:ring-2 focus:ring-[#1E2746]/20"
              >
                <option value="">Semua Status</option>
                <option value="occupied">Terisi</option>
                <option value="vacant">Kosong</option>
                <option value="maintenance">Perawatan</option>
              </select>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-[820px] w-full text-sm">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="p-3 text-left font-semibold">Nomor Unit</th>
                    <th className="p-3 text-left font-semibold">Tipe</th>
                    <th className="p-3 text-left font-semibold">Harga / Bulan</th>
                    <th className="p-3 text-left font-semibold">Penyewa</th>
                    <th className="p-3 text-left font-semibold">Status</th>
                  </tr>
                </thead>

                <tbody>
                  {unitFiltered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-slate-500">
                        Tidak ada data unit.
                      </td>
                    </tr>
                  ) : (
                    unitFiltered.map((unit) => (
                      <tr
                        key={unit.unit_id}
                        className="border-t border-slate-100 hover:bg-slate-50"
                      >
                        <td className="p-3 font-medium text-slate-800">{unit.unit_name}</td>
                        <td className="p-3 text-slate-700">
                          {formatReadableText(unit.unit_type)}
                        </td>
                        <td className="p-3 text-slate-700">
                          Rp {Number(unit.price || 0).toLocaleString("id-ID")}
                        </td>
                        <td className="p-3 text-slate-700">{unit.tenant_name || "-"}</td>
                        <td className="p-3">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                              unitBadgeClassMap[unit.status] ||
                              "border-slate-200 bg-slate-100 text-slate-600"
                            }`}
                          >
                            {unitStatusLabelMap[unit.status] || formatReadableText(unit.status)}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800">
              Riwayat Perawatan ({maintenanceRows.length})
            </h2>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-[980px] w-full text-sm">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="p-3 text-left font-semibold">Tanggal</th>
                    <th className="p-3 text-left font-semibold">Unit</th>
                    <th className="p-3 text-left font-semibold">Penghuni</th>
                    <th className="p-3 text-left font-semibold">Keluhan</th>
                    <th className="p-3 text-left font-semibold">Prioritas</th>
                    <th className="p-3 text-left font-semibold">Status</th>
                    <th className="p-3 text-left font-semibold">Teknisi</th>
                  </tr>
                </thead>

                <tbody>
                  {maintenanceSorted.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-4 text-center text-slate-500">
                        Tidak ada data perawatan.
                      </td>
                    </tr>
                  ) : (
                    maintenanceSorted.map((item) => (
                      <tr
                        key={item.id}
                        className="border-t border-slate-100 hover:bg-slate-50"
                      >
                        <td className="p-3 text-slate-700">{formatDate(item.date)}</td>
                        <td className="p-3 text-slate-700">{item.unit_name}</td>
                        <td className="p-3 text-slate-700">{item.tenant_name || "-"}</td>
                        <td className="p-3 text-slate-700">
                          <p className="max-w-[280px] break-words">
                            {item.issue || item.category || "-"}
                          </p>
                        </td>
                        <td className="p-3">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                              maintenancePriorityClassMap[item.priority] ||
                              "border-slate-200 bg-slate-100 text-slate-600"
                            }`}
                          >
                            {maintenancePriorityLabelMap[item.priority] ||
                              formatReadableText(item.priority)}
                          </span>
                        </td>
                        <td className="p-3">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                              maintenanceStatusClassMap[item.status] ||
                              "border-slate-200 bg-slate-100 text-slate-600"
                            }`}
                          >
                            {maintenanceStatusLabelMap[item.status] ||
                              formatReadableText(item.status)}
                          </span>
                        </td>
                        <td className="p-3 text-slate-700">
                          {item.technician_name || "-"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <AddPropertyModal
        key={`${propertyDetail?.property.id || "property"}-${showEditModal ? "open" : "closed"}-${propertyDetail?.property.updated_at || ""}`}
        open={showEditModal}
        owners={modalOwners}
        onClose={() => setShowEditModal(false)}
        onSave={handleUpdateProperty}
        title="Edit Properti"
        submitLabel={isUpdating ? "Menyimpan..." : "Simpan Perubahan"}
        initialValue={editInitialValue}
      />
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "default" | "success" | "warning" | "info";
}) {
  const toneClass =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50/70"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50/70"
        : tone === "info"
          ? "border-blue-200 bg-blue-50/70"
          : "border-slate-200 bg-slate-50/70";

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <div className="inline-flex rounded-lg bg-white/70 p-2 text-slate-700">{icon}</div>
      <p className="mt-3 text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-slate-200 px-3 py-2">
      <span className="text-sm font-medium text-slate-600">{label}</span>
      <span className="max-w-[68%] break-words text-right text-sm text-slate-800">
        {value}
      </span>
    </div>
  );
}
