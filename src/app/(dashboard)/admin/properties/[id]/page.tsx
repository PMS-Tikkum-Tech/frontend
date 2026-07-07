"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpDown,
  Building2,
  ChevronLeft,
  ChevronRight,
  CircleX,
  DoorOpen,
  Filter,
  GripVertical,
  Image as ImageIcon,
  MapPin,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  Users,
  Video,
  Wrench,
} from "lucide-react";
import AddPropertyModal from "@/components/dashboard/admin/properties/AddPropertyModal";
import {
  createAdminPropertyTenant,
  createAdminUnit,
  deleteAdminProperty,
  deleteAdminPropertyTenant,
  deleteAdminUnit,
  getAllAdminPropertyMaintenance,
  getAllAdminPropertyTenants,
  getAllAdminPropertyUnits,
  getAdminOwners,
  getAdminPropertyDetail,
  getAdminTenants,
  getApiErrorMessage,
  toAbsoluteAssetUrl,
  type AdminPropertyDetailPayload,
  type AdminPropertyMaintenanceRow,
  type AdminPropertyTenantRow,
  type AdminPropertyUnitRow,
  type AdminPropertyUpsertPayload,
  type AdminPropertyTenantUpdatePayload,
  type AdminUnitUpdatePayload,
  type AdminUser,
  updateAdminPropertyTenant,
  updateAdminUnit,
  updateAdminProperty,
  updateAdminPropertyMediaOrder,
  updateAdminPropertyBlockMedia,
} from "@/lib/dashboard/admin.api";
import { hasFilterOption, uniqueFilterOptions } from "@/lib/filter-options";
import SafeBookingImage from "@/features/booking/v2/components/SafeBookingImage";
import SafeBookingVideo from "@/features/booking/v2/components/SafeBookingVideo";
import {
  buildPersistedUnitName,
  buildPropertyStructure,
  parseUnitIdentity,
  type PropertyStructure,
  type PropertyStructureUnit,
} from "@/lib/dashboard/property-structure";

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

const toInputDate = (value?: string | null) => {
  if (!value) {
    return "";
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 10);
};

const getTodayInputDate = () => {
  const date = new Date();
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 10);
};

const paymentLabelMap: Record<string, string> = {
  paid: "Lunas",
  unpaid: "Belum Dibayar",
};

const unitStatusLabelMap: Record<string, string> = {
  vacant: "Kosong",
  occupied: "Terisi",
  booking: "Booking",
  booked: "Booking",
  reserved: "Booking",
  maintenance: "Perawatan",
  cleaning: "Pembersihan",
  renovation: "Renovasi",
};

const paymentBadgeClassMap: Record<string, string> = {
  paid: "border-emerald-200 bg-emerald-50 text-emerald-700",
  unpaid: "border-amber-200 bg-amber-50 text-amber-700",
};

const unitBadgeClassMap: Record<string, string> = {
  occupied: "border-emerald-200 bg-emerald-50 text-emerald-700",
  booking: "border-violet-200 bg-violet-50 text-violet-700",
  booked: "border-violet-200 bg-violet-50 text-violet-700",
  reserved: "border-violet-200 bg-violet-50 text-violet-700",
  vacant: "border-sky-200 bg-sky-50 text-sky-700",
  maintenance: "border-amber-200 bg-amber-50 text-amber-700",
};

const defaultUnitSort = "building_unit_asc";

const unitSortOptions = [
  { value: "building_unit_asc", label: "Blok & unit A-Z" },
  { value: "unit_asc", label: "Nomor unit A-Z" },
  { value: "status_asc", label: "Status" },
  { value: "price_asc", label: "Harga terendah" },
  { value: "price_desc", label: "Harga tertinggi" },
  { value: "capacity_desc", label: "Kapasitas terbesar" },
];

const naturalCollator = new Intl.Collator("id-ID", {
  numeric: true,
  sensitivity: "base",
});

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

const getUnitDisplayPrice = (unit: Pick<
  AdminPropertyUnitRow,
  "price" | "promo_price" | "discount_percent"
>) => {
  const basePrice = Number(unit.price || 0);
  const promoPrice = Number(unit.promo_price || 0);
  const discountPercent = Number(unit.discount_percent || 0);
  const hasPromoPrice = Number.isFinite(promoPrice) && promoPrice > 0 && promoPrice < basePrice;
  const hasDiscount = Number.isFinite(discountPercent) && discountPercent > 0 && discountPercent < 100 && basePrice > 0;
  const effectivePromoPrice = hasPromoPrice
    ? promoPrice
    : hasDiscount
      ? Math.round((basePrice * (100 - discountPercent)) / 100)
      : null;

  return {
    basePrice,
    effectivePromoPrice,
    hasPromo: effectivePromoPrice != null && effectivePromoPrice > 0 && effectivePromoPrice < basePrice,
  };
};

const resolveMediaImageUrl = (path?: string | null) => {
  if (!path) {
    return "/bg-1200.webp";
  }

  if (path === "/bg-1200.webp") {
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

type UnitFormState = {
  buildingName: string;
  ownerId: string;
  name: string;
  unit_type: string;
  status: "vacant" | "occupied" | "booking" | "maintenance";
  people_allowed: string;
  price: string;
  promo_price: string;
  discount_percent: string;
  notes: string;
};

type BlockMediaDraft = {
  photos: File[];
  video: File | null;
  video360: File | null;
};

type BlockMediaDrafts = Record<string, BlockMediaDraft>;

type TenantAssignmentFormState = {
  tenantId: string;
  unitId: string;
  startDate: string;
  endDate: string;
  paymentStatus: "paid" | "unpaid";
};

const getInitialUnitForm = (ownerId?: number | null): UnitFormState => ({
  buildingName: "",
  ownerId: ownerId ? String(ownerId) : "",
  name: "",
  unit_type: "standard",
  status: "vacant",
  people_allowed: "1",
  price: "",
  promo_price: "",
  discount_percent: "",
  notes: "",
});

const getInitialTenantAssignmentForm = (): TenantAssignmentFormState => ({
  tenantId: "",
  unitId: "",
  startDate: getTodayInputDate(),
  endDate: "",
  paymentStatus: "unpaid",
});

const getUnitPhotoUrls = (unit: AdminPropertyUnitRow) => {
  return unit.photo_urls && unit.photo_urls.length > 0
    ? unit.photo_urls
    : unit.roomphoto_urls || [];
};

const getUnitVideoCount = (unit: AdminPropertyUnitRow) => {
  return [unit.video_url, unit.video_360_url].filter(Boolean).length;
};

export default function DetailPropertiPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const propertyId = params?.id;

  const [propertyDetail, setPropertyDetail] =
    useState<AdminPropertyDetailPayload | null>(null);
  const [owners, setOwners] = useState<AdminUser[]>([]);
  const [availableTenants, setAvailableTenants] = useState<AdminUser[]>([]);
  const [tenantRows, setTenantRows] = useState<AdminPropertyTenantRow[]>([]);
  const [unitRows, setUnitRows] = useState<AdminPropertyUnitRow[]>([]);
  const [maintenanceRows, setMaintenanceRows] = useState<
    AdminPropertyMaintenanceRow[]
  >([]);

  const [tenantSearch, setTenantSearch] = useState("");
  const [tenantStatus, setTenantStatus] = useState("");
  const [unitSearch, setUnitSearch] = useState("");
  const [unitStatus, setUnitStatus] = useState("");
  const [unitBuilding, setUnitBuilding] = useState("");
  const [unitType, setUnitType] = useState("");
  const [unitSort, setUnitSort] = useState(defaultUnitSort);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTenantForm, setShowTenantForm] = useState(false);
  const [showAddUnitForm, setShowAddUnitForm] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [deleteTenantTarget, setDeleteTenantTarget] =
    useState<AdminPropertyTenantRow | null>(null);
  const [deleteUnitTarget, setDeleteUnitTarget] =
    useState<AdminPropertyUnitRow | null>(null);
  const [editingTenantRow, setEditingTenantRow] =
    useState<AdminPropertyTenantRow | null>(null);
  const [editingUnitId, setEditingUnitId] = useState<number | null>(null);
  const [tenantForm, setTenantForm] = useState<TenantAssignmentFormState>(
    getInitialTenantAssignmentForm()
  );
  const [unitForm, setUnitForm] = useState<UnitFormState>(getInitialUnitForm());
  const [unitPhotos, setUnitPhotos] = useState<File[]>([]);
  const [unitVideoFile, setUnitVideoFile] = useState<File | null>(null);
  const [unitVideo360File, setUnitVideo360File] = useState<File | null>(null);
  const [blockMediaFiles, setBlockMediaFiles] = useState<BlockMediaDrafts>({});

  const [isLoading, setIsLoading] = useState(true);
  const [isSavingTenant, setIsSavingTenant] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSavingMediaOrder, setIsSavingMediaOrder] = useState(false);
  const [savingBlockMediaId, setSavingBlockMediaId] = useState<number | null>(null);
  const [isSavingUnit, setIsSavingUnit] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeletingTenantLeaseId, setIsDeletingTenantLeaseId] = useState<number | null>(
    null
  );
  const [isDeletingUnitId, setIsDeletingUnitId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [draggedPhotoIndex, setDraggedPhotoIndex] = useState<number | null>(null);

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
          tenantsResponse,
        ] = await Promise.all([
          getAdminPropertyDetail(propertyId),
          getAllAdminPropertyTenants(propertyId),
          getAllAdminPropertyUnits(propertyId),
          getAllAdminPropertyMaintenance(propertyId),
          getAdminOwners({ page: 1, per_page: 100 }),
          getAdminTenants({ page: 1, per_page: 100 }),
        ]);

        if (!active) {
          return;
        }

        setPropertyDetail(detailResponse.data);
        setOwners(ownersResponse.data);
        setAvailableTenants(tenantsResponse.data);
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

  const tenantStatusOptions = useMemo(
    () =>
      uniqueFilterOptions(
        tenantRows,
        (tenant) => tenant.payment_status,
        (value) => paymentLabelMap[value]
      ),
    [tenantRows]
  );

  const tenantFiltered = useMemo(() => {
    const searchValue = tenantSearch.trim().toLowerCase();

    return tenantRows
      .filter((tenant) => {
        const searchableText = [
          tenant.tenant_name,
          tenant.tenant_email,
          tenant.mobile_phone,
          tenant.tenant_phone,
          tenant.unit_name,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return (
          (!searchValue || searchableText.includes(searchValue)) &&
          (tenantStatus ? tenant.payment_status === tenantStatus : true)
        );
      })
      .sort((first, second) =>
        naturalCollator.compare(first.tenant_name, second.tenant_name)
      );
  }, [tenantRows, tenantSearch, tenantStatus]);

  useEffect(() => {
    if (!hasFilterOption(tenantStatusOptions, tenantStatus)) {
      setTenantStatus("");
    }
  }, [tenantStatus, tenantStatusOptions]);

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

  const propertyPhotoUrls = useMemo(() => {
    if (!propertyDetail) {
      return [];
    }

    const source = propertyDetail.property.photo_urls?.length
      ? propertyDetail.property.photo_urls
      : propertyDetail.property.roomphoto_urls?.length
        ? propertyDetail.property.roomphoto_urls
        : [];

    return source.filter((item): item is string => Boolean(item));
  }, [propertyDetail]);

  const images = useMemo(() => {
    if (propertyPhotoUrls.length === 0) {
      return ["/bg-1200.webp"];
    }

    return propertyPhotoUrls.map((item) => resolveMediaImageUrl(item));
  }, [propertyPhotoUrls]);

  useEffect(() => {
    setActiveImageIndex(0);
  }, [propertyDetail?.property.id, images.length]);

  const selectedImage = images[Math.min(activeImageIndex, images.length - 1)] || "/bg-1200.webp";

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

  const propertyStructure = useMemo(() => {
    return buildPropertyStructure({
      propertyId: propertyDetail?.property.id || propertyId || "-",
      propertyName: propertyDetail?.property.name || "Properti",
      units: unitRows,
      tenants: tenantRows,
      owners,
      fallbackOwner: propertyDetail?.property.user || null,
    });
  }, [owners, propertyDetail, propertyId, tenantRows, unitRows]);

  const unitStructureLookup = useMemo(() => {
    const lookup = new Map<number, PropertyStructureUnit>();

    propertyStructure.blocks.forEach((block) => {
      block.units.forEach((unit) => {
        lookup.set(unit.id, unit);
      });
    });

    return lookup;
  }, [propertyStructure]);

  const unitStatusOptions = useMemo(
    () =>
      uniqueFilterOptions(
        unitRows,
        (unit) => unitStructureLookup.get(unit.unit_id)?.status || unit.status,
        (value) => unitStatusLabelMap[value]
      ),
    [unitRows, unitStructureLookup]
  );

  const unitBuildingOptions = useMemo(
    () =>
      propertyStructure.blocks.map((block) => ({
        value: block.name,
        label: block.name,
      })),
    [propertyStructure.blocks]
  );

  const unitTypeOptions = useMemo(
    () =>
      uniqueFilterOptions(
        unitRows,
        (unit) => unit.unit_type,
        (value) => formatReadableText(value)
      ),
    [unitRows]
  );

  const unitFiltered = useMemo(() => {
    const searchValue = unitSearch.trim().toLowerCase();

    const getUnitValues = (unit: AdminPropertyUnitRow) => {
      const structuredUnit = unitStructureLookup.get(unit.unit_id);
      const ownerName =
        unit.owner_name ||
        propertyStructure.blocks.find((block) =>
          block.units.some((item) => item.id === unit.unit_id)
        )?.ownerName ||
        "";
      const buildingName = structuredUnit?.buildingName || "";
      const displayName = structuredUnit?.displayName || unit.unit_name;
      const statusValue = structuredUnit?.status || unit.status || "";

      return {
        buildingName,
        displayName,
        ownerName,
        statusValue,
        searchText: [
          unit.unit_name,
          displayName,
          buildingName,
          unit.unit_type,
          ownerName,
          unit.tenant_name,
          unit.tenant_email,
          unit.mobile_phone,
          statusValue,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase(),
      };
    };

    return unitRows
      .filter((unit) => {
        const unitValues = getUnitValues(unit);

        return (
          (!searchValue || unitValues.searchText.includes(searchValue)) &&
          (unitStatus ? unitValues.statusValue === unitStatus : true) &&
          (unitBuilding ? unitValues.buildingName === unitBuilding : true) &&
          (unitType ? unit.unit_type === unitType : true)
        );
      })
      .sort((first, second) => {
        const firstValues = getUnitValues(first);
        const secondValues = getUnitValues(second);
        const fallbackCompare =
          naturalCollator.compare(firstValues.buildingName, secondValues.buildingName) ||
          naturalCollator.compare(firstValues.displayName, secondValues.displayName);

        switch (unitSort) {
          case "unit_asc":
            return (
              naturalCollator.compare(firstValues.displayName, secondValues.displayName) ||
              naturalCollator.compare(firstValues.buildingName, secondValues.buildingName)
            );
          case "status_asc":
            return (
              naturalCollator.compare(
                unitStatusLabelMap[firstValues.statusValue] || firstValues.statusValue,
                unitStatusLabelMap[secondValues.statusValue] || secondValues.statusValue
              ) || fallbackCompare
            );
          case "price_asc":
            return Number(first.price || 0) - Number(second.price || 0) || fallbackCompare;
          case "price_desc":
            return Number(second.price || 0) - Number(first.price || 0) || fallbackCompare;
          case "capacity_desc":
            return (
              Number(second.people_allowed || 0) -
                Number(first.people_allowed || 0) ||
              fallbackCompare
            );
          case "building_unit_asc":
          default:
            return fallbackCompare;
        }
      });
  }, [
    propertyStructure.blocks,
    unitBuilding,
    unitRows,
    unitSearch,
    unitSort,
    unitStatus,
    unitStructureLookup,
    unitType,
  ]);

  useEffect(() => {
    if (!hasFilterOption(unitStatusOptions, unitStatus)) {
      setUnitStatus("");
    }
  }, [unitStatus, unitStatusOptions]);

  useEffect(() => {
    if (!hasFilterOption(unitBuildingOptions, unitBuilding)) {
      setUnitBuilding("");
    }
  }, [unitBuilding, unitBuildingOptions]);

  useEffect(() => {
    if (!hasFilterOption(unitTypeOptions, unitType)) {
      setUnitType("");
    }
  }, [unitType, unitTypeOptions]);

  const blockNameOptions = useMemo(() => {
    return propertyStructure.blocks
      .map((block) => block.name)
      .filter((name) => name !== "Blok belum diatur");
  }, [propertyStructure]);

  const activeTenantOptions = useMemo(() => {
    return [...availableTenants]
      .filter((tenant) => tenant.role === "tenant")
      .sort((a, b) =>
        naturalCollator.compare(a.full_name || a.email || "", b.full_name || b.email || "")
      );
  }, [availableTenants]);

  const availableUnitOptions = useMemo(() => {
    return [...unitRows]
      .filter((unit) => {
        if (editingTenantRow && unit.unit_id === editingTenantRow.unit_id) {
          return true;
        }

        return !unit.tenant_name && unit.status !== "maintenance";
      })
      .sort((a, b) => naturalCollator.compare(a.unit_name || "", b.unit_name || ""));
  }, [editingTenantRow, unitRows]);

  const resetUnitMediaInputs = () => {
    setUnitPhotos([]);
    setUnitVideoFile(null);
    setUnitVideo360File(null);
  };

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

  const savePropertyPhotoOrder = async (
    nextPhotoUrls: string[],
    successMessage: string
  ) => {
    if (!propertyId || !propertyDetail || isSavingMediaOrder) {
      return;
    }

    setIsSavingMediaOrder(true);
    setError(null);
    setNotice(null);

    try {
      const response = await updateAdminPropertyMediaOrder(propertyId, {
        photo_urls: nextPhotoUrls,
        roomphoto_urls: nextPhotoUrls,
      });

      setPropertyDetail(response.data);
      setActiveImageIndex((currentIndex) => {
        if (nextPhotoUrls.length === 0) {
          return 0;
        }

        return Math.min(currentIndex, nextPhotoUrls.length - 1);
      });
      setNotice({
        variant: "success",
        message: successMessage,
      });
    } catch (mediaError) {
      setError(
        getApiErrorMessage(
          mediaError,
          "Gagal memperbarui media properti. Coba lagi beberapa saat."
        )
      );
    } finally {
      setIsSavingMediaOrder(false);
      setDraggedPhotoIndex(null);
    }
  };

  const movePropertyPhoto = (fromIndex: number, toIndex: number) => {
    if (
      fromIndex === toIndex ||
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= propertyPhotoUrls.length ||
      toIndex >= propertyPhotoUrls.length
    ) {
      return;
    }

    const nextPhotoUrls = [...propertyPhotoUrls];
    const [movedPhoto] = nextPhotoUrls.splice(fromIndex, 1);
    nextPhotoUrls.splice(toIndex, 0, movedPhoto);
    setActiveImageIndex(toIndex);

    void savePropertyPhotoOrder(
      nextPhotoUrls,
      "Urutan media properti berhasil diperbarui."
    );
  };

  const handleDropPropertyPhoto = (toIndex: number) => {
    if (draggedPhotoIndex === null) {
      return;
    }

    movePropertyPhoto(draggedPhotoIndex, toIndex);
  };

  const handleDeletePropertyPhoto = (index: number) => {
    const photoUrl = propertyPhotoUrls[index];
    if (!photoUrl) {
      return;
    }

    const agreed = window.confirm(
      "Hapus media ini dari galeri properti? Tindakan ini tidak bisa dibatalkan."
    );
    if (!agreed) {
      return;
    }

    const nextPhotoUrls = propertyPhotoUrls.filter((_, photoIndex) => {
      return photoIndex !== index;
    });

    void savePropertyPhotoOrder(
      nextPhotoUrls,
      "Media properti berhasil dihapus."
    );
  };

  const handleDeletePropertyVideo = async (
    mediaType: "video" | "video_360"
  ) => {
    if (!propertyId || !propertyDetail || isSavingMediaOrder) {
      return;
    }

    const agreed = window.confirm(
      "Hapus media ini dari properti? Tindakan ini tidak bisa dibatalkan."
    );
    if (!agreed) {
      return;
    }

    setIsSavingMediaOrder(true);
    setError(null);
    setNotice(null);

    try {
      const response = await updateAdminPropertyMediaOrder(propertyId, {
        delete_video: mediaType === "video",
        delete_video_360: mediaType === "video_360",
      });

      setPropertyDetail(response.data);
      setNotice({
        variant: "success",
        message: "Media properti berhasil dihapus.",
      });
    } catch (mediaError) {
      setError(
        getApiErrorMessage(
          mediaError,
          "Gagal menghapus media properti. Coba lagi beberapa saat."
        )
      );
    } finally {
      setIsSavingMediaOrder(false);
    }
  };

  const updateBlockMediaDraft = (
    blockKey: string,
    nextDraft: Partial<{ photos: File[]; video: File | null; video360: File | null }>
  ) => {
    setBlockMediaFiles((prev) => {
      const current = prev[blockKey] || {
        photos: [],
        video: null,
        video360: null,
      };

      return {
        ...prev,
        [blockKey]: {
          ...current,
          ...nextDraft,
        },
      };
    });
  };

  const resetBlockMediaDraft = (blockKey: string) => {
    setBlockMediaFiles((prev) => {
      const next = { ...prev };
      delete next[blockKey];
      return next;
    });
  };

  const handleSaveBlockMedia = async (block: PropertyStructure["blocks"][number]) => {
    if (!propertyId || !block.id || savingBlockMediaId) {
      return;
    }

    const draft = blockMediaFiles[block.key] || {
      photos: [],
      video: null,
      video360: null,
    };

    if (draft.photos.length === 0 && !draft.video && !draft.video360) {
      setNotice({
        variant: "error",
        message: "Pilih media blok terlebih dahulu.",
      });
      return;
    }

    setSavingBlockMediaId(block.id);
    setError(null);
    setNotice(null);

    try {
      const response = await updateAdminPropertyBlockMedia(propertyId, block.id, {
        photos: draft.photos,
        video: draft.video,
        video_360: draft.video360,
      });

      setPropertyDetail(response.data);
      resetBlockMediaDraft(block.key);
      setNotice({
        variant: "success",
        message: `Media ${block.name} berhasil disimpan.`,
      });
      setRefreshKey((prev) => prev + 1);
    } catch (blockMediaError) {
      setError(
        getApiErrorMessage(
          blockMediaError,
          "Gagal menyimpan media blok. Coba lagi beberapa saat."
        )
      );
    } finally {
      setSavingBlockMediaId(null);
    }
  };

  const handleDeleteBlockMedia = async (
    block: PropertyStructure["blocks"][number],
    mediaType: "photo" | "video" | "video_360",
    photoIndex?: number
  ) => {
    if (!propertyId || !block.id || savingBlockMediaId) {
      return;
    }

    const agreed = window.confirm(
      "Hapus media blok ini? Tindakan ini tidak bisa dibatalkan."
    );
    if (!agreed) {
      return;
    }

    setSavingBlockMediaId(block.id);
    setError(null);
    setNotice(null);

    try {
      const nextPhotoUrls =
        mediaType === "photo"
          ? block.photoUrls.filter((_, index) => index !== photoIndex)
          : undefined;

      const response = await updateAdminPropertyBlockMedia(propertyId, block.id, {
        photo_urls: nextPhotoUrls,
        roomphoto_urls: nextPhotoUrls,
        delete_video: mediaType === "video",
        delete_video_360: mediaType === "video_360",
      });

      setPropertyDetail(response.data);
      setNotice({
        variant: "success",
        message: `Media ${block.name} berhasil dihapus.`,
      });
      setRefreshKey((prev) => prev + 1);
    } catch (blockMediaError) {
      setError(
        getApiErrorMessage(
          blockMediaError,
          "Gagal menghapus media blok. Coba lagi beberapa saat."
        )
      );
    } finally {
      setSavingBlockMediaId(null);
    }
  };

  const openCreateTenantForm = () => {
    setNotice(null);
    setError(null);
    setEditingTenantRow(null);
    setTenantForm(getInitialTenantAssignmentForm());
    setShowTenantForm((prev) => !prev);
  };

  const openEditTenantForm = (tenant: AdminPropertyTenantRow) => {
    setNotice(null);
    setError(null);
    setEditingTenantRow(tenant);
    setTenantForm({
      tenantId: String(tenant.tenant_id),
      unitId: String(tenant.unit_id),
      startDate: toInputDate(tenant.lease_start) || getTodayInputDate(),
      endDate: toInputDate(tenant.lease_end),
      paymentStatus: tenant.payment_status === "paid" ? "paid" : "unpaid",
    });
    setShowTenantForm(true);
  };

  const closeTenantForm = () => {
    if (isSavingTenant) {
      return;
    }

    setShowTenantForm(false);
    setEditingTenantRow(null);
    setTenantForm(getInitialTenantAssignmentForm());
  };

  const handleSubmitTenantForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!propertyId || isSavingTenant) {
      return;
    }

    const parsedPropertyId = Number(propertyId);
    const parsedTenantId = Number(tenantForm.tenantId);
    const parsedUnitId = Number(tenantForm.unitId);
    const isEditing = Boolean(editingTenantRow);

    if (!Number.isFinite(parsedPropertyId) || parsedPropertyId <= 0) {
      setError("Data properti tidak valid.");
      return;
    }

    if (!isEditing && (!Number.isFinite(parsedTenantId) || parsedTenantId <= 0)) {
      setError("Pilih akun penyewa terlebih dahulu.");
      return;
    }

    if (!Number.isFinite(parsedUnitId) || parsedUnitId <= 0) {
      setError("Pilih unit yang akan ditempati.");
      return;
    }

    if (!tenantForm.startDate || !tenantForm.endDate) {
      setError("Tanggal mulai dan tanggal akhir sewa wajib diisi.");
      return;
    }

    if (tenantForm.endDate < tenantForm.startDate) {
      setError("Tanggal akhir sewa tidak boleh lebih awal dari tanggal mulai.");
      return;
    }

    setIsSavingTenant(true);
    setError(null);
    setNotice(null);

    try {
      if (isEditing && editingTenantRow) {
        const payload: AdminPropertyTenantUpdatePayload = {
          unit_id: parsedUnitId,
          start_date: tenantForm.startDate,
          end_date: tenantForm.endDate,
          payment_status: tenantForm.paymentStatus,
        };

        await updateAdminPropertyTenant(
          parsedPropertyId,
          editingTenantRow.lease_id,
          payload
        );
      } else {
        await createAdminPropertyTenant(parsedPropertyId, {
          tenant_id: parsedTenantId,
          unit_id: parsedUnitId,
          start_date: tenantForm.startDate,
          end_date: tenantForm.endDate,
          payment_status: tenantForm.paymentStatus,
        });
      }

      setShowTenantForm(false);
      setEditingTenantRow(null);
      setTenantForm(getInitialTenantAssignmentForm());
      setNotice({
        variant: "success",
        message: isEditing
          ? "Data penghuni berhasil diperbarui."
          : "Penghuni berhasil ditambahkan ke properti.",
      });
      setRefreshKey((prev) => prev + 1);
    } catch (saveError) {
      setError(
        getApiErrorMessage(
          saveError,
          isEditing
            ? "Gagal memperbarui penghuni."
            : "Gagal menambahkan penghuni."
        )
      );
    } finally {
      setIsSavingTenant(false);
    }
  };

  const handleDeleteTenant = async () => {
    if (!propertyId || !deleteTenantTarget || isDeletingTenantLeaseId === deleteTenantTarget.lease_id) {
      return;
    }

    setIsDeletingTenantLeaseId(deleteTenantTarget.lease_id);
    setError(null);
    setNotice(null);

    try {
      await deleteAdminPropertyTenant(propertyId, deleteTenantTarget.lease_id);
      setDeleteTenantTarget(null);
      setNotice({
        variant: "success",
        message: `Penghuni ${deleteTenantTarget.tenant_name} berhasil dihapus dari properti.`,
      });
      setRefreshKey((prev) => prev + 1);
    } catch (deleteError) {
      setError(
        getApiErrorMessage(deleteError, "Gagal menghapus penghuni dari properti.")
      );
    } finally {
      setIsDeletingTenantLeaseId(null);
    }
  };

  const handleAddUnit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!propertyId || isSavingUnit) {
      return;
    }

    const parsedPropertyId = Number(propertyId);
    const parsedPeopleAllowed = Number(unitForm.people_allowed);
    const parsedPrice = Number(unitForm.price);
    const parsedPromoPrice = Number(unitForm.promo_price);
    const parsedDiscountPercent = Number(unitForm.discount_percent);
    const promoPriceValue =
      Number.isFinite(parsedPromoPrice) && parsedPromoPrice > 0
        ? parsedPromoPrice
        : null;
    const discountPercentValue =
      Number.isFinite(parsedDiscountPercent) &&
      parsedDiscountPercent > 0 &&
      parsedDiscountPercent < 100
        ? parsedDiscountPercent
        : null;
    const effectivePromoPrice =
      promoPriceValue ??
      (discountPercentValue != null
        ? Math.round((parsedPrice * (100 - discountPercentValue)) / 100)
        : null);
    const isEditing = Boolean(editingUnitId);

    if (
      !Number.isFinite(parsedPropertyId) ||
      parsedPropertyId <= 0 ||
      unitForm.buildingName.trim() === "" ||
      unitForm.name.trim() === "" ||
      !Number.isFinite(parsedPeopleAllowed) ||
      parsedPeopleAllowed <= 0 ||
      !Number.isFinite(parsedPrice) ||
      parsedPrice <= 0 ||
      (promoPriceValue != null && promoPriceValue >= parsedPrice) ||
      (discountPercentValue != null && effectivePromoPrice != null && effectivePromoPrice >= parsedPrice)
    ) {
      setError(
        "Data unit belum valid. Periksa blok, nama unit, kapasitas, dan harga promo."
      );
      return;
    }

    setIsSavingUnit(true);
    setError(null);
    setNotice(null);

    try {
      const parsedOwnerId = Number(unitForm.ownerId);
      const unitPayloadName = buildPersistedUnitName(
        unitForm.buildingName,
        unitForm.name
      );
      const blockPayload = {
        building_name: unitForm.buildingName.trim(),
        block_name: unitForm.buildingName.trim(),
        owner_id:
          Number.isFinite(parsedOwnerId) && parsedOwnerId > 0
            ? parsedOwnerId
            : undefined,
        notes: unitForm.notes.trim() || undefined,
      };

      if (isEditing) {
        const payload: AdminUnitUpdatePayload = {
          name: unitPayloadName,
          ...blockPayload,
          unit_type: unitForm.unit_type,
          status: unitForm.status,
          people_allowed: parsedPeopleAllowed,
          price: parsedPrice,
          promo_price: effectivePromoPrice ?? undefined,
          discount_percent: discountPercentValue ?? undefined,
          photos: unitPhotos,
          video: unitVideoFile,
          video_360: unitVideo360File,
        };

        await updateAdminUnit(editingUnitId as number, payload);
      } else {
        await createAdminUnit({
          property_id: parsedPropertyId,
          name: unitPayloadName,
          ...blockPayload,
          unit_type: unitForm.unit_type,
          status: unitForm.status,
          people_allowed: parsedPeopleAllowed,
          price: parsedPrice,
          promo_price: effectivePromoPrice ?? undefined,
          discount_percent: discountPercentValue ?? undefined,
          photos: unitPhotos,
          video: unitVideoFile,
          video_360: unitVideo360File,
        });
      }

      setUnitForm(getInitialUnitForm(propertyDetail?.property.user?.id));
      resetUnitMediaInputs();
      setEditingUnitId(null);
      setShowAddUnitForm(false);
      setNotice({
        variant: "success",
        message: isEditing
          ? "Data unit berhasil diperbarui."
          : "Unit baru berhasil ditambahkan.",
      });
      setRefreshKey((prev) => prev + 1);
    } catch (addError) {
      setError(
        getApiErrorMessage(
          addError,
          isEditing
            ? "Gagal memperbarui unit. Coba lagi beberapa saat."
            : "Gagal menambahkan unit. Coba lagi beberapa saat."
        )
      );
    } finally {
      setIsSavingUnit(false);
    }
  };

  const openCreateUnitForm = () => {
    setNotice(null);
    setError(null);
    setEditingUnitId(null);
    setUnitForm(getInitialUnitForm(propertyDetail?.property.user?.id));
    resetUnitMediaInputs();
    setShowAddUnitForm((prev) => (prev && !editingUnitId ? false : true));
  };

  const openEditUnitForm = (unit: AdminPropertyUnitRow) => {
    setNotice(null);
    setError(null);
    setEditingUnitId(unit.unit_id);
    const identity = parseUnitIdentity({
      unitName: unit.unit_name,
      buildingName: unit.building_name || unit.block_name,
    });
    setUnitForm({
      buildingName: identity.buildingName === "Blok belum diatur" ? "" : identity.buildingName,
      ownerId: unit.owner_id
        ? String(unit.owner_id)
        : propertyDetail?.property.user?.id
          ? String(propertyDetail.property.user.id)
          : "",
      name: identity.unitName,
      unit_type: unit.unit_type,
      status: unit.status as "vacant" | "occupied" | "booking" | "maintenance",
      people_allowed: String(unit.people_allowed || 1),
      price: String(unit.price || ""),
      promo_price: String(unit.promo_price || ""),
      discount_percent: String(unit.discount_percent || ""),
      notes: unit.notes || unit.description || "",
    });
    resetUnitMediaInputs();
    setShowAddUnitForm(true);
  };

  const closeUnitForm = () => {
    if (isSavingUnit) {
      return;
    }

    setShowAddUnitForm(false);
    setEditingUnitId(null);
    setUnitForm(getInitialUnitForm(propertyDetail?.property.user?.id));
    resetUnitMediaInputs();
  };

  const handleDeleteUnit = async () => {
    if (!deleteUnitTarget || isDeletingUnitId === deleteUnitTarget.unit_id) {
      return;
    }

    setIsDeletingUnitId(deleteUnitTarget.unit_id);
    setError(null);
    setNotice(null);

    try {
      await deleteAdminUnit(deleteUnitTarget.unit_id);
      setDeleteUnitTarget(null);
      setNotice({
        variant: "success",
        message: `Unit ${deleteUnitTarget.unit_name} berhasil dihapus.`,
      });
      setRefreshKey((prev) => prev + 1);
    } catch (deleteError) {
      setError(
        getApiErrorMessage(
          deleteError,
          "Gagal menghapus unit. Pastikan unit tidak memiliki data sewa atau pembayaran terkait."
        )
      );
    } finally {
      setIsDeletingUnitId(null);
    }
  };

  const editingUnit = editingUnitId
    ? unitRows.find((unit) => unit.unit_id === editingUnitId) || null
    : null;
  const editingUnitPhotoCount = editingUnit ? getUnitPhotoUrls(editingUnit).length : 0;
  const editingUnitVideoCount = editingUnit ? getUnitVideoCount(editingUnit) : 0;
  const hasActiveUnitFilter =
    unitSearch.trim() !== "" ||
    unitStatus !== "" ||
    unitBuilding !== "" ||
    unitType !== "" ||
    unitSort !== defaultUnitSort;

  return (
    <div className="space-y-6">
      {deleteTenantTarget ? (
        <DeleteTenantDialog
          tenant={deleteTenantTarget}
          isSubmitting={isDeletingTenantLeaseId === deleteTenantTarget.lease_id}
          onClose={() => {
            if (isDeletingTenantLeaseId !== deleteTenantTarget.lease_id) {
              setDeleteTenantTarget(null);
            }
          }}
          onConfirm={() => {
            void handleDeleteTenant();
          }}
        />
      ) : null}

      {deleteUnitTarget ? (
        <DeleteUnitDialog
          unit={deleteUnitTarget}
          isSubmitting={isDeletingUnitId === deleteUnitTarget.unit_id}
          onClose={() => {
            if (isDeletingUnitId !== deleteUnitTarget.unit_id) {
              setDeleteUnitTarget(null);
            }
          }}
          onConfirm={() => {
            void handleDeleteUnit();
          }}
        />
      ) : null}

      <section className="rounded-3xl bg-gradient-to-r from-[#1E2746] to-[#2A3B78] p-4 text-white shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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

          <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-center">
            <button
              type="button"
              onClick={() => router.push("/admin/properties")}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-white/15 px-4 text-sm font-medium text-white hover:bg-white/25 sm:w-auto"
            >
              <ArrowLeft size={16} />
              Kembali
            </button>

            <button
              type="button"
              onClick={() => setShowEditModal(true)}
              disabled={isLoading || !propertyDetail || isUpdating || isDeleting}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-[#1E2746] hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              <Pencil size={16} />
              {isUpdating ? "Menyimpan..." : "Ubah Properti"}
            </button>

            <button
              type="button"
              onClick={() => {
                void handleDeleteProperty();
              }}
              disabled={isDeleting || isLoading || !propertyDetail || isUpdating}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-red-300 bg-red-100 px-4 text-sm font-semibold text-red-700 hover:bg-red-200 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
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
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500 sm:p-6">
          Memuat detail properti...
        </div>
      ) : !propertyDetail ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500 sm:p-6">
          Data properti tidak ditemukan.
        </div>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <StatCard
              icon={<Building2 size={16} />}
              label="Blok"
              value={String(propertyStructure.blockCount)}
              tone="default"
            />
            <StatCard
              icon={<Building2 size={16} />}
              label="Total Unit"
              value={String(propertyStructure.totalUnits || propertyDetail.stats.total_units)}
              tone="default"
            />
            <StatCard
              icon={<Users size={16} />}
              label="Unit Terisi"
              value={String(propertyStructure.occupiedUnits || propertyDetail.stats.occupied_units)}
              tone="success"
            />
            <StatCard
              icon={<DoorOpen size={16} />}
              label="Unit Kosong"
              value={String(propertyStructure.vacantUnits || propertyDetail.stats.vacant_units)}
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

          {propertyDetail.stats.total_units === 0 ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Properti ini belum tampil di sisi penyewa karena belum memiliki unit.
              Tambahkan minimal satu unit dengan status <span className="font-semibold">kosong</span>
              {" "}agar properti masuk ke katalog penyewa.
            </div>
          ) : propertyDetail.stats.vacant_units === 0 ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Properti ini belum tampil di sisi penyewa karena semua unit sedang
              terisi atau perawatan. Ubah minimal satu unit ke status
              <span className="font-semibold"> kosong</span> agar tampil di katalog penyewa.
            </div>
          ) : null}

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <div className="space-y-5 xl:col-span-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="mb-4 flex items-center gap-2">
                  <ImageIcon size={18} className="text-slate-500" />
                  <h2 className="text-lg font-semibold text-slate-800">
                    Galeri Properti
                  </h2>
                </div>

                <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                  <div className="relative aspect-[16/9] w-full">
                    <SafeBookingImage
                      src={selectedImage || "/bg-1200.webp"}
                      alt={propertyDetail.property.name}
                      className="object-cover"
                      sizes="(max-width: 1280px) 100vw, 66vw"
                    />
                  </div>
                </div>

                {propertyPhotoUrls.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5">
                    {propertyPhotoUrls.map((photoUrl, index) => {
                      const image = resolveMediaImageUrl(photoUrl);
                      const isActive = index === activeImageIndex;
                      const isDragged = index === draggedPhotoIndex;

                      return (
                        <div
                          key={`${photoUrl}-${index}`}
                          draggable={!isSavingMediaOrder}
                          onDragStart={(event) => {
                            setDraggedPhotoIndex(index);
                            event.dataTransfer.effectAllowed = "move";
                            event.dataTransfer.setData("text/plain", String(index));
                          }}
                          onDragOver={(event) => {
                            event.preventDefault();
                            event.dataTransfer.dropEffect = "move";
                          }}
                          onDrop={(event) => {
                            event.preventDefault();
                            handleDropPropertyPhoto(index);
                          }}
                          onDragEnd={() => setDraggedPhotoIndex(null)}
                          className={`rounded-xl border bg-white p-1.5 transition ${
                            isActive
                              ? "border-[#1E2746] ring-2 ring-[#1E2746]/20"
                              : "border-slate-200 hover:border-slate-300"
                          } ${isDragged ? "opacity-60" : ""}`}
                        >
                          <button
                            type="button"
                            onClick={() => setActiveImageIndex(index)}
                            disabled={isSavingMediaOrder}
                            className="relative block h-20 w-full overflow-hidden rounded-lg bg-slate-100 disabled:opacity-70"
                            title={`Pilih media ${index + 1}`}
                          >
                            <div className="relative h-full w-full">
                              <SafeBookingImage
                                src={image || "/bg-1200.webp"}
                                alt={`${propertyDetail.property.name} ${index + 1}`}
                                className="object-cover"
                                sizes="(max-width: 1024px) 50vw, 20vw"
                              />
                            </div>
                            <span className="absolute left-1.5 top-1.5 rounded-full bg-slate-900/75 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                              {index + 1}
                            </span>
                          </button>
                          <div className="mt-1.5 grid grid-cols-4 gap-1">
                            <button
                              type="button"
                              onClick={() => movePropertyPhoto(index, index - 1)}
                              disabled={isSavingMediaOrder || index === 0}
                              className="inline-flex h-7 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                              title="Geser ke kiri"
                            >
                              <ChevronLeft size={14} />
                            </button>
                            <span
                              className="inline-flex h-7 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-500"
                              title="Geser dengan drag"
                            >
                              <GripVertical size={14} />
                            </span>
                            <button
                              type="button"
                              onClick={() => movePropertyPhoto(index, index + 1)}
                              disabled={
                                isSavingMediaOrder ||
                                index === propertyPhotoUrls.length - 1
                              }
                              className="inline-flex h-7 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                              title="Geser ke kanan"
                            >
                              <ChevronRight size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePropertyPhoto(index)}
                              disabled={isSavingMediaOrder}
                              className="inline-flex h-7 items-center justify-center rounded-md border border-red-100 text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                              title="Hapus media"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
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
                            className="relative overflow-hidden rounded-xl border border-slate-200 bg-black"
                          >
                            <SafeBookingVideo
                              src={video}
                              className="h-52 w-full"
                            />
                            <button
                              type="button"
                              onClick={() => void handleDeletePropertyVideo("video")}
                              disabled={isSavingMediaOrder}
                              className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-100 bg-white/95 text-red-600 shadow-sm transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                              title="Hapus video"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-700">Media 360</p>
                    {video360Url ? (
                      <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-black">
                        <SafeBookingVideo src={video360Url} className="h-52 w-full" />
                        <button
                          type="button"
                          onClick={() => void handleDeletePropertyVideo("video_360")}
                          disabled={isSavingMediaOrder}
                          className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-100 bg-white/95 text-red-600 shadow-sm transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                          title="Hapus media 360"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ) : photo360Url ? (
                      <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                        <div className="relative h-52 w-full">
                          <SafeBookingImage
                            src={photo360Url || "/bg-1200.webp"}
                            alt={`Foto 360 ${propertyDetail.property.name}`}
                            className="object-cover"
                            sizes="100vw"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleDeletePropertyVideo("video_360")}
                          disabled={isSavingMediaOrder}
                          className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-100 bg-white/95 text-red-600 shadow-sm transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                          title="Hapus media 360"
                        >
                          <Trash2 size={14} />
                        </button>
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
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
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
                    label="Owner Default"
                    value={propertyDetail.property.user?.full_name || "-"}
                  />
                  <InfoRow
                    label="Email Owner Default"
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

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
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

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
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

          <PropertyMappingSection
            structure={propertyStructure}
            blockMediaFiles={blockMediaFiles}
            savingBlockMediaId={savingBlockMediaId}
            onUpdateBlockMediaDraft={updateBlockMediaDraft}
            onSaveBlockMedia={handleSaveBlockMedia}
            onDeleteBlockMedia={handleDeleteBlockMedia}
          />

          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold text-slate-800">
                Daftar Penghuni ({tenantFiltered.length})
              </h2>
              <button
                type="button"
                onClick={openCreateTenantForm}
                className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 sm:w-auto"
              >
                <Plus size={14} />
                {showTenantForm && !editingTenantRow ? "Tutup Form Penghuni" : "Tambah Penghuni"}
              </button>
            </div>

            {showTenantForm ? (
              activeTenantOptions.length === 0 ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Akun penyewa belum tersedia. Tambahkan akun penyewa dulu di{" "}
                  <Link href="/admin/tenants" className="font-semibold underline">
                    Manajemen Penyewa
                  </Link>
                  .
                </div>
              ) : availableUnitOptions.length === 0 ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Belum ada unit kosong yang bisa ditempati penghuni baru.
                </div>
              ) : (
                <form
                  onSubmit={(event) => {
                    void handleSubmitTenantForm(event);
                  }}
                  className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-4 md:grid-cols-2"
                >
                  {editingTenantRow ? (
                    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm md:col-span-2">
                      <p className="font-medium text-slate-800">{editingTenantRow.tenant_name}</p>
                      <p className="mt-1 text-slate-500">
                        {editingTenantRow.tenant_email || editingTenantRow.mobile_phone || "-"}
                      </p>
                    </div>
                  ) : (
                    <select
                      value={tenantForm.tenantId}
                      onChange={(event) =>
                        setTenantForm((prev) => ({
                          ...prev,
                          tenantId: event.target.value,
                        }))
                      }
                      className="h-11 rounded-xl border border-slate-200 px-3 text-sm focus:border-[#1E2746] focus:outline-none focus:ring-2 focus:ring-[#1E2746]/20 md:col-span-2"
                    >
                      <option value="">Pilih akun penyewa</option>
                      {activeTenantOptions.map((tenant) => (
                        <option key={tenant.id} value={tenant.id}>
                          {tenant.full_name} - {tenant.email}
                        </option>
                      ))}
                    </select>
                  )}

                  <select
                    value={tenantForm.unitId}
                    onChange={(event) =>
                      setTenantForm((prev) => ({
                        ...prev,
                        unitId: event.target.value,
                      }))
                    }
                    className="h-11 rounded-xl border border-slate-200 px-3 text-sm focus:border-[#1E2746] focus:outline-none focus:ring-2 focus:ring-[#1E2746]/20"
                  >
                    <option value="">Pilih unit</option>
                    {availableUnitOptions.map((unit) => (
                      <option key={unit.unit_id} value={unit.unit_id}>
                        {unitStructureLookup.get(unit.unit_id)
                          ? `${unitStructureLookup.get(unit.unit_id)?.buildingName} / ${unitStructureLookup.get(unit.unit_id)?.displayName}`
                          : unit.unit_name}{" "}
                        - {formatReadableText(unit.unit_type)}
                      </option>
                    ))}
                  </select>

                  <select
                    value={tenantForm.paymentStatus}
                    onChange={(event) =>
                      setTenantForm((prev) => ({
                        ...prev,
                        paymentStatus: event.target.value as "paid" | "unpaid",
                      }))
                    }
                    className="h-11 rounded-xl border border-slate-200 px-3 text-sm focus:border-[#1E2746] focus:outline-none focus:ring-2 focus:ring-[#1E2746]/20"
                  >
                    <option value="unpaid">Belum Dibayar</option>
                    <option value="paid">Lunas</option>
                  </select>

                  <input
                    type="date"
                    value={tenantForm.startDate}
                    onChange={(event) =>
                      setTenantForm((prev) => ({
                        ...prev,
                        startDate: event.target.value,
                      }))
                    }
                    className="h-11 rounded-xl border border-slate-200 px-3 text-sm focus:border-[#1E2746] focus:outline-none focus:ring-2 focus:ring-[#1E2746]/20"
                  />

                  <input
                    type="date"
                    value={tenantForm.endDate}
                    onChange={(event) =>
                      setTenantForm((prev) => ({
                        ...prev,
                        endDate: event.target.value,
                      }))
                    }
                    className="h-11 rounded-xl border border-slate-200 px-3 text-sm focus:border-[#1E2746] focus:outline-none focus:ring-2 focus:ring-[#1E2746]/20"
                  />

                  <div className="flex items-center justify-end md:col-span-2">
                    <button
                      type="button"
                      onClick={closeTenantForm}
                      disabled={isSavingTenant}
                      className="mr-2 inline-flex h-11 items-center rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingTenant}
                      className="inline-flex h-11 items-center rounded-xl bg-[#1E2746] px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSavingTenant
                        ? editingTenantRow
                          ? "Menyimpan Perubahan..."
                          : "Menyimpan Penghuni..."
                        : editingTenantRow
                          ? "Simpan Perubahan"
                          : "Simpan Penghuni"}
                    </button>
                  </div>
                </form>
              )
            ) : null}

                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
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
                {tenantStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-[1180px] w-full text-sm">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="p-2.5 text-left font-semibold sm:p-3">Nama</th>
                    <th className="p-2.5 text-left font-semibold sm:p-3">Blok / Unit</th>
                    <th className="p-2.5 text-left font-semibold sm:p-3">Check-in</th>
                    <th className="p-2.5 text-left font-semibold sm:p-3">Nomor Telepon</th>
                    <th className="p-2.5 text-left font-semibold sm:p-3">Check-out</th>
                    <th className="p-2.5 text-left font-semibold sm:p-3">Lama Sewa</th>
                    <th className="p-2.5 text-left font-semibold sm:p-3">Keterangan</th>
                    <th className="p-2.5 text-left font-semibold sm:p-3">Status Pembayaran</th>
                    <th className="p-2.5 text-right font-semibold sm:p-3">Aksi</th>
                  </tr>
                </thead>

                <tbody>
                  {tenantFiltered.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-3 text-center text-slate-500 sm:p-4">
                        Tidak ada data penghuni.
                      </td>
                    </tr>
                  ) : (
                    tenantFiltered.map((tenant) => {
                      const structuredUnit = unitStructureLookup.get(tenant.unit_id);

                      return (
                        <tr
                          key={tenant.lease_id}
                          className="border-t border-slate-100 hover:bg-slate-50"
                        >
                          <td className="p-2.5 font-medium text-slate-800 sm:p-3">
                            {tenant.tenant_name}
                          </td>
                          <td className="p-2.5 text-slate-700 sm:p-3">
                            {structuredUnit
                              ? `${structuredUnit.buildingName} / ${structuredUnit.displayName}`
                              : tenant.unit_name}
                          </td>
                          <td className="p-2.5 text-slate-700 sm:p-3">
                            {formatDate(tenant.lease_start)}
                          </td>
                          <td className="p-2.5 text-slate-700 sm:p-3">
                            {tenant.mobile_phone || tenant.tenant_phone || "-"}
                          </td>
                          <td className="p-2.5 text-slate-700 sm:p-3">
                            {formatDate(tenant.lease_end)}
                          </td>
                          <td className="p-2.5 text-slate-700 sm:p-3">
                            {structuredUnit?.leaseDurationLabel || "-"}
                          </td>
                          <td className="p-2.5 text-slate-700 sm:p-3">
                            {tenant.notes ||
                              tenant.description ||
                              structuredUnit?.note ||
                              "-"}
                          </td>
                          <td className="p-2.5 sm:p-3">
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
                          <td className="p-2.5 sm:p-3">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => openEditTenantForm(tenant)}
                                disabled={isDeletingTenantLeaseId === tenant.lease_id}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                                title="Ubah penghuni"
                              >
                                <Pencil size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setNotice(null);
                                  setDeleteTenantTarget(tenant);
                                }}
                                disabled={isDeletingTenantLeaseId === tenant.lease_id}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                                title="Hapus penghuni"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold text-slate-800">
                Daftar Unit ({unitFiltered.length})
              </h2>
              <button
                type="button"
                onClick={openCreateUnitForm}
                className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-semibold text-blue-700 sm:w-auto"
              >
                <Plus size={14} />
                {showAddUnitForm && !editingUnitId ? "Tutup Form Unit" : "Tambah Unit"}
              </button>
            </div>

            {showAddUnitForm && (
              <form
                onSubmit={(event) => {
                  void handleAddUnit(event);
                }}
                className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-4 md:grid-cols-2"
              >
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">
                    Blok
                  </label>
                  <input
                    list="property-block-options"
                    placeholder="Contoh: A1 Cozy"
                    value={unitForm.buildingName}
                    onChange={(event) =>
                      setUnitForm((prev) => ({
                        ...prev,
                        buildingName: event.target.value,
                      }))
                    }
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm focus:border-[#1E2746] focus:outline-none focus:ring-2 focus:ring-[#1E2746]/20"
                  />
                  <datalist id="property-block-options">
                    {blockNameOptions.map((name) => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">
                    Owner Blok
                  </label>
                  <select
                    value={unitForm.ownerId}
                    onChange={(event) =>
                      setUnitForm((prev) => ({
                        ...prev,
                        ownerId: event.target.value,
                      }))
                    }
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm focus:border-[#1E2746] focus:outline-none focus:ring-2 focus:ring-[#1E2746]/20"
                  >
                    <option value="">Pilih owner</option>
                    {modalOwners.map((owner) => (
                      <option key={owner.id} value={owner.id}>
                        {owner.full_name}
                      </option>
                    ))}
                  </select>
                </div>

                <input
                  placeholder="Nama / Nomor Unit, contoh: 101"
                  value={unitForm.name}
                  onChange={(event) =>
                    setUnitForm((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                  className="h-11 rounded-xl border border-slate-200 px-3 text-sm focus:border-[#1E2746] focus:outline-none focus:ring-2 focus:ring-[#1E2746]/20"
                />

                <select
                  value={unitForm.unit_type}
                  onChange={(event) =>
                    setUnitForm((prev) => ({
                      ...prev,
                      unit_type: event.target.value,
                    }))
                  }
                  className="h-11 rounded-xl border border-slate-200 px-3 text-sm focus:border-[#1E2746] focus:outline-none focus:ring-2 focus:ring-[#1E2746]/20"
                >
                  <option value="standard">Standard</option>
                  <option value="premium">Premium</option>
                </select>

                <input
                  type="number"
                  min={1}
                  placeholder="Kapasitas (orang)"
                  value={unitForm.people_allowed}
                  onChange={(event) =>
                    setUnitForm((prev) => ({
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
                  value={unitForm.price}
                  onChange={(event) =>
                    setUnitForm((prev) => ({
                      ...prev,
                      price: event.target.value,
                    }))
                  }
                  className="h-11 rounded-xl border border-slate-200 px-3 text-sm focus:border-[#1E2746] focus:outline-none focus:ring-2 focus:ring-[#1E2746]/20"
                />

                <div className="grid gap-3 md:grid-cols-2">
                  <input
                    type="number"
                    min={1}
                    placeholder="Harga promo"
                    value={unitForm.promo_price}
                    onChange={(event) =>
                      setUnitForm((prev) => ({
                        ...prev,
                        promo_price: event.target.value,
                      }))
                    }
                    className="h-11 rounded-xl border border-slate-200 px-3 text-sm focus:border-[#1E2746] focus:outline-none focus:ring-2 focus:ring-[#1E2746]/20"
                  />
                  <input
                    type="number"
                    min={1}
                    max={99}
                    placeholder="Diskon (%)"
                    value={unitForm.discount_percent}
                    onChange={(event) =>
                      setUnitForm((prev) => ({
                        ...prev,
                        discount_percent: event.target.value,
                      }))
                    }
                    className="h-11 rounded-xl border border-slate-200 px-3 text-sm focus:border-[#1E2746] focus:outline-none focus:ring-2 focus:ring-[#1E2746]/20"
                  />
                </div>

                <p className="text-xs text-slate-500">
                  Isi salah satu: harga promo langsung atau diskon persentase.
                  Jika keduanya diisi, harga promo akan diprioritaskan.
                </p>

                <select
                  value={unitForm.status}
                  onChange={(event) =>
                    setUnitForm((prev) => ({
                      ...prev,
                      status: event.target.value as
                        | "vacant"
                        | "occupied"
                        | "booking"
                        | "maintenance",
                    }))
                  }
                  className="h-11 rounded-xl border border-slate-200 px-3 text-sm focus:border-[#1E2746] focus:outline-none focus:ring-2 focus:ring-[#1E2746]/20"
                >
                  <option value="vacant">Kosong</option>
                  <option value="occupied">Terisi</option>
                  <option value="booking">Booking</option>
                  <option value="maintenance">Perawatan</option>
                </select>

                <textarea
                  placeholder="Keterangan unit atau penghuni (opsional)"
                  value={unitForm.notes}
                  onChange={(event) =>
                    setUnitForm((prev) => ({
                      ...prev,
                      notes: event.target.value,
                    }))
                  }
                  rows={3}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-[#1E2746] focus:outline-none focus:ring-2 focus:ring-[#1E2746]/20 md:col-span-2"
                />

                <div className="grid gap-3 md:col-span-2 md:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                      <ImageIcon size={14} />
                      Foto Unit
                    </label>
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp,image/avif,image/heic,image/heif,.heic,.heif"
                      multiple
                      onChange={(event) =>
                        setUnitPhotos(Array.from(event.target.files || []))
                      }
                      className="w-full text-xs text-slate-600"
                    />
                    <p className="mt-2 text-[11px] text-slate-500">
                      {unitPhotos.length > 0
                        ? `${unitPhotos.length} foto baru dipilih dan akan dioptimasi ke WebP.`
                        : editingUnitPhotoCount > 0
                          ? `${editingUnitPhotoCount} foto unit sudah tersimpan.`
                          : "Belum ada foto unit. Foto baru akan dioptimasi ke WebP."}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                      <Video size={14} />
                      Video Unit
                    </label>
                    <input
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime"
                      onChange={(event) =>
                        setUnitVideoFile(event.target.files?.[0] || null)
                      }
                      className="w-full text-xs text-slate-600"
                    />
                    <p className="mt-2 text-[11px] text-slate-500">
                      {unitVideoFile
                        ? `Video baru: ${unitVideoFile.name}`
                        : editingUnit?.video_url
                          ? "Video unit sudah tersimpan."
                          : "Belum ada video unit."}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                      <Video size={14} />
                      Video 360 Unit
                    </label>
                    <input
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime"
                      onChange={(event) =>
                        setUnitVideo360File(event.target.files?.[0] || null)
                      }
                      className="w-full text-xs text-slate-600"
                    />
                    <p className="mt-2 text-[11px] text-slate-500">
                      {unitVideo360File
                        ? `Video 360 baru: ${unitVideo360File.name}`
                        : editingUnit?.video_360_url
                          ? "Video 360 unit sudah tersimpan."
                          : "Belum ada video 360 unit."}
                    </p>
                  </div>
                </div>

                {editingUnit && editingUnitVideoCount > 0 && (
                  <p className="text-xs text-slate-500 md:col-span-2">
                    Media baru akan ditambahkan ke data unit yang sudah ada.
                  </p>
                )}

                <div className="flex items-center justify-end md:col-span-2">
                  <button
                    type="button"
                    onClick={closeUnitForm}
                    disabled={isSavingUnit}
                    className="mr-2 inline-flex h-11 items-center rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingUnit}
                    className="inline-flex h-11 items-center rounded-xl bg-[#1E2746] px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSavingUnit
                      ? editingUnitId
                        ? "Menyimpan Perubahan..."
                        : "Menyimpan Unit..."
                      : editingUnitId
                        ? "Simpan Perubahan"
                        : "Simpan Unit"}
                  </button>
                </div>
              </form>
            )}

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_180px_190px_170px_190px_auto]">
                <div className="relative">
                  <Search
                    size={15}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    placeholder="Cari unit, blok, owner, atau penyewa"
                    value={unitSearch}
                    onChange={(event) => setUnitSearch(event.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm focus:border-[#1E2746] focus:outline-none focus:ring-2 focus:ring-[#1E2746]/20"
                  />
                </div>

                <div className="relative">
                  <Filter
                    size={15}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <select
                    value={unitStatus}
                    onChange={(event) => setUnitStatus(event.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm focus:border-[#1E2746] focus:outline-none focus:ring-2 focus:ring-[#1E2746]/20"
                  >
                    <option value="">Semua Status</option>
                    {unitStatusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <select
                  value={unitBuilding}
                  onChange={(event) => setUnitBuilding(event.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:border-[#1E2746] focus:outline-none focus:ring-2 focus:ring-[#1E2746]/20"
                >
                  <option value="">Semua Blok</option>
                  {unitBuildingOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <select
                  value={unitType}
                  onChange={(event) => setUnitType(event.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:border-[#1E2746] focus:outline-none focus:ring-2 focus:ring-[#1E2746]/20"
                >
                  <option value="">Semua Tipe</option>
                  {unitTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <div className="relative">
                  <ArrowUpDown
                    size={15}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <select
                    value={unitSort}
                    onChange={(event) => setUnitSort(event.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm focus:border-[#1E2746] focus:outline-none focus:ring-2 focus:ring-[#1E2746]/20"
                  >
                    {unitSortOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setUnitSearch("");
                    setUnitStatus("");
                    setUnitBuilding("");
                    setUnitType("");
                    setUnitSort(defaultUnitSort);
                  }}
                  disabled={!hasActiveUnitFilter}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  <RotateCcw size={14} />
                  Reset
                </button>
              </div>

              <p className="mt-2 text-xs text-slate-500">
                Menampilkan{" "}
                <span className="font-semibold text-slate-700">
                  {unitFiltered.length}
                </span>{" "}
                dari{" "}
                <span className="font-semibold text-slate-700">
                  {unitRows.length}
                </span>{" "}
                unit.
              </p>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-[1240px] w-full text-sm">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="p-2.5 text-left font-semibold sm:p-3">Blok</th>
                    <th className="p-2.5 text-left font-semibold sm:p-3">Nomor Unit</th>
                    <th className="p-2.5 text-left font-semibold sm:p-3">Tipe</th>
                    <th className="p-2.5 text-left font-semibold sm:p-3">Owner</th>
                    <th className="p-2.5 text-left font-semibold sm:p-3">Kapasitas</th>
                    <th className="p-2.5 text-left font-semibold sm:p-3">Harga / Bulan</th>
                    <th className="p-2.5 text-left font-semibold sm:p-3">Media</th>
                    <th className="p-2.5 text-left font-semibold sm:p-3">Penyewa</th>
                    <th className="p-2.5 text-left font-semibold sm:p-3">Status</th>
                    <th className="p-2.5 text-right font-semibold sm:p-3">Aksi</th>
                  </tr>
                </thead>

                <tbody>
                  {unitFiltered.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-3 text-center text-slate-500 sm:p-4">
                        Tidak ada data unit.
                      </td>
                    </tr>
                  ) : (
                    unitFiltered.map((unit) => {
                      const structuredUnit = unitStructureLookup.get(unit.unit_id);
                      const photoCount = getUnitPhotoUrls(unit).length;
                      const videoCount = getUnitVideoCount(unit);

                      return (
                        <tr
                          key={unit.unit_id}
                          className="border-t border-slate-100 hover:bg-slate-50"
                        >
                          <td className="p-2.5 text-slate-700 sm:p-3">
                            {structuredUnit?.buildingName || "-"}
                          </td>
                          <td className="p-2.5 font-medium text-slate-800 sm:p-3">
                            {structuredUnit?.displayName || unit.unit_name}
                          </td>
                          <td className="p-2.5 text-slate-700 sm:p-3">
                            {formatReadableText(unit.unit_type)}
                          </td>
                          <td className="p-2.5 text-slate-700 sm:p-3">
                            {unit.owner_name ||
                              propertyStructure.blocks.find((block) =>
                                block.units.some((item) => item.id === unit.unit_id)
                              )?.ownerName ||
                              "-"}
                          </td>
                          <td className="p-2.5 text-slate-700 sm:p-3">
                            {Number(unit.people_allowed || 0)} orang
                          </td>
                          <td className="p-2.5 text-slate-700 sm:p-3">
                            {(() => {
                              const priceInfo = getUnitDisplayPrice(unit);
                              return priceInfo.hasPromo ? (
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-xs text-slate-400 line-through">
                                    Rp {priceInfo.basePrice.toLocaleString("id-ID")}
                                  </span>
                                  <span className="font-medium text-emerald-700">
                                    Rp {priceInfo.effectivePromoPrice?.toLocaleString("id-ID")}
                                  </span>
                                </div>
                              ) : (
                                <span className="font-medium text-slate-800">
                                  Rp {priceInfo.basePrice.toLocaleString("id-ID")}
                                </span>
                              );
                            })()}
                          </td>
                          <td className="p-2.5 text-slate-700 sm:p-3">
                            <div className="space-y-1 text-xs">
                              <span className="inline-flex items-center gap-1">
                                <ImageIcon size={13} className="text-slate-500" />
                                {photoCount} foto
                              </span>
                              <span className="block">
                                <span className="inline-flex items-center gap-1">
                                  <Video size={13} className="text-slate-500" />
                                  {videoCount} video
                                </span>
                              </span>
                            </div>
                          </td>
                          <td className="p-2.5 text-slate-700 sm:p-3">{unit.tenant_name || "-"}</td>
                          <td className="p-2.5 sm:p-3">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                                unitBadgeClassMap[unit.status] ||
                                "border-slate-200 bg-slate-100 text-slate-600"
                              }`}
                            >
                              {unitStatusLabelMap[unit.status] || formatReadableText(unit.status)}
                            </span>
                          </td>
                          <td className="p-2.5 sm:p-3">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => openEditUnitForm(unit)}
                                disabled={isDeletingUnitId === unit.unit_id}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                                title="Ubah unit"
                              >
                                <Pencil size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setNotice(null);
                                  setDeleteUnitTarget(unit);
                                }}
                                disabled={isDeletingUnitId === unit.unit_id}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                                title="Hapus unit"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <h2 className="text-lg font-semibold text-slate-800">
              Riwayat Perawatan ({maintenanceRows.length})
            </h2>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-[980px] w-full text-sm">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="p-2.5 text-left font-semibold sm:p-3">Tanggal</th>
                    <th className="p-2.5 text-left font-semibold sm:p-3">Unit</th>
                    <th className="p-2.5 text-left font-semibold sm:p-3">Penghuni</th>
                    <th className="p-2.5 text-left font-semibold sm:p-3">Keluhan</th>
                    <th className="p-2.5 text-left font-semibold sm:p-3">Prioritas</th>
                    <th className="p-2.5 text-left font-semibold sm:p-3">Status</th>
                    <th className="p-2.5 text-left font-semibold sm:p-3">Teknisi</th>
                  </tr>
                </thead>

                <tbody>
                  {maintenanceSorted.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-3 text-center text-slate-500 sm:p-4">
                        Tidak ada data perawatan.
                      </td>
                    </tr>
                  ) : (
                    maintenanceSorted.map((item) => (
                      <tr
                        key={item.id}
                        className="border-t border-slate-100 hover:bg-slate-50"
                      >
                        <td className="p-2.5 text-slate-700 sm:p-3">{formatDate(item.date)}</td>
                        <td className="p-2.5 text-slate-700 sm:p-3">{item.unit_name}</td>
                        <td className="p-2.5 text-slate-700 sm:p-3">{item.tenant_name || "-"}</td>
                        <td className="p-2.5 text-slate-700 sm:p-3">
                          <p className="max-w-[280px] break-words">
                            {item.issue || item.category || "-"}
                          </p>
                        </td>
                        <td className="p-2.5 sm:p-3">
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
                        <td className="p-2.5 sm:p-3">
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
                        <td className="p-2.5 text-slate-700 sm:p-3">
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
        title="Ubah Properti"
        submitLabel={isUpdating ? "Menyimpan..." : "Simpan Perubahan"}
        initialValue={editInitialValue}
      />
    </div>
  );
}

function DeleteTenantDialog({
  tenant,
  isSubmitting,
  onClose,
  onConfirm,
}: {
  tenant: AdminPropertyTenantRow;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="px-4 pb-4 pt-5 sm:px-6 sm:pb-5 sm:pt-6">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <AlertTriangle size={24} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-red-600">
                Konfirmasi Hapus
              </p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">
                Hapus penghuni ini?
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Penghuni akan dihapus dari daftar hunian aktif properti ini dan unit
                akan kembali kosong jika tidak ada hunian aktif lain.
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm sm:p-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <span className="text-slate-500">Nama</span>
              <span className="text-left font-semibold text-slate-900 sm:text-right">
                {tenant.tenant_name}
              </span>
            </div>
            <div className="mt-3 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <span className="text-slate-500">Unit</span>
              <span className="text-left font-medium text-slate-800 sm:text-right">
                {tenant.unit_name}
              </span>
            </div>
            <div className="mt-3 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <span className="text-slate-500">Mulai Sewa</span>
              <span className="text-left font-medium text-slate-800 sm:text-right">
                {formatDate(tenant.lease_start)}
              </span>
            </div>
            <div className="mt-3 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <span className="text-slate-500">Akhir Sewa</span>
              <span className="text-left font-medium text-slate-800 sm:text-right">
                {formatDate(tenant.lease_end)}
              </span>
            </div>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isSubmitting}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Trash2 size={16} />
              {isSubmitting ? "Menghapus Penghuni..." : "Hapus Penghuni"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DeleteUnitDialog({
  unit,
  isSubmitting,
  onClose,
  onConfirm,
}: {
  unit: AdminPropertyUnitRow;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="px-4 pb-4 pt-5 sm:px-6 sm:pb-5 sm:pt-6">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <AlertTriangle size={24} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-red-600">
                Konfirmasi Hapus
              </p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">
                Hapus unit ini?
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Unit yang sudah terhubung dengan data sewa, pembayaran, atau penghuni
                aktif tidak akan bisa dihapus.
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm sm:p-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <span className="text-slate-500">Unit</span>
              <span className="text-left font-semibold text-slate-900 sm:text-right">
                {unit.unit_name}
              </span>
            </div>
            <div className="mt-3 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <span className="text-slate-500">Tipe</span>
              <span className="text-left font-medium text-slate-800 sm:text-right">
                {formatReadableText(unit.unit_type)}
              </span>
            </div>
            <div className="mt-3 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <span className="text-slate-500">Harga</span>
              <span className="text-left sm:text-right">
                {(() => {
                  const priceInfo = getUnitDisplayPrice(unit);
                  return priceInfo.hasPromo ? (
                    <span className="flex flex-col items-end gap-0.5">
                      <span className="text-xs text-slate-400 line-through">
                        Rp {priceInfo.basePrice.toLocaleString("id-ID")}
                      </span>
                      <span className="font-medium text-emerald-700">
                        Rp {priceInfo.effectivePromoPrice?.toLocaleString("id-ID")}
                      </span>
                    </span>
                  ) : (
                    <span className="font-medium text-slate-800">
                      Rp {priceInfo.basePrice.toLocaleString("id-ID")}
                    </span>
                  );
                })()}
              </span>
            </div>
            <div className="mt-3 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <span className="text-slate-500">Status</span>
              <span className="text-left font-medium text-slate-800 sm:text-right">
                {unitStatusLabelMap[unit.status] || formatReadableText(unit.status)}
              </span>
            </div>
            <div className="mt-3 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <span className="text-slate-500">Penyewa</span>
              <span className="text-left font-medium text-slate-800 sm:text-right">
                {unit.tenant_name || "-"}
              </span>
            </div>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isSubmitting}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Trash2 size={16} />
              {isSubmitting ? "Menghapus Unit..." : "Hapus Unit"}
            </button>
          </div>
        </div>
      </div>
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
    <div className={`rounded-2xl border p-3 sm:p-4 ${toneClass}`}>
      <div className="inline-flex rounded-lg bg-white/70 p-2 text-slate-700">{icon}</div>
      <p className="mt-3 text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold text-slate-800 sm:text-2xl">{value}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-slate-200 px-3 py-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <span className="text-sm font-medium text-slate-600">{label}</span>
      <span className="max-w-full break-words text-left text-sm text-slate-800 sm:max-w-[68%] sm:text-right">
        {value}
      </span>
    </div>
  );
}

function PropertyMappingSection({
  structure,
  blockMediaFiles,
  savingBlockMediaId,
  onUpdateBlockMediaDraft,
  onSaveBlockMedia,
  onDeleteBlockMedia,
}: {
  structure: PropertyStructure;
  blockMediaFiles: BlockMediaDrafts;
  savingBlockMediaId: number | null;
  onUpdateBlockMediaDraft: (
    blockKey: string,
    nextDraft: Partial<BlockMediaDraft>
  ) => void;
  onSaveBlockMedia: (block: PropertyStructure["blocks"][number]) => void;
  onDeleteBlockMedia: (
    block: PropertyStructure["blocks"][number],
    mediaType: "photo" | "video" | "video_360",
    photoIndex?: number
  ) => void;
}) {
  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Ringkasan Operasional
          </p>
          <h2 className="mt-1 text-lg font-semibold text-slate-800">
            Data Unit dan Penghuni
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            Lihat daftar blok, unit, status hunian, dan penghuni dalam satu
            tampilan.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          <MappingMetric label="Blok" value={structure.blockCount} />
          <MappingMetric label="Unit" value={structure.totalUnits} />
          <MappingMetric label="Terisi" value={structure.occupiedUnits} />
          <MappingMetric label="Booking" value={structure.bookingUnits} />
        </div>
      </div>

      {structure.blocks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600">
          Belum ada unit. Tambahkan blok saat membuat unit pertama.
        </div>
      ) : (
        <div className="space-y-4">
          {structure.blocks.map((block) => (
            <article
              key={block.key}
              className="overflow-hidden rounded-2xl border border-slate-200"
            >
              <div className="flex flex-col gap-3 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    {block.name}
                  </h3>
                  <p className="mt-0.5 text-sm text-slate-600">
                    Owner: <span className="font-medium">{block.ownerName}</span>
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <StatusPill label="Unit" value={block.totalUnits} />
                  <StatusPill label="Kosong" value={block.vacantUnits} />
                  <StatusPill label="Terisi" value={block.occupiedUnits} />
                  <StatusPill label="Booking" value={block.bookingUnits} />
                  <StatusPill label="Maintenance" value={block.maintenanceUnits} />
                </div>
              </div>

              <div className="border-t border-slate-200 bg-white px-4 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      Media Blok
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSaveBlockMedia(block)}
                    disabled={!block.id || savingBlockMediaId === block.id}
                    className="inline-flex h-9 w-full items-center justify-center rounded-lg bg-[#1E2746] px-3 text-xs font-semibold text-white transition hover:bg-[#141B35] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                  >
                    {savingBlockMediaId === block.id ? "Menyimpan..." : "Simpan Media"}
                  </button>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <label className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                    <span className="font-semibold text-slate-800">Foto Blok</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*,.heic,.heif"
                      disabled={!block.id || savingBlockMediaId === block.id}
                      onChange={(event) => {
                        onUpdateBlockMediaDraft(block.key, {
                          photos: Array.from(event.target.files || []),
                        });
                      }}
                      className="mt-2 block w-full text-xs"
                    />
                    {blockMediaFiles[block.key]?.photos.length ? (
                      <span className="mt-1 block">
                        {blockMediaFiles[block.key].photos.length} foto dipilih
                      </span>
                    ) : null}
                  </label>

                  <label className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                    <span className="font-semibold text-slate-800">Video Blok</span>
                    <input
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime"
                      disabled={!block.id || savingBlockMediaId === block.id}
                      onChange={(event) => {
                        onUpdateBlockMediaDraft(block.key, {
                          video: event.target.files?.[0] || null,
                        });
                      }}
                      className="mt-2 block w-full text-xs"
                    />
                    {blockMediaFiles[block.key]?.video ? (
                      <span className="mt-1 block truncate">
                        {blockMediaFiles[block.key].video?.name}
                      </span>
                    ) : null}
                  </label>

                  <label className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                    <span className="font-semibold text-slate-800">Media 360</span>
                    <input
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime"
                      disabled={!block.id || savingBlockMediaId === block.id}
                      onChange={(event) => {
                        onUpdateBlockMediaDraft(block.key, {
                          video360: event.target.files?.[0] || null,
                        });
                      }}
                      className="mt-2 block w-full text-xs"
                    />
                    {blockMediaFiles[block.key]?.video360 ? (
                      <span className="mt-1 block truncate">
                        {blockMediaFiles[block.key].video360?.name}
                      </span>
                    ) : null}
                  </label>
                </div>

                {block.photoUrls.length > 0 || block.videoUrl || block.video360Url ? (
                  <div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
                    {block.photoUrls.map((photoUrl, photoIndex) => (
                      <div
                        key={`${block.key}-${photoUrl}-${photoIndex}`}
                        className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
                      >
                        <div className="relative h-28 w-full">
                          <SafeBookingImage
                            src={resolveMediaImageUrl(photoUrl) || "/bg-1200.webp"}
                            alt={`${block.name} ${photoIndex + 1}`}
                            className="object-cover"
                            sizes="(max-width: 1024px) 33vw, 25vw"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => onDeleteBlockMedia(block, "photo", photoIndex)}
                          disabled={savingBlockMediaId === block.id}
                          className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-lg border border-red-100 bg-white/95 text-red-600 shadow-sm hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                          title="Hapus foto blok"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}

                    {block.videoUrl ? (
                      <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-black">
                        <SafeBookingVideo
                          src={toAbsoluteAssetUrl(block.videoUrl) || block.videoUrl}
                          className="h-28 w-full"
                        />
                        <button
                          type="button"
                          onClick={() => onDeleteBlockMedia(block, "video")}
                          disabled={savingBlockMediaId === block.id}
                          className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-lg border border-red-100 bg-white/95 text-red-600 shadow-sm hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                          title="Hapus video blok"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ) : null}

                    {block.video360Url ? (
                      <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-black">
                        <SafeBookingVideo
                          src={toAbsoluteAssetUrl(block.video360Url) || block.video360Url}
                          className="h-28 w-full"
                        />
                        <button
                          type="button"
                          onClick={() => onDeleteBlockMedia(block, "video_360")}
                          disabled={savingBlockMediaId === block.id}
                          className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-lg border border-red-100 bg-white/95 text-red-600 shadow-sm hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                          title="Hapus media 360 blok"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1080px] text-sm">
                  <thead className="bg-white text-slate-700">
                    <tr>
                      <th className="p-2.5 text-left font-semibold sm:p-3">Unit</th>
                      <th className="p-2.5 text-left font-semibold sm:p-3">Tipe</th>
                      <th className="p-2.5 text-left font-semibold sm:p-3">Harga</th>
                      <th className="p-2.5 text-left font-semibold sm:p-3">Status</th>
                      <th className="p-2.5 text-left font-semibold sm:p-3">Tenant</th>
                      <th className="p-2.5 text-left font-semibold sm:p-3">Nomor Telepon</th>
                      <th className="p-2.5 text-left font-semibold sm:p-3">Check-in</th>
                      <th className="p-2.5 text-left font-semibold sm:p-3">Check-out</th>
                      <th className="p-2.5 text-left font-semibold sm:p-3">Lama Sewa</th>
                      <th className="p-2.5 text-left font-semibold sm:p-3">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {block.units.map((unit) => (
                      <tr
                        key={unit.id}
                        className="border-t border-slate-100 hover:bg-slate-50"
                      >
                        <td className="p-2.5 font-medium text-slate-900 sm:p-3">
                          {unit.displayName}
                        </td>
                        <td className="p-2.5 text-slate-700 sm:p-3">
                          {formatReadableText(unit.unitType)}
                        </td>
                        <td className="p-2.5 text-slate-700 sm:p-3">
                          {(() => {
                            const priceInfo = getUnitDisplayPrice(unit);
                            return priceInfo.hasPromo ? (
                              <div className="flex flex-col gap-0.5">
                                <span className="text-xs text-slate-400 line-through">
                                  Rp {priceInfo.basePrice.toLocaleString("id-ID")}
                                </span>
                                <span className="font-medium text-emerald-700">
                                  Rp {priceInfo.effectivePromoPrice?.toLocaleString("id-ID")}
                                </span>
                              </div>
                            ) : (
                              <span className="font-medium text-slate-800">
                                Rp {priceInfo.basePrice.toLocaleString("id-ID")}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="p-2.5 sm:p-3">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                              unitBadgeClassMap[unit.status] ||
                              "border-slate-200 bg-slate-100 text-slate-600"
                            }`}
                          >
                            {unitStatusLabelMap[unit.status] ||
                              formatReadableText(unit.status)}
                          </span>
                        </td>
                        <td className="p-2.5 text-slate-700 sm:p-3">
                          {unit.tenantName || "-"}
                        </td>
                        <td className="p-2.5 text-slate-700 sm:p-3">
                          {unit.tenantPhone || "-"}
                        </td>
                        <td className="p-2.5 text-slate-700 sm:p-3">
                          {formatDate(unit.leaseStart)}
                        </td>
                        <td className="p-2.5 text-slate-700 sm:p-3">
                          {formatDate(unit.leaseEnd)}
                        </td>
                        <td className="p-2.5 text-slate-700 sm:p-3">
                          {unit.leaseDurationLabel}
                        </td>
                        <td className="p-3 text-slate-700">{unit.note || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function MappingMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-center">
      <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-base font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function StatusPill({ label, value }: { label: string; value: number }) {
  return (
    <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 font-medium text-slate-600">
      {label}: <span className="font-semibold text-slate-900">{value}</span>
    </span>
  );
}
