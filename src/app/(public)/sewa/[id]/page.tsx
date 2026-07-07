"use client";

import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type TouchEvent,
} from "react";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Home,
  Image as ImageIcon,
  MapPin,
  Tag,
  ShieldCheck,
  Sparkles,
  Users,
  Video,
  Wifi,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { resolveApiBaseUrl } from "@/lib/api-base-url";
import VisitRequestModal from "@/components/sewa/VisitRequestModal";
import {
  createTenantVisitRequest,
  getApiErrorMessage,
  getCatalogUnitBasePrice,
  getCatalogUnitDisplayPrice,
  getPublicProperties,
  getPublicPropertyUnits,
  getTenantProfile,
  isPublicPropertyLoginRequiredMessage,
  type PublicPropertyUnitSummary,
  type PublicPropertySummary,
} from "@/lib/dashboard/tenant.api";
import { getAdminPropertyDetail } from "@/lib/dashboard/admin.api";
import type { SewaMapLocation } from "@/components/maps/SewaLocationsMap";
import {
  geocodePropertyAddress,
  resolveBackendCoordinate,
  type PropertyCoordinate,
} from "@/lib/maps/property-coordinate";
import BookingVersionBadge from "@/features/booking/shared/components/BookingVersionBadge";
import {
  getTenantUnitBuildingName,
  getTenantUnitDisplayName,
  getTenantUnitNumber,
} from "@/lib/dashboard/tenant-unit-display";

const CURRENCY_FORMATTER = new Intl.NumberFormat("id-ID");

const SewaLocationsMap = dynamic(
  () => import("@/components/maps/SewaLocationsMap"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-slate-100 text-sm text-slate-500">
        Memuat peta lokasi...
      </div>
    ),
  }
);

const FALLBACK_COORDINATE = {
  lat: -6.5667,
  lng: 106.7283,
};

const AREA_COORDINATES: Array<{
  keywords: string[];
  lat: number;
  lng: number;
}> = [
  {
    keywords: ["dramaga", "cibanteng"],
    lat: -6.5667,
    lng: 106.7283,
  },
  {
    keywords: ["cihideung"],
    lat: -6.5709,
    lng: 106.7468,
  },
  {
    keywords: ["baranangsiang"],
    lat: -6.5956,
    lng: 106.8068,
  },
  {
    keywords: ["bubulak"],
    lat: -6.5579,
    lng: 106.7689,
  },
  {
    keywords: ["yasmin"],
    lat: -6.5506,
    lng: 106.7785,
  },
];

const formatCurrency = (value?: number) => {
  if (!value || value <= 0) {
    return "Hubungi administrator";
  }

  return `Rp ${CURRENCY_FORMATTER.format(value)}`;
};

const formatMarkerPrice = (value?: number) => {
  if (!value || value <= 0) {
    return "Info";
  }

  if (value >= 1_000_000) {
    const jt = value / 1_000_000;
    const decimal = jt % 1 === 0 ? 0 : 1;
    return `Rp${jt.toFixed(decimal).replace(".", ",")}jt`;
  }

  if (value >= 1_000) {
    return `Rp${Math.round(value / 1_000)}rb`;
  }

  return `Rp${value}`;
};

const formatLabel = (value?: string | null) => {
  if (!value) {
    return "-";
  }

  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const FACILITY_LABELS: Record<string, string> = {
  wifi: "WiFi",
  parking_area: "Area Parkir",
  kitchen: "Dapur",
  pet_friendly: "Ramah Hewan",
  cctv: "CCTV",
  ac: "AC",
  laundry: "Laundry",
  swimming_pool: "Kolam Renang",
  gym: "Pusat Kebugaran",
  security_24h: "Keamanan 24 Jam",
  elevator: "Lift",
  generator_backup: "Genset",
  balcony: "Balkon",
  furnished: "Berperabot",
  garden: "Taman",
  rooftop_access: "Akses Rooftop",
};

const formatFacilityLabel = (value?: string | null) => {
  if (!value) {
    return "-";
  }

  return FACILITY_LABELS[value] || formatLabel(value);
};

const resolvePropertyImage = (path?: string | null) => {
  const normalizedPath = path?.trim();
  if (!normalizedPath) {
    return "/bg-1200.webp";
  }

  if (/^data:image\//i.test(normalizedPath)) {
    return normalizedPath;
  }

  if (/^https?:\/\//i.test(normalizedPath)) {
    return normalizedPath;
  }

  const baseUrl = resolveApiBaseUrl();

  return `${baseUrl}${normalizedPath.startsWith("/") ? normalizedPath : `/${normalizedPath}`}`;
};

type PropertyMedia = {
  type: "image" | "video";
  src: string;
};

const buildPropertyMedias = (
  property: Pick<
    PublicPropertySummary,
    | "photo_url"
    | "photo_urls"
    | "photo_360_url"
    | "video_urls"
    | "video_url"
    | "video_360_url"
  >
): PropertyMedia[] => {
  const photoCandidates = Array.from(
    new Set(
      [
        ...(property.photo_urls || []),
        property.photo_url || "",
        property.photo_360_url || "",
      ]
        .map((item) => item?.trim())
        .filter((item): item is string => Boolean(item))
    )
  );
  const videoCandidates = Array.from(
    new Set(
      [
        ...(property.video_urls || []),
        property.video_url || "",
        property.video_360_url || "",
      ]
        .map((item) => item?.trim())
        .filter((item): item is string => Boolean(item))
    )
  );

  const medias: PropertyMedia[] = [
    ...photoCandidates.map((path) => ({
      type: "image" as const,
      src: resolvePropertyImage(path),
    })),
    ...videoCandidates.map((path) => ({
      type: "video" as const,
      src: resolvePropertyImage(path),
    })),
  ];

  if (medias.length > 0) {
    return medias;
  }

  return [{ type: "image", src: "/bg-1200.webp" }];
};

const extractDistrict = (address?: string | null) => {
  if (!address) {
    return "Bogor";
  }

  return address.split(",")[0]?.trim() || "Bogor";
};

const resolveCoordinate = (
  property: PublicPropertySummary,
  geocodedCoordinate?: PropertyCoordinate | null
) => {
  if (geocodedCoordinate) {
    return geocodedCoordinate;
  }

  const backendCoordinate = resolveBackendCoordinate(
    property.latitude,
    property.longitude
  );
  if (backendCoordinate) {
    return backendCoordinate;
  }

  const searchText = `${property.name || ""} ${property.address || ""}`.toLowerCase();
  const matched =
    AREA_COORDINATES.find((area) =>
      area.keywords.some((keyword) => searchText.includes(keyword))
    ) || FALLBACK_COORDINATE;

  return {
    lat: matched.lat,
    lng: matched.lng,
  };
};

const getPriceRangeLabel = (property: PublicPropertySummary) => {
  if (property.price_min && property.price_max && property.price_max > property.price_min) {
    return `${formatCurrency(property.price_min)} - ${formatCurrency(property.price_max)}`;
  }

  return formatCurrency(property.price_min || property.price_max);
};

const getFacilityIcon = (facility: string): ReactNode => {
  const normalized = facility.toLowerCase();

  if (normalized.includes("wifi") || normalized.includes("internet")) {
    return <Wifi size={14} />;
  }

  if (normalized.includes("security") || normalized.includes("cctv")) {
    return <ShieldCheck size={14} />;
  }

  if (normalized.includes("parkir") || normalized.includes("garage")) {
    return <Building2 size={14} />;
  }

  return <CheckCircle2 size={14} />;
};

type AvailableUnitCard = {
  id: number;
  name: string;
  displayName: string;
  buildingName: string | null;
  unitNumber: string;
  availableOptionCount: number;
  unitType: string;
  unitTypeValue: string;
  unitTypeValues: string[];
  status: string;
  statusValue: string;
  capacityLabel: string | null;
  priceMin: number;
  priceMax: number;
  priceValue: number;
  priceLabel: string;
  basePriceValue: number;
  basePriceLabel: string;
  hasPromo: boolean;
  facilities: string[];
  media: PropertyMedia[];
};

function UnitMediaCarousel({
  media,
  displayName,
}: {
  media: PropertyMedia[];
  displayName: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const safeActiveIndex =
    activeIndex >= 0 && activeIndex < media.length ? activeIndex : 0;
  const activeMedia = media[safeActiveIndex] || null;
  const canSlide = media.length > 1;

  const shiftMedia = (direction: -1 | 1) => {
    if (!canSlide) {
      return;
    }

    setActiveIndex((current) => {
      return (current + direction + media.length) % media.length;
    });
  };

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    if (touchStartX.current === null) {
      return;
    }

    const endX = event.changedTouches[0]?.clientX ?? touchStartX.current;
    const deltaX = endX - touchStartX.current;
    touchStartX.current = null;

    if (Math.abs(deltaX) < 40) {
      return;
    }

    shiftMedia(deltaX < 0 ? 1 : -1);
  };

  if (!activeMedia) {
    return null;
  }

  return (
    <div
      className="relative mb-3 aspect-[16/9] overflow-hidden rounded-xl border border-slate-100 bg-slate-100"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {activeMedia.type === "video" ? (
        <video
          src={activeMedia.src}
          controls
          preload="metadata"
          className="h-full w-full object-cover"
        />
      ) : (
        <Image
          src={activeMedia.src}
          alt={`Media ${displayName}`}
          fill
          unoptimized
          className="object-cover"
        />
      )}

      <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-slate-900/75 px-2 py-1 text-[11px] font-semibold text-white">
        {activeMedia.type === "video" ? <Video size={12} /> : <ImageIcon size={12} />}
        {canSlide ? `${safeActiveIndex + 1}/${media.length}` : "1 media"}
      </span>

      {canSlide ? (
        <>
          <button
            type="button"
            onClick={() => shiftMedia(-1)}
            className="absolute left-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-sm transition hover:bg-white"
            aria-label="Media sebelumnya"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => shiftMedia(1)}
            className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-sm transition hover:bg-white"
            aria-label="Media berikutnya"
          >
            <ChevronRight size={16} />
          </button>
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
            {media.map((item, index) => (
              <button
                key={`${item.type}-${item.src}-${index}`}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={`h-1.5 rounded-full transition ${
                  index === safeActiveIndex ? "w-5 bg-white" : "w-1.5 bg-white/60"
                }`}
                aria-label={`Media ${index + 1}`}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

type VisitRequestFormPayload = {
  preferredDate: string;
  preferredTime: string;
  note: string;
};

type VisitNotice = {
  variant: "success" | "error";
  message: string;
  actionHref?: string;
  actionLabel?: string;
} | null;

const toUnitStatusLabel = (status?: string | null) => {
  if (status === "vacant") {
    return "Tersedia";
  }

  if (status === "occupied") {
    return "Terisi";
  }

  if (status === "booking" || status === "booked" || status === "reserved") {
    return "Booking";
  }

  if (status === "maintenance") {
    return "Perawatan";
  }

  return formatLabel(status);
};

const getUnitStatusBadgeClass = (status: string) => {
  const normalized = status.toLowerCase();

  if (normalized === "tersedia") {
    return "border-blue-100 bg-blue-50 text-blue-700";
  }

  if (normalized === "terisi") {
    return "border-sky-100 bg-sky-50 text-sky-700";
  }

  if (normalized === "booking") {
    return "border-violet-100 bg-violet-50 text-violet-700";
  }

  if (normalized === "perawatan") {
    return "border-indigo-100 bg-indigo-50 text-indigo-700";
  }

  return "border-slate-200 bg-slate-100 text-slate-600";
};

const buildUnitMedias = (unit: PublicPropertyUnitSummary): PropertyMedia[] => {
  const photoCandidates = Array.from(
    new Set([
      ...(unit.block_photo_urls || []),
      ...(unit.block_roomphoto_urls || []),
      ...(unit.photo_urls || []),
      ...(unit.roomphoto_urls || []),
      unit.photo_url || "",
    ])
  )
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  const videoCandidates = Array.from(
    new Set([
      unit.block_video_url || "",
      unit.block_video_360_url || "",
      ...(unit.video_urls || []),
      unit.video_url || "",
      unit.video_360_url || "",
    ])
  )
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  return [
    ...photoCandidates.map((path) => ({
      type: "image" as const,
      src: resolvePropertyImage(path),
    })),
    ...videoCandidates.map((path) => ({
      type: "video" as const,
      src: resolvePropertyImage(path),
    })),
  ];
};

const resolveUnitFacilities = (
  unit: PublicPropertyUnitSummary,
  property: PublicPropertySummary
) => {
  const facilities = unit.facilities?.length
    ? unit.facilities
    : property.facilities || [];

  return Array.from(
    new Set(facilities.map((facility) => facility.trim()).filter(Boolean))
  );
};

const mapPublicUnitToCard = (
  unit: PublicPropertyUnitSummary,
  property: PublicPropertySummary
): AvailableUnitCard => {
  const basePrice = getCatalogUnitBasePrice(unit) || property.price_min || property.price_max || 0;
  const monthlyPrice = getCatalogUnitDisplayPrice(unit) || basePrice || 0;
  const capacityLabel =
    typeof unit.people_allowed === "number" && unit.people_allowed > 0
      ? `${unit.people_allowed} orang`
      : null;
  const buildingName = getTenantUnitBuildingName(unit);
  const unitNumber = getTenantUnitNumber(unit, buildingName);

  return {
    id: unit.id,
    name: unit.name || `Unit ${unit.id}`,
    displayName: getTenantUnitDisplayName(unit),
    buildingName,
    unitNumber,
    availableOptionCount: 1,
    unitType: formatLabel(unit.unit_type || property.property_type),
    unitTypeValue: unit.unit_type || property.property_type || "",
    unitTypeValues: [unit.unit_type || property.property_type || ""].filter(Boolean),
    status: toUnitStatusLabel(unit.status),
    statusValue: unit.status || "vacant",
    capacityLabel,
    priceMin: monthlyPrice,
    priceMax: monthlyPrice,
    priceValue: monthlyPrice,
    priceLabel: formatCurrency(monthlyPrice),
    basePriceValue: basePrice,
    basePriceLabel: formatCurrency(basePrice),
    hasPromo: Boolean(basePrice > monthlyPrice),
    facilities: resolveUnitFacilities(unit, property),
    media: buildUnitMedias(unit),
  };
};

const formatPriceRange = (min: number, max: number) => {
  if (min > 0 && max > 0 && max > min) {
    return `${formatCurrency(min)} - ${formatCurrency(max)}`;
  }

  return formatCurrency(min || max);
};

const formatCapacityRange = (values: number[]) => {
  const capacities = values
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((first, second) => first - second);

  if (capacities.length === 0) {
    return null;
  }

  const min = capacities[0];
  const max = capacities[capacities.length - 1];

  return min === max ? `${min} orang` : `${min}-${max} orang`;
};

const groupUnitsByBuilding = (
  units: AvailableUnitCard[]
): AvailableUnitCard[] => {
  const grouped = new Map<string, AvailableUnitCard[]>();

  units.forEach((unit) => {
    const key = (unit.buildingName || unit.displayName || unit.name)
      .trim()
      .toLowerCase();
    const currentUnits = grouped.get(key) || [];
    grouped.set(key, [...currentUnits, unit]);
  });

  return Array.from(grouped.values()).map((group) => {
    const sortedGroup = [...group].sort((first, second) => {
      const buildingCompare = (first.buildingName || "").localeCompare(
        second.buildingName || "",
        "id-ID",
        { numeric: true }
      );

      if (buildingCompare !== 0) {
        return buildingCompare;
      }

      const priceCompare = first.priceValue - second.priceValue;
      if (priceCompare !== 0) {
        return priceCompare;
      }

      return (first.unitNumber || "").localeCompare(second.unitNumber || "", "id-ID", {
        numeric: true,
      });
    });
    const representative = sortedGroup[0];
    const prices = sortedGroup
      .map((unit) => unit.priceValue)
      .filter((value) => Number.isFinite(value) && value > 0);
    const priceMin = prices.length > 0 ? Math.min(...prices) : 0;
    const priceMax = prices.length > 0 ? Math.max(...prices) : 0;
    const typeEntries = new Map<string, string>();

    sortedGroup.forEach((unit) => {
      unit.unitTypeValues.forEach((value) => {
        if (value) {
          typeEntries.set(value, formatLabel(value));
        }
      });
    });

    const typeLabels = Array.from(typeEntries.values());
    const media = sortedGroup.flatMap((unit) => unit.media);
    const facilities = Array.from(
      new Set(sortedGroup.flatMap((unit) => unit.facilities))
    );

    return {
      ...representative,
      displayName:
        representative.buildingName || representative.displayName || representative.name,
      availableOptionCount: sortedGroup.length,
      unitType:
        typeLabels.length > 1
          ? `${typeLabels.length} tipe tersedia`
          : typeLabels[0] || representative.unitType,
      unitTypeValue:
        typeEntries.size === 1
          ? Array.from(typeEntries.keys())[0]
          : "mixed",
      unitTypeValues: Array.from(typeEntries.keys()),
      capacityLabel: formatCapacityRange(
        sortedGroup.map((unit) => {
          const match = unit.capacityLabel?.match(/\d+/);
          return match ? Number(match[0]) : 0;
        })
      ),
      priceMin,
      priceMax,
      priceValue: priceMin || representative.priceValue,
      priceLabel: formatPriceRange(priceMin, priceMax),
      media: Array.from(
        new Map(media.map((item) => [`${item.type}-${item.src}`, item])).values()
      ),
      facilities,
    };
  });
};

export default function SewaPropertyDetailPage() {
  const params = useParams<{ id: string }>();
  const propertyId = Number(params?.id);
  const { user } = useAuth();
  const isTenant = user?.role === "tenant";
  const isAdmin = user?.role === "admin";

  const [property, setProperty] = useState<PublicPropertySummary | null>(null);
  const [related, setRelated] = useState<PublicPropertySummary[]>([]);
  const [availableUnits, setAvailableUnits] = useState<AvailableUnitCard[]>([]);
  const [unitStatusFilter, setUnitStatusFilter] = useState("all");
  const [unitTypeFilter, setUnitTypeFilter] = useState("all");
  const [unitFacilityFilter, setUnitFacilityFilter] = useState("all");
  const [unitMinPrice, setUnitMinPrice] = useState("");
  const [unitMaxPrice, setUnitMaxPrice] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [heroMediaItems, setHeroMediaItems] = useState<PropertyMedia[]>([
    { type: "image", src: "/bg-1200.webp" },
  ]);
  const [activeHeroMediaIndex, setActiveHeroMediaIndex] = useState(0);
  const [isMediaViewerOpen, setIsMediaViewerOpen] = useState(false);
  const [heroTouchStartX, setHeroTouchStartX] = useState<number | null>(null);
  const [heroTouchEndX, setHeroTouchEndX] = useState<number | null>(null);
  const [geocodedCoordinate, setGeocodedCoordinate] =
    useState<PropertyCoordinate | null>(null);
  const [isVisitModalOpen, setIsVisitModalOpen] = useState(false);
  const [isSubmittingVisit, setIsSubmittingVisit] = useState(false);
  const [visitNotice, setVisitNotice] = useState<VisitNotice>(null);

  useEffect(() => {
    if (!property) {
      setHeroMediaItems([{ type: "image", src: "/bg-1200.webp" }]);
      setActiveHeroMediaIndex(0);
      return;
    }

    setHeroMediaItems(buildPropertyMedias(property));
    setActiveHeroMediaIndex(0);
  }, [property]);

  useEffect(() => {
    if (!Number.isFinite(propertyId) || propertyId <= 0) {
      setError("ID properti tidak valid.");
      setAvailableUnits([]);
      setIsLoading(false);
      return;
    }

    let active = true;

    const loadProperty = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const perPage = 100;
        const firstPage = await getPublicProperties({
          page: 1,
          per_page: perPage,
          sort: "newest",
        });

        let found =
          firstPage.data.find((item) => item.id === propertyId) || null;
        const totalPages = firstPage.meta?.total_pages || 1;

        for (let page = 2; !found && page <= totalPages; page += 1) {
          const nextPage = await getPublicProperties({
            page,
            per_page: perPage,
            sort: "newest",
          });
          found = nextPage.data.find((item) => item.id === propertyId) || null;
        }

        if (!active) {
          return;
        }

        if (!found) {
          setProperty(null);
          setRelated([]);
          setAvailableUnits([]);
          setError(
            isPublicPropertyLoginRequiredMessage(firstPage.message)
              ? firstPage.message
              : "Properti tidak ditemukan."
          );
          return;
        }

        if (isAdmin) {
          try {
            const adminDetailResponse = await getAdminPropertyDetail(found.id);
            const adminPhotoUrls = Array.from(
              new Set([
                ...(adminDetailResponse.data.property.photo_urls || []),
                ...(adminDetailResponse.data.property.roomphoto_urls || []),
              ])
            );
            const adminVideoUrls = Array.from(
              new Set([
                ...(adminDetailResponse.data.property.video_urls || []),
                adminDetailResponse.data.property.video_url || "",
              ])
            ).filter((item): item is string => Boolean(item));
            found = {
              ...found,
              photo_url: adminPhotoUrls[0] ?? found.photo_url ?? null,
              photo_urls: adminPhotoUrls.length > 0 ? adminPhotoUrls : found.photo_urls,
              video_urls: adminVideoUrls.length > 0 ? adminVideoUrls : found.video_urls,
              video_url:
                adminDetailResponse.data.property.video_url ?? found.video_url ?? null,
              video_360_url:
                adminDetailResponse.data.property.video_360_url ??
                found.video_360_url ??
                null,
              photo_360_url:
                adminDetailResponse.data.property.photo_360_url ??
                found.photo_360_url ??
                null,
            };
          } catch {
            // Fallback ke data publik jika sinkronisasi foto admin gagal.
          }
        }

        setProperty(found);

        let nextUnits: AvailableUnitCard[] = [];
        try {
          const unitsResponse = await getPublicPropertyUnits(found.id, {
            page: 1,
            per_page: 100,
            sort: "price_asc",
          });

          if (unitsResponse.data.length > 0) {
            nextUnits = groupUnitsByBuilding(
              unitsResponse.data.map((unit) => mapPublicUnitToCard(unit, found))
            );
          }
        } catch {
          nextUnits = [];
        }

        const relatedResponse = await getPublicProperties({
          page: 1,
          per_page: 8,
          sort: "newest",
          property_type: found.property_type || undefined,
        });

        if (!active) {
          return;
        }

        const relatedItems = relatedResponse.data
          .filter((item) => item.id !== found.id)
          .slice(0, 3);

        setAvailableUnits(nextUnits);
        setRelated(relatedItems);
      } catch (loadError) {
        if (!active) {
          return;
        }

        setAvailableUnits([]);
        setError(
          getApiErrorMessage(
            loadError,
            "Gagal memuat detail properti. Silakan coba lagi."
          )
        );
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadProperty();

    return () => {
      active = false;
    };
  }, [isAdmin, propertyId]);

  useEffect(() => {
    let active = true;

    if (!property) {
      setGeocodedCoordinate(null);
      return () => {
        active = false;
      };
    }

    const backendCoordinate = resolveBackendCoordinate(
      property.latitude,
      property.longitude
    );
    if (backendCoordinate) {
      setGeocodedCoordinate(backendCoordinate);
      return () => {
        active = false;
      };
    }

    if (!property.address?.trim()) {
      setGeocodedCoordinate(null);
      return () => {
        active = false;
      };
    }

    const resolveAddressCoordinate = async () => {
      const coordinate = await geocodePropertyAddress(
        property.address,
        property.name
      );
      if (!active) {
        return;
      }

      setGeocodedCoordinate(coordinate);
    };

    void resolveAddressCoordinate();

    return () => {
      active = false;
    };
  }, [property]);

  const mapLocation = useMemo<SewaMapLocation[]>(() => {
    if (!property) {
      return [];
    }

    const coordinate = resolveCoordinate(property, geocodedCoordinate);
    return [
      {
        id: property.id,
        name: property.name,
        address: property.address || "-",
        lat: coordinate.lat,
        lng: coordinate.lng,
        priceLabel: getPriceRangeLabel(property),
        markerLabel: formatMarkerPrice(property.price_min || property.price_max),
        isFavorite: false,
      },
    ];
  }, [geocodedCoordinate, property]);

  const unitStatusOptions = useMemo(() => {
    return Array.from(
      new Map(
        availableUnits.map((unit) => [unit.statusValue, unit.status])
      ).entries()
    );
  }, [availableUnits]);

  const unitTypeOptions = useMemo(() => {
    return Array.from(
      new Map(
        availableUnits.flatMap((unit) =>
          unit.unitTypeValues.map((value) => [value, formatLabel(value)] as const)
        )
      ).entries()
    ).filter(([value]) => Boolean(value));
  }, [availableUnits]);

  const unitFacilityOptions = useMemo(() => {
    return Array.from(
      new Set(availableUnits.flatMap((unit) => unit.facilities))
    ).filter(Boolean);
  }, [availableUnits]);

  const filteredAvailableUnits = useMemo(() => {
    const minPrice = unitMinPrice.trim() ? Number(unitMinPrice) : null;
    const maxPrice = unitMaxPrice.trim() ? Number(unitMaxPrice) : null;

    return availableUnits
      .filter((unit) => {
        const matchStatus =
          unitStatusFilter === "all" || unit.statusValue === unitStatusFilter;
        const matchType =
          unitTypeFilter === "all" || unit.unitTypeValues.includes(unitTypeFilter);
        const matchFacility =
          unitFacilityFilter === "all" ||
          unit.facilities.includes(unitFacilityFilter);
        const matchMinPrice =
          minPrice == null || !Number.isFinite(minPrice)
            ? true
            : unit.priceMax >= minPrice;
        const matchMaxPrice =
          maxPrice == null || !Number.isFinite(maxPrice)
            ? true
            : unit.priceMin <= maxPrice;

        return (
          matchStatus &&
          matchType &&
          matchFacility &&
          matchMinPrice &&
          matchMaxPrice
        );
      })
      .sort((first, second) => {
        const buildingCompare = (first.buildingName || "").localeCompare(
          second.buildingName || "",
          "id-ID",
          { numeric: true }
        );

        if (buildingCompare !== 0) {
          return buildingCompare;
        }

        return (first.unitNumber || "").localeCompare(second.unitNumber || "", "id-ID", {
          numeric: true,
        });
      });
  }, [
    availableUnits,
    unitFacilityFilter,
    unitMaxPrice,
    unitMinPrice,
    unitStatusFilter,
    unitTypeFilter,
  ]);

  const handleSubmitVisitRequest = async (payload: VisitRequestFormPayload) => {
    if (!property) {
      throw new Error("Kost belum tersedia.");
    }

    setIsSubmittingVisit(true);
    setVisitNotice(null);

    try {
      await createTenantVisitRequest({
        property_id: property.id,
        preferred_date: payload.preferredDate,
        preferred_time: payload.preferredTime,
        note: payload.note,
      });

      setVisitNotice({
        variant: "success",
        message:
          "Permintaan jadwal survei berhasil dikirim. Kamu bisa memantaunya di Jadwal Kunjungan.",
      });
      setIsVisitModalOpen(false);
    } catch (submitError) {
      const message = getApiErrorMessage(
        submitError,
        "Gagal mengirim permintaan survei. Silakan coba lagi."
      );
      setVisitNotice({ variant: "error", message });
      throw new Error(message);
    } finally {
      setIsSubmittingVisit(false);
    }
  };

  useEffect(() => {
    if (!isMediaViewerOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMediaViewerOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isMediaViewerOpen]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl space-y-4 px-6 py-8">
        <div className="h-64 animate-pulse rounded-3xl border bg-white" />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="h-80 animate-pulse rounded-2xl border bg-white" />
          <div className="h-80 animate-pulse rounded-2xl border bg-white" />
        </div>
      </div>
    );
  }

  if (!property) {
    const showCatalogLoginNotice = isPublicPropertyLoginRequiredMessage(error);

    return (
      <section className="mx-auto max-w-3xl px-6 py-14">
        <div className="rounded-2xl border bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">
            {showCatalogLoginNotice
              ? "Masuk untuk melihat detail properti"
              : "Detail Properti Tidak Tersedia"}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {error || "Properti yang kamu cari tidak ditemukan."}
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            {showCatalogLoginNotice ? (
              <Link
                href={`/auth?next=${encodeURIComponent(`/sewa/${propertyId}`)}`}
                className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700"
              >
                Masuk untuk lihat detail
                <ArrowRight size={14} />
              </Link>
            ) : null}
            <Link
              href="/sewa"
              className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700"
            >
              <ArrowLeft size={14} />
              Kembali ke Halaman Sewa
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const activeHeroMedia = heroMediaItems[activeHeroMediaIndex] || {
    type: "image" as const,
    src: "/bg-1200.webp",
  };
  const goToPrevHeroMedia = () => {
    setActiveHeroMediaIndex((prev) =>
      prev <= 0 ? heroMediaItems.length - 1 : prev - 1
    );
  };
  const goToNextHeroMedia = () => {
    setActiveHeroMediaIndex((prev) =>
      prev >= heroMediaItems.length - 1 ? 0 : prev + 1
    );
  };

  return (
    <div className="pb-16">
      {isMediaViewerOpen && (
        <div
          className="fixed inset-0 z-[80] bg-black/90 p-4 md:p-8"
          onClick={() => setIsMediaViewerOpen(false)}
        >
          <div
            className="mx-auto flex h-full w-full max-w-6xl items-center justify-center"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsMediaViewerOpen(false)}
              className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/40 bg-black/40 text-white backdrop-blur-sm"
              aria-label="Tutup media"
            >
              <X size={18} />
            </button>

            {heroMediaItems.length > 1 ? (
              <button
                type="button"
                onClick={goToPrevHeroMedia}
                className="absolute left-4 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-black/40 text-white backdrop-blur-sm"
                aria-label="Media sebelumnya"
              >
                <ChevronLeft size={18} />
              </button>
            ) : null}

            {activeHeroMedia.type === "video" ? (
              <video
                src={activeHeroMedia.src}
                controls
                autoPlay
                className="max-h-[84vh] w-auto max-w-full rounded-xl bg-black"
              />
            ) : (
              <Image
                src={activeHeroMedia.src}
                alt={property.name}
                width={1600}
                height={1200}
                unoptimized
                className="max-h-[84vh] w-auto max-w-full rounded-xl object-contain"
                sizes="100vw"
              />
            )}

            {heroMediaItems.length > 1 ? (
              <>
                <button
                  type="button"
                  onClick={goToNextHeroMedia}
                  className="absolute right-4 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-black/40 text-white backdrop-blur-sm"
                  aria-label="Media berikutnya"
                >
                  <ChevronRight size={18} />
                </button>
                <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-white/40 bg-black/40 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                  {activeHeroMediaIndex + 1}/{heroMediaItems.length}
                </span>
              </>
            ) : null}
          </div>
        </div>
      )}

      <section className="relative overflow-hidden border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 pb-8 pt-5 sm:px-6 sm:pt-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-stretch">
          <div
            className="relative min-h-[320px] overflow-hidden rounded-3xl border border-slate-200 shadow-sm"
            onTouchStart={(event) => {
              setHeroTouchStartX(event.changedTouches[0]?.clientX || null);
              setHeroTouchEndX(null);
            }}
            onTouchMove={(event) => {
              setHeroTouchEndX(event.changedTouches[0]?.clientX || null);
            }}
            onTouchEnd={() => {
              if (heroMediaItems.length <= 1) {
                return;
              }

              if (heroTouchStartX == null || heroTouchEndX == null) {
                return;
              }

              const delta = heroTouchEndX - heroTouchStartX;
              if (Math.abs(delta) < 40) {
                return;
              }

              if (delta > 0) {
                goToPrevHeroMedia();
              } else {
                goToNextHeroMedia();
              }
            }}
          >
            {activeHeroMedia.type === "video" ? (
              <video
                src={activeHeroMedia.src}
                autoPlay
                muted
                loop
                playsInline
                onClick={() => setIsMediaViewerOpen(true)}
                onError={() => {
                  setHeroMediaItems((prev) =>
                    prev.map((media, idx) =>
                      idx === activeHeroMediaIndex
                        ? { type: "image", src: "/bg-1200.webp" }
                        : media
                    )
                  );
                }}
                className="h-full w-full cursor-zoom-in object-cover"
              />
            ) : (
              <Image
                src={activeHeroMedia.src}
                alt={property.name}
                fill
                unoptimized
                onClick={() => setIsMediaViewerOpen(true)}
                onError={() => {
                  setHeroMediaItems((prev) =>
                    prev.map((media, idx) =>
                      idx === activeHeroMediaIndex
                        ? { type: "image", src: "/bg-1200.webp" }
                        : media
                    )
                  );
                }}
                className="cursor-zoom-in object-cover"
              />
            )}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
            {heroMediaItems.length > 1 ? (
              <div className="absolute bottom-3 right-3 z-30 flex items-center gap-2 sm:bottom-4 sm:right-4">
                <button
                  type="button"
                  onClick={goToPrevHeroMedia}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/65 bg-black/40 text-white backdrop-blur-sm"
                  aria-label="Media sebelumnya"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="rounded-full border border-white/65 bg-black/40 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
                  {activeHeroMediaIndex + 1}/{heroMediaItems.length}
                </span>
                <button
                  type="button"
                  onClick={goToNextHeroMedia}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/65 bg-black/40 text-white backdrop-blur-sm"
                  aria-label="Media berikutnya"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            ) : null}
            <div className="absolute left-3 right-3 top-3 z-20 flex flex-wrap items-center gap-2 sm:left-4 sm:right-4 sm:top-4">
              <Link
                href="/sewa"
                className="inline-flex items-center gap-1 rounded-full border border-white/45 bg-black/35 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm transition hover:bg-black/50"
              >
                <ArrowLeft size={13} />
                Kembali
              </Link>
              <BookingVersionBadge version="Sewa KIKOST" tone="dark" />
              <span className="rounded-full border border-white/40 bg-black/35 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
                {formatLabel(property.property_type)}
              </span>
              <span className="rounded-full border border-white/40 bg-black/35 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
                {formatLabel(property.condition)}
              </span>
            </div>

            <div className="pointer-events-none absolute bottom-4 left-4 right-4 z-10">
              <p className="inline-flex rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
                {extractDistrict(property.address)}
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">
                {property.name}
              </h1>
              <p className="mt-1 inline-flex items-center gap-1 text-sm text-white/90">
                <MapPin size={14} />
                {property.address || "-"}
              </p>
            </div>
          </div>

          <aside className="space-y-4 rounded-3xl border border-slate-200 bg-gradient-to-br from-sky-700 via-blue-700 to-indigo-700 p-4 text-white shadow-sm sm:p-5">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/10 px-3 py-1 text-xs font-medium">
              <Sparkles size={13} />
              Data properti berasal dari input administrator
            </p>

            <div>
              <p className="text-sm text-white/80">Harga sewa</p>
              <p className="mt-1 text-xl font-semibold sm:text-2xl">
                {getPriceRangeLabel(property)}
              </p>
              <p className="mt-1 text-xs text-white/80">
                Perkiraan harga per bulan
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <HeroStat icon={<Home size={14} />} label="Total Data Unit" value={`${property.total_units || 0}`} />
              <HeroStat icon={<Users size={14} />} label="Data Unit Terisi" value={`${property.occupied_units || 0}`} />
              <HeroStat
                icon={<CheckCircle2 size={14} />}
                label="Blok Tersedia"
                value={`${availableUnits.length}`}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="#unit-tersedia"
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-white/40 px-4 text-sm font-semibold text-white transition hover:bg-white/10 sm:w-auto"
              >
                Lihat Blok Tersedia
                <ArrowRight size={14} />
              </Link>

              {isTenant ? (
                <button
                  type="button"
                  onClick={async () => {
                    setVisitNotice(null);
                    try {
                      const profileResponse = await getTenantProfile();
                      const profile = profileResponse.data;
                      if (!profile.email?.trim() || !profile.phone_number?.toString().trim()) {
                        setVisitNotice({
                          variant: "error",
                          message:
                            "Lengkapi email dan nomor HP di profil kamu terlebih dahulu sebelum mengajukan jadwal survei.",
                          actionHref: "/tenant/akun",
                          actionLabel: "Lengkapi Profil",
                        });
                        return;
                      }
                    } catch {
                      // Jika profil gagal dimuat, tetap buka modal dan biarkan validasi berjalan saat submit
                    }
                    setIsVisitModalOpen(true);
                  }}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
                >
                  Ajukan Survei Kost
                  <CalendarDays size={14} />
                </button>
              ) : !user ? (
                <Link
                  href={`/auth?next=${encodeURIComponent(`/sewa/${property.id}`)}`}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
                >
                  Masuk untuk Ajukan Survei
                  <CalendarDays size={14} />
                </Link>
              ) : null}
            </div>

            {visitNotice ? (
              <div
                className={`rounded-xl border px-3 py-2 text-xs ${
                  visitNotice.variant === "success"
                    ? "border-white/30 bg-white/15 text-white"
                    : "border-red-200 bg-red-50 text-red-700"
                }`}
              >
                <p>{visitNotice.message}</p>
                {visitNotice.variant === "success" ? (
                  <Link
                    href="/tenant/jadwal-visit"
                    className="mt-1 inline-flex font-semibold underline underline-offset-2"
                  >
                    Lihat Jadwal Kunjungan
                  </Link>
                ) : visitNotice.actionHref ? (
                  <Link
                    href={visitNotice.actionHref}
                    className="mt-1 inline-flex font-semibold underline underline-offset-2"
                  >
                    {visitNotice.actionLabel ?? "Perbaiki"}
                  </Link>
                ) : null}
              </div>
            ) : null}
          </aside>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4 sm:space-y-6">
          <article className="rounded-2xl border bg-white p-4 shadow-sm sm:p-5">
            <h2 className="text-lg font-semibold text-slate-900">Tentang Properti</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Properti ini tersedia di area {extractDistrict(property.address)} dengan
              tipe {formatLabel(property.property_type).toLowerCase()}. Detail
              unit, harga, dan fasilitas sudah terintegrasi dari data yang
              dimasukkan administrator di dasbor.
            </p>
          </article>

          <article className="rounded-2xl border bg-white p-4 shadow-sm sm:p-5">
            <h2 className="text-lg font-semibold text-slate-900">Fasilitas Utama</h2>
            <div className="mt-4 flex flex-wrap gap-2.5">
              {(property.facilities || []).length > 0 ? (
                property.facilities.map((facility) => (
                  <span
                    key={facility}
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700"
                  >
                    <span className="text-blue-700">{getFacilityIcon(facility)}</span>
                    {formatFacilityLabel(facility)}
                  </span>
                ))
              ) : (
                <p className="text-sm text-slate-500">
                  Fasilitas belum ditambahkan oleh administrator.
                </p>
              )}
            </div>
          </article>

          <article className="overflow-hidden rounded-2xl border bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-4 py-2.5">
              <h2 className="text-sm font-semibold text-slate-800">Lokasi Properti</h2>
              <span className="text-xs text-slate-500">Peta interaktif</span>
            </div>
            <div className="relative z-0 h-[340px] w-full sm:h-[420px]">
              <SewaLocationsMap
                locations={mapLocation}
                selectedId={property.id}
                onSelect={() => undefined}
              />
            </div>
          </article>

          <article
            id="unit-tersedia"
            className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/70 via-white to-sky-50/60 p-4 shadow-sm scroll-mt-28 sm:p-5"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  <Sparkles size={13} />
                  Unit per Blok
                </p>
                <h2 className="mt-2 text-lg font-semibold text-slate-900">
                  Pilihan unit per blok
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Tenant memilih berdasarkan blok seperti A1, A2, A3, bukan berdasarkan nomor kamar.
                </p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700">
                <Home size={13} />
                {filteredAvailableUnits.length} dari {availableUnits.length} blok
              </span>
            </div>

            <div className="mt-4 grid gap-3 rounded-2xl border border-blue-100 bg-white p-3 sm:p-4 md:grid-cols-5">
              <select
                value={unitStatusFilter}
                onChange={(event) => setUnitStatusFilter(event.target.value)}
                className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="all">Semua Status</option>
                {unitStatusOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>

              <select
                value={unitTypeFilter}
                onChange={(event) => setUnitTypeFilter(event.target.value)}
                className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="all">Semua Tipe</option>
                {unitTypeOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>

              <select
                value={unitFacilityFilter}
                onChange={(event) => setUnitFacilityFilter(event.target.value)}
                className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="all">Semua Fasilitas</option>
                {unitFacilityOptions.map((facility) => (
                  <option key={facility} value={facility}>
                    {formatFacilityLabel(facility)}
                  </option>
                ))}
              </select>

              <input
                type="number"
                min={0}
                placeholder="Harga min"
                value={unitMinPrice}
                onChange={(event) => setUnitMinPrice(event.target.value)}
                className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />

              <input
                type="number"
                min={0}
                placeholder="Harga max"
                value={unitMaxPrice}
                onChange={(event) => setUnitMaxPrice(event.target.value)}
                className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="mt-5">
              {availableUnits.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-blue-100 bg-white px-4 py-5 text-sm text-slate-600">
                  <p className="font-medium text-slate-800">
                    Saat ini belum ada blok/unit kosong pada properti ini.
                  </p>
                  <p className="mt-1">
                    Kamu tetap bisa mengajukan kunjungan untuk masuk daftar prioritas saat
                    unit tersedia.
                  </p>
                </div>
              ) : filteredAvailableUnits.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-blue-100 bg-white px-4 py-5 text-sm text-slate-600">
                  <p className="font-medium text-slate-800">
                    Tidak ada unit yang sesuai filter.
                  </p>
                  <p className="mt-1">
                    Ubah status, tipe, fasilitas, atau rentang harga untuk
                    melihat pilihan unit lainnya.
                  </p>
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {filteredAvailableUnits.map((unit) => (
                    <article
                      key={unit.id}
                      className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm transition hover:border-blue-200"
                    >
                      <UnitMediaCarousel
                        media={unit.media}
                        displayName={unit.displayName}
                      />

                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {unit.displayName}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {unit.unitType}
                          </p>
                          {unit.availableOptionCount > 1 ? (
                            <p className="mt-1 text-xs font-medium text-blue-700">
                              {unit.availableOptionCount} pilihan tersedia di blok ini
                            </p>
                          ) : null}
                        </div>
                        <span
                          className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${getUnitStatusBadgeClass(
                            unit.status
                          )}`}
                        >
                          {unit.status}
                        </span>
                      </div>

                      <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                        {unit.capacityLabel ? (
                          <p className="inline-flex items-center gap-1.5">
                            <Users size={13} className="text-blue-700" />
                            Kapasitas {unit.capacityLabel}
                          </p>
                        ) : null}
                        <p className="inline-flex items-center gap-1.5">
                          <Tag size={13} className="text-blue-700" />
                          {unit.hasPromo ? (
                            <span className="flex flex-col">
                              <span className="text-[10px] font-medium text-slate-400 line-through">
                                {unit.basePriceLabel}/bulan
                              </span>
                              <span className="text-[12px] font-semibold text-emerald-700">
                                {unit.priceLabel}/bulan
                              </span>
                            </span>
                          ) : (
                            `${unit.priceLabel}/bulan`
                          )}
                        </p>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {unit.facilities.length > 0 ? (
                          unit.facilities.map((facility) => (
                            <span
                              key={`${unit.id}-${facility}`}
                              className="inline-flex items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700"
                            >
                              {formatFacilityLabel(facility)}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-500">
                            Fasilitas unit menyesuaikan properti
                          </span>
                        )}
                      </div>

                      <div className="mt-4 flex justify-end">
                        {unit.hasPromo ? (
                          <span className="mb-3 inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                            Promo aktif
                          </span>
                        ) : null}
                        <Link
                          href={
                            isTenant
                              ? `/tenant/pembayaran/buat?property_id=${property.id}&unit_id=${unit.id}`
                              : `/auth?next=${encodeURIComponent(
                                  `/tenant/pembayaran/buat?property_id=${property.id}&unit_id=${unit.id}`
                                )}`
                          }
                          className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-700 px-3.5 text-xs font-semibold text-white transition hover:bg-blue-800"
                        >
                          Pilih Blok
                          <ArrowRight size={13} />
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </article>
        </div>

        <aside className="space-y-5">
          <article className="rounded-2xl border bg-white p-4 shadow-sm sm:p-5">
            <h2 className="text-base font-semibold text-slate-900">Ringkasan Cepat</h2>
            <div className="mt-3 space-y-2">
              <SidebarItem label="Tipe Properti" value={formatLabel(property.property_type)} />
              <SidebarItem label="Kondisi" value={formatLabel(property.condition)} />
              <SidebarItem label="Alamat" value={property.address || "-"} />
              <SidebarItem
                label="Ketersediaan"
                value={`${availableUnits.length} blok tersedia`}
              />
            </div>
          </article>

          <article className="rounded-2xl border bg-white p-4 shadow-sm sm:p-5">
            <h2 className="text-base font-semibold text-slate-900">
              Properti Serupa
            </h2>
            {related.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">
                Belum ada properti serupa yang tersedia saat ini.
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                {related.map((item) => (
                  <Link
                    key={item.id}
                    href={`/sewa/${item.id}`}
                    className="block overflow-hidden rounded-xl border border-slate-200 bg-slate-50 transition hover:border-blue-300"
                  >
                    <div className="relative h-28">
                      <Image
                        src={resolvePropertyImage(item.photo_url)}
                        alt={item.name}
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    </div>
                    <div className="space-y-1 p-3">
                      <p className="line-clamp-1 text-sm font-semibold text-slate-900">
                        {item.name}
                      </p>
                      <p className="line-clamp-1 text-xs text-slate-500">
                        {item.address || "-"}
                      </p>
                      <p className="text-xs font-medium text-blue-700">
                        {getPriceRangeLabel(item)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </article>
        </aside>
      </section>

      <VisitRequestModal
        isOpen={isVisitModalOpen}
        propertyName={property.name}
        isSubmitting={isSubmittingVisit}
        onClose={() => {
          if (!isSubmittingVisit) {
            setIsVisitModalOpen(false);
          }
        }}
        onSubmit={handleSubmitVisitRequest}
      />
    </div>
  );
}

function HeroStat({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/30 bg-white/10 px-4 py-3 backdrop-blur-sm">
      <p className="inline-flex items-center gap-1.5 text-xs text-white/85">
        {icon}
        {label}
      </p>
      <p className="mt-1 text-base font-semibold text-white">{value}</p>
    </div>
  );
}

function SidebarItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-800">{value}</p>
    </div>
  );
}
