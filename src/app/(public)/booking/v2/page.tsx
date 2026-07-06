"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Building2, MapPin } from "lucide-react";
import { BOOKING_V2_ENABLED } from "@/features/booking/shared/config/bookingFeatureFlags";
import {
  adaptPublicPropertiesToBookingV2,
  type BookingV2Property,
} from "@/features/booking/shared/adapters/propertyAdapter";
import { fetchAllBookingProperties } from "@/features/booking/shared/api/bookingApi";
import BookingVersionBadge from "@/features/booking/shared/components/BookingVersionBadge";
import { getApiErrorMessage } from "@/lib/dashboard/tenant.api";
import {
  geocodePropertyAddress,
  resolveBackendCoordinate,
  type PropertyCoordinate,
} from "@/lib/maps/property-coordinate";
import type { BookingV2MapLocation } from "@/features/booking/v2/components/BookingV2PropertyMap";
import BookingV2Unavailable from "@/features/booking/v2/components/BookingV2Unavailable";
import CompactSearchBar from "@/features/booking/v2/components/CompactSearchBar";
import ExpandedSearchBar from "@/features/booking/v2/components/ExpandedSearchBar";
import FilterBar, {
  type BookingV2FilterValue,
} from "@/features/booking/v2/components/FilterBar";
import PropertyGrid from "@/features/booking/v2/components/PropertyGrid";
import {
  getBookingV2DurationLabel,
  loadBookingV2Draft,
  loadBookingV2FavoriteIds,
  mergeBookingV2Draft,
  saveBookingV2FavoriteIds,
  type BookingV2DurationPreset,
} from "@/features/booking/v2/store/bookingV2Store";

const BookingV2PropertyMap = dynamic(
  () => import("@/features/booking/v2/components/BookingV2PropertyMap"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-slate-100 text-sm text-slate-500">
        Memuat peta...
      </div>
    ),
  }
);

const FALLBACK_COORDINATE = {
  lat: -6.5667,
  lng: 106.7283,
};

const SPECIFIC_COORDINATES: Array<{
  keywords: string[];
  lat: number;
  lng: number;
}> = [
  {
    keywords: ["cpmj+qq8", "kinara cozy kost", "kinara classic kost"],
    lat: -6.565576272465511,
    lng: 106.73194704615362,
  },
  {
    keywords: ["kinara signature kost", "jl. merdeka no. 10"],
    lat: -6.9124,
    lng: 107.6098,
  },
  {
    keywords: ["kinara urban residence", "jl. asia afrika no. 99"],
    lat: -6.9217,
    lng: 107.6096,
  },
  {
    keywords: ["kinara green house", "jl. dago atas no. 21"],
    lat: -6.8669,
    lng: 107.6191,
  },
];

const AREA_COORDINATES: Array<{
  keywords: string[];
  lat: number;
  lng: number;
}> = [
  { keywords: ["dramaga", "cibanteng"], lat: -6.5667, lng: 106.7283 },
  { keywords: ["cihideung"], lat: -6.5709, lng: 106.7468 },
  { keywords: ["ciampea"], lat: -6.554, lng: 106.703 },
  { keywords: ["baranangsiang"], lat: -6.5956, lng: 106.8068 },
  { keywords: ["bubulak"], lat: -6.5579, lng: 106.7689 },
  { keywords: ["bandung"], lat: -6.9175, lng: 107.6191 },
];

const genderFilterKeywords: Record<"male" | "female", string[]> = {
  male: ["laki-laki", "laki laki", "putra", "pria", "male"],
  female: ["perempuan", "putri", "wanita", "female"],
};

const formatMarkerPrice = (value?: number | null) => {
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

const resolvePropertyCoordinate = (
  property: BookingV2Property,
  geocodedCoordinate?: PropertyCoordinate | null
) => {
  if (geocodedCoordinate) {
    return geocodedCoordinate;
  }

  const backendCoordinate = resolveBackendCoordinate(
    property.raw.latitude,
    property.raw.longitude
  );
  if (backendCoordinate) {
    return backendCoordinate;
  }

  const searchText = `${property.name} ${property.address}`.toLowerCase();
  const specificMatch = SPECIFIC_COORDINATES.find((coordinate) =>
    coordinate.keywords.some((keyword) => searchText.includes(keyword))
  );
  if (specificMatch) {
    return {
      lat: specificMatch.lat,
      lng: specificMatch.lng,
    };
  }

  const matched =
    AREA_COORDINATES.find((area) =>
      area.keywords.some((keyword) => searchText.includes(keyword))
    ) || FALLBACK_COORDINATE;

  return {
    lat: matched.lat,
    lng: matched.lng,
  };
};

const propertyMatchesFilter = (
  property: BookingV2Property,
  activeFilter: BookingV2FilterValue
) => {
  if (
    activeFilter === "all" ||
    activeFilter === "lowest_price" ||
    activeFilter === "highest_price"
  ) {
    return true;
  }

  if (activeFilter === "available") {
    return property.availableUnits > 0;
  }

  const keywords = genderFilterKeywords[activeFilter];
  const propertyText = [
    property.name,
    property.propertyType,
    property.propertyTypeLabel,
    property.raw.description,
    property.raw.rules,
    ...property.facilities,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return keywords.some((keyword) => propertyText.includes(keyword));
};

export default function BookingV2PropertyPage() {
  const [properties, setProperties] = useState<BookingV2Property[]>([]);
  const [selectedMapPropertyId, setSelectedMapPropertyId] = useState<number | null>(
    null
  );
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [durationPreset, setDurationPreset] =
    useState<BookingV2DurationPreset>("1m");
  const [activeFilter, setActiveFilter] =
    useState<BookingV2FilterValue>("all");
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(() => new Set());
  const [searchOpen, setSearchOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [geocodedCoordinates, setGeocodedCoordinates] = useState<
    Record<number, PropertyCoordinate>
  >({});

  useEffect(() => {
    const draft = loadBookingV2Draft();
    setFavoriteIds(loadBookingV2FavoriteIds());
    setSearch(draft?.propertyName || "");
    setStartDate(draft?.checkInDate || "");
    setDurationPreset(draft?.durationPreset || "1m");
  }, []);

  useEffect(() => {
    if (!BOOKING_V2_ENABLED) {
      setIsLoading(false);
      return;
    }

    let active = true;

    const loadProperties = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const allProperties = await fetchAllBookingProperties({
          per_page: 100,
          sort: "newest",
        });

        if (!active) {
          return;
        }

        setProperties(adaptPublicPropertiesToBookingV2(allProperties));
      } catch (caughtError) {
        if (!active) {
          return;
        }

        setProperties([]);
        setError(
          getApiErrorMessage(
            caughtError,
            "Kami belum bisa memuat data properti. Silakan coba lagi."
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
  }, []);

  useEffect(() => {
    let active = true;

    const unresolvedProperties = properties.filter((property) => {
      if (!property.address || property.address === "-") {
        return false;
      }

      if (geocodedCoordinates[property.id]) {
        return false;
      }

      return !resolveBackendCoordinate(
        property.raw.latitude,
        property.raw.longitude
      );
    });

    if (unresolvedProperties.length === 0) {
      return () => {
        active = false;
      };
    }

    const resolveMissingCoordinates = async () => {
      for (const property of unresolvedProperties) {
        if (!active) {
          return;
        }

        const coordinate = await geocodePropertyAddress(
          property.address,
          property.name
        );
        if (!active || !coordinate) {
          continue;
        }

        setGeocodedCoordinates((current) => {
          const existing = current[property.id];
          if (existing?.lat === coordinate.lat && existing?.lng === coordinate.lng) {
            return current;
          }

          return {
            ...current,
            [property.id]: coordinate,
          };
        });

        await new Promise<void>((resolve) => {
          window.setTimeout(resolve, 150);
        });
      }
    };

    void resolveMissingCoordinates();

    return () => {
      active = false;
    };
  }, [geocodedCoordinates, properties]);

  const filteredProperties = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const base = properties.filter((property) => {
      const matchesKeyword = keyword
        ? `${property.name} ${property.address} ${property.location} ${property.propertyTypeLabel}`
            .toLowerCase()
            .includes(keyword)
        : true;

      return matchesKeyword && propertyMatchesFilter(property, activeFilter);
    });

    if (activeFilter === "lowest_price") {
      return [...base].sort((first, second) => {
        const firstPrice = first.priceMin || first.priceMax || Number.MAX_SAFE_INTEGER;
        const secondPrice =
          second.priceMin || second.priceMax || Number.MAX_SAFE_INTEGER;
        return firstPrice - secondPrice;
      });
    }

    if (activeFilter === "highest_price") {
      return [...base].sort((first, second) => {
        const firstPrice = first.priceMax || first.priceMin || 0;
        const secondPrice = second.priceMax || second.priceMin || 0;
        return secondPrice - firstPrice;
      });
    }

    return base;
  }, [activeFilter, properties, search]);

  const selectedMapProperty = useMemo(() => {
    if (filteredProperties.length === 0) {
      return null;
    }

    return (
      filteredProperties.find((property) => property.id === selectedMapPropertyId) ||
      filteredProperties[0]
    );
  }, [filteredProperties, selectedMapPropertyId]);

  const mapLocations = useMemo<BookingV2MapLocation[]>(() => {
    return filteredProperties.map((property) => {
      const coordinate = resolvePropertyCoordinate(
        property,
        geocodedCoordinates[property.id]
      );

      return {
        id: property.id,
        name: property.name,
        address: property.address,
        lat: coordinate.lat,
        lng: coordinate.lng,
        priceLabel: property.priceLabel,
        markerLabel: formatMarkerPrice(property.priceMin || property.priceMax),
        availabilityLabel: property.availabilityLabel,
        availableUnits: property.availableUnits,
        imageUrl: property.imageUrl,
        propertyTypeLabel: property.propertyTypeLabel,
        href: `/booking/v2/property/${property.slug}`,
      };
    });
  }, [filteredProperties, geocodedCoordinates]);

  const handleFavoriteChange = (propertyId: number, isFavorite: boolean) => {
    setFavoriteIds((current) => {
      const next = new Set(current);
      if (isFavorite) {
        next.add(propertyId);
      } else {
        next.delete(propertyId);
      }
      saveBookingV2FavoriteIds(next);
      return next;
    });
  };

  const handleSearchSubmit = (value: {
    location: string;
    startDate: string;
    duration: BookingV2DurationPreset;
  }) => {
    setSearch(value.location);
    setStartDate(value.startDate);
    setDurationPreset(value.duration);
    mergeBookingV2Draft({
      propertyName: value.location,
      checkInDate: value.startDate,
      durationPreset: value.duration,
    });
    setSearchOpen(false);
  };

  if (!BOOKING_V2_ENABLED) {
    return <BookingV2Unavailable />;
  }

  return (
    <div className="min-h-screen bg-[#f8f8ff] pb-12 text-[var(--color-text-primary)]">
      <ExpandedSearchBar
        open={searchOpen}
        initialLocation={search}
        initialStartDate={startDate}
        initialDuration={durationPreset}
        onClose={() => setSearchOpen(false)}
        onSubmit={handleSearchSubmit}
      />
      <section className="border-b border-[#e2dfff] bg-[linear-gradient(90deg,#f7f6ff_0%,#ffffff_50%,#f2f7ff_100%)]">
        <div className="mx-auto flex max-w-[1760px] items-center justify-center px-5 py-4 md:px-8">
          <CompactSearchBar
            location={search}
            startDate={startDate}
            durationLabel={getBookingV2DurationLabel(durationPreset)}
            onOpen={() => setSearchOpen(true)}
          />
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="inline-flex h-12 w-full items-center justify-center rounded-full border border-[#c8c2ff] bg-white px-5 text-sm font-semibold text-[#3423b8] shadow-[var(--shadow-small)] transition hover:border-[#6f63d7] md:hidden"
          >
            Cari kost di dekat IPB
          </button>
        </div>
      </section>
      <FilterBar activeFilter={activeFilter} onChange={setActiveFilter} />

      <main className="mx-auto max-w-[1760px] px-5 py-7 md:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <BookingVersionBadge version="Versi 2" tone="blue" />
            <p className="inline-flex items-center gap-2 rounded-full border border-[#ddd9ff] bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[#3423b8] shadow-sm">
              <span className="h-2 w-2 rounded-full bg-[#d8ff3e] ring-1 ring-[#3423b8]/15" />
              Pemesanan KIKOST
            </p>
            <h1 className="mt-3 text-2xl font-semibold tracking-normal text-[#24147d] md:text-3xl">
              Kost yang cocok untukmu
            </h1>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
              Pilih properti dan kamar sesuai kebutuhanmu.
            </p>
          </div>
        </div>

        {isLoading ? (
          <PropertySearchLoading />
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            <p className="inline-flex items-center gap-2 font-semibold">
              <AlertCircle size={16} />
              Data properti belum bisa dimuat
            </p>
            <p className="mt-2">{error}</p>
          </div>
        ) : filteredProperties.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <Building2 size={24} className="mx-auto text-slate-400" />
            <p className="mt-3 text-sm font-semibold text-slate-800">
              Belum ada kamar yang sesuai dengan pencarianmu.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Ubah kata kunci, hapus filter, atau lihat properti lainnya.
            </p>
            <div className="mt-5 flex justify-center gap-2">
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="inline-flex h-10 items-center rounded-full border border-slate-300 px-4 text-xs font-semibold text-slate-900"
              >
                Ubah tanggal
              </button>
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setActiveFilter("all");
                }}
                className="inline-flex h-10 items-center rounded-full bg-[#3423b8] px-4 text-xs font-semibold text-white"
              >
                Hapus filter
              </button>
            </div>
          </div>
        ) : (
          <section className="grid items-start gap-8 xl:grid-cols-[minmax(620px,780px)_minmax(0,1fr)]">
            <div>
              <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-slate-950">
                    {filteredProperties.length} kost tersedia
                  </p>
                  <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                    Tersedia untuk periode yang kamu pilih.
                  </p>
                </div>
                {activeFilter !== "all" ? (
                  <button
                    type="button"
                    onClick={() => setActiveFilter("all")}
                    className="text-xs font-semibold text-[#3423b8] underline underline-offset-4"
                  >
                    Hapus filter
                  </button>
                ) : null}
              </div>

              <div>
                <PropertyGrid
                  properties={filteredProperties}
                  favoriteIds={favoriteIds}
                  selectedPropertyId={selectedMapProperty?.id}
                  onSelectProperty={setSelectedMapPropertyId}
                  onFavoriteChange={handleFavoriteChange}
                />
              </div>
            </div>

            <aside className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[var(--shadow-small)] xl:sticky xl:top-[13rem] xl:block xl:h-[calc(100vh_-_15rem)]">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <MapPin size={15} className="text-[#3423b8]" />
                  Peta area kost
                </p>
                <span className="rounded-full border border-[#dcd8ff] bg-[#f0eeff] px-3 py-1 text-xs font-semibold text-[#3423b8]">
                  {mapLocations.length} titik
                </span>
              </div>
              <div className="relative z-0 h-[calc(100%_-_49px)] w-full">
                <BookingV2PropertyMap
                  locations={mapLocations}
                  selectedId={selectedMapProperty?.id ?? null}
                  onSelect={setSelectedMapPropertyId}
                />
              </div>
            </aside>
          </section>
        )}
      </main>

    </div>
  );
}

function PropertySearchLoading() {
  return (
    <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="animate-pulse">
          <div className="aspect-square rounded-2xl bg-slate-100" />
          <div className="mt-3 h-4 w-2/3 rounded bg-slate-100" />
          <div className="mt-2 h-3 w-1/2 rounded bg-slate-100" />
          <div className="mt-4 h-4 w-1/3 rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}
