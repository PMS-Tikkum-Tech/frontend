"use client";

import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Heart,
  Home,
  MapPin,
  Navigation,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  Wifi,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  addTenantFavorite,
  getApiErrorMessage,
  getPublicProperties,
  getTenantFavoriteProperties,
  type PublicPropertySummary,
  removeTenantFavoriteByProperty,
  type TenantFavoriteProperty,
} from "@/lib/dashboard/tenant.api";
import {
  getAdminProperties,
  type AdminPropertyListItem,
} from "@/lib/dashboard/admin.api";
import {
  getTenantFavoritesCache,
  patchFavoriteState,
  setTenantFavoritesCache,
  subscribeTenantFavoritesCache,
} from "@/lib/dashboard/tenant-favorites.store";
import { useTransientToast } from "@/hooks/useTransientToast";
import type { SewaMapLocation } from "@/components/maps/SewaLocationsMap";
import {
  geocodePropertyAddress,
  resolveBackendCoordinate,
  type PropertyCoordinate,
} from "@/lib/maps/property-coordinate";

const CURRENCY_FORMATTER = new Intl.NumberFormat("id-ID");

type SortOption = "newest" | "price_low" | "price_high" | "name";

type PropertyMedia = {
  type: "image" | "video";
  src: string;
};

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

const formatCurrency = (value?: number) => {
  if (!value || value <= 0) {
    return "Hubungi admin";
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

const resolvePropertyImage = (path?: string | null) => {
  const normalizedPath = path?.trim();
  if (!normalizedPath) {
    return "/bg.jpg";
  }

  if (/^data:image\//i.test(normalizedPath)) {
    return normalizedPath;
  }

  if (/^https?:\/\//i.test(normalizedPath)) {
    return normalizedPath;
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
    "http://127.0.0.1:3001";

  return `${baseUrl}${normalizedPath.startsWith("/") ? normalizedPath : `/${normalizedPath}`}`;
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

  return [{ type: "image", src: "/bg.jpg" }];
};

const extractDistrict = (address?: string | null) => {
  if (!address) {
    return "Bogor";
  }

  return address.split(",")[0]?.trim() || "Bogor";
};

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

const POPULAR_PLACES = [
  { name: "Kampus IPB Dramaga", lat: -6.5665, lng: 106.7259 },
  { name: "Stasiun Bogor", lat: -6.5952, lng: 106.7906 },
  { name: "Terminal Bubulak", lat: -6.5645, lng: 106.7746 },
  { name: "Botani Square", lat: -6.6012, lng: 106.8061 },
];

const toRadians = (value: number) => (value * Math.PI) / 180;

const calculateDistanceKm = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
) => {
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
};

const getNearestPopularPlace = (lat: number, lng: number) => {
  return POPULAR_PLACES.reduce(
    (nearest, place) => {
      const distanceKm = calculateDistanceKm(lat, lng, place.lat, place.lng);
      if (!nearest || distanceKm < nearest.distanceKm) {
        return {
          name: place.name,
          distanceKm,
        };
      }

      return nearest;
    },
    null as { name: string; distanceKm: number } | null
  );
};

const formatDistanceLabel = (distanceKm: number, placeName: string) => {
  return `${distanceKm.toFixed(1).replace(".", ",")} km ke ${placeName}`;
};

const getAvailabilityLabel = (item: TenantFavoriteProperty) => {
  const vacantUnits = Math.max(0, item.property.vacant_units || 0);
  const totalUnits = Math.max(
    item.property.total_units || 0,
    (item.property.vacant_units || 0) + (item.property.occupied_units || 0)
  );

  if (vacantUnits > 0) {
    return `${vacantUnits} unit tersedia`;
  }

  if (totalUnits > 0) {
    return "Unit penuh";
  }

  return "Unit belum diupdate";
};

const resolveCoordinate = (
  item: TenantFavoriteProperty,
  geocodedCoordinate?: PropertyCoordinate | null
) => {
  if (geocodedCoordinate) {
    return geocodedCoordinate;
  }

  const backendCoordinate = resolveBackendCoordinate(
    item.property.latitude,
    item.property.longitude
  );
  if (backendCoordinate) {
    return backendCoordinate;
  }

  const searchText = `${item.property.name || ""} ${item.property.address || ""}`.toLowerCase();
  const matched =
    AREA_COORDINATES.find((area) =>
      area.keywords.some((keyword) => searchText.includes(keyword))
    ) || FALLBACK_COORDINATE;

  return {
    lat: matched.lat,
    lng: matched.lng,
  };
};

const toPublicPropertyItems = (
  properties: PublicPropertySummary[]
): TenantFavoriteProperty[] => {
  return properties.map((property) => ({
    favorite_id: null,
    is_favorite: false,
    property,
  }));
};

const resolveAdminMedia = (property: AdminPropertyListItem) => {
  const photoUrls = Array.from(
    new Set([...(property.photo_urls || []), ...(property.roomphoto_urls || [])])
  );
  const videoUrls = Array.from(
    new Set([...(property.video_urls || []), property.video_url || ""])
  ).filter((item): item is string => Boolean(item));

  return {
    photo_url: photoUrls[0] || null,
    photo_urls: photoUrls,
    video_urls: videoUrls,
    video_url: property.video_url || null,
    video_360_url: property.video_360_url || null,
    photo_360_url: property.photo_360_url || null,
  };
};

export default function SewaPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const isTenant = user?.role === "tenant";
  const isAdmin = user?.role === "admin";

  const [items, setItems] = useState<TenantFavoriteProperty[]>([]);
  const [search, setSearch] = useState("");
  const [propertyType, setPropertyType] = useState("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
  const [isUpdatingPropertyId, setIsUpdatingPropertyId] = useState<number | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [geocodedCoordinates, setGeocodedCoordinates] = useState<
    Record<number, PropertyCoordinate>
  >({});
  const { showSuccessToast, showErrorToast } = useTransientToast();

  useEffect(() => {
    if (!isTenant) {
      return;
    }

    return subscribeTenantFavoritesCache((nextItems) => {
      setItems(nextItems);
    });
  }, [isTenant]);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    let active = true;

    const load = async () => {
      setError(null);
      setIsLoading(true);

      if (!isTenant) {
        try {
          const responsePromise = getPublicProperties({
            page: 1,
            per_page: 100,
            sort: "newest",
          });
          const adminResponsePromise = isAdmin
            ? getAdminProperties({
                page: 1,
                per_page: 100,
              })
            : null;
          const [response, adminResponse] = await Promise.all([
            responsePromise,
            adminResponsePromise,
          ]);

          if (!active) {
            return;
          }

          const adminMediaLookup = new Map<
            number,
            {
              photo_url: string | null;
              photo_urls: string[];
              video_urls: string[];
              video_url: string | null;
              video_360_url: string | null;
              photo_360_url: string | null;
            }
          >();
          if (adminResponse) {
            adminResponse.data.forEach((property) => {
              adminMediaLookup.set(property.id, resolveAdminMedia(property));
            });
          }

          setItems(
            toPublicPropertyItems(
              response.data.map((property) => {
                const adminMedia = adminMediaLookup.get(property.id);
                return {
                  ...property,
                  photo_url: adminMedia?.photo_url ?? property.photo_url ?? null,
                  photo_urls: adminMedia?.photo_urls ?? property.photo_urls ?? [],
                  video_urls: adminMedia?.video_urls ?? property.video_urls ?? [],
                  video_url: adminMedia?.video_url ?? property.video_url ?? null,
                  video_360_url:
                    adminMedia?.video_360_url ?? property.video_360_url ?? null,
                  photo_360_url:
                    adminMedia?.photo_360_url ?? property.photo_360_url ?? null,
                };
              })
            )
          );
        } catch (loadError) {
          if (!active) {
            return;
          }

          setError(
            getApiErrorMessage(
              loadError,
              "Gagal memuat daftar properti. Silakan coba lagi."
            )
          );
        } finally {
          if (active) {
            setIsLoading(false);
          }
        }

        return;
      }

      const cachedItems = getTenantFavoritesCache();
      if (cachedItems && reloadKey === 0) {
        setItems(cachedItems);
        setIsLoading(false);
        return;
      }

      try {
        const response = await getTenantFavoriteProperties({
          page: 1,
          per_page: 100,
          sort: "newest",
        });

        if (!active) {
          return;
        }

        setTenantFavoritesCache(response.data);
      } catch (loadError) {
        if (!active) {
          return;
        }

        setError(
          getApiErrorMessage(
            loadError,
            "Gagal memuat daftar kost. Silakan coba lagi."
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
  }, [isAdmin, isAuthLoading, isTenant, reloadKey]);

  useEffect(() => {
    let active = true;

    const unresolvedItems = items.filter((item) => {
      const propertyId = item.property.id;
      if (!propertyId || !item.property.address?.trim()) {
        return false;
      }

      if (geocodedCoordinates[propertyId]) {
        return false;
      }

      return !resolveBackendCoordinate(
        item.property.latitude,
        item.property.longitude
      );
    });

    if (unresolvedItems.length === 0) {
      return () => {
        active = false;
      };
    }

    const resolveMissingCoordinates = async () => {
      for (const item of unresolvedItems) {
        if (!active) {
          return;
        }

        const coordinate = await geocodePropertyAddress(
          item.property.address,
          item.property.name
        );
        if (!active || !coordinate) {
          continue;
        }

        setGeocodedCoordinates((prev) => {
          const current = prev[item.property.id];
          if (current?.lat === coordinate.lat && current?.lng === coordinate.lng) {
            return prev;
          }

          return {
            ...prev,
            [item.property.id]: coordinate,
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
  }, [geocodedCoordinates, items]);

  const propertyTypeOptions = useMemo(() => {
    const types = new Set<string>();
    items.forEach((item) => {
      if (item.property.property_type) {
        types.add(item.property.property_type);
      }
    });

    return Array.from(types.values());
  }, [items]);

  const filteredItems = useMemo(() => {
    let nextItems = items.filter((item) => {
      const searchable = `${item.property.name} ${item.property.address || ""}`.toLowerCase();
      const matchSearch = search.trim()
        ? searchable.includes(search.trim().toLowerCase())
        : true;

      const matchType =
        propertyType === "all" ? true : item.property.property_type === propertyType;

      return matchSearch && matchType;
    });

    if (isTenant && favoriteOnly) {
      nextItems = nextItems.filter((item) => item.is_favorite);
    }

    const sorted = [...nextItems];
    if (sortBy === "name") {
      sorted.sort((a, b) => a.property.name.localeCompare(b.property.name));
    } else if (sortBy === "price_low") {
      sorted.sort((a, b) => (a.property.price_min || 0) - (b.property.price_min || 0));
    } else if (sortBy === "price_high") {
      sorted.sort((a, b) => (b.property.price_min || 0) - (a.property.price_min || 0));
    }

    return sorted;
  }, [favoriteOnly, isTenant, items, propertyType, search, sortBy]);

  const mapLocations = useMemo<SewaMapLocation[]>(() => {
    return filteredItems.map((item) => {
      const coordinate = resolveCoordinate(
        item,
        geocodedCoordinates[item.property.id]
      );

      return {
        id: item.property.id,
        name: item.property.name,
        address: item.property.address || "-",
        lat: coordinate.lat,
        lng: coordinate.lng,
        priceLabel: `${formatCurrency(item.property.price_min)} /bulan`,
        markerLabel: formatMarkerPrice(item.property.price_min),
        isFavorite: item.is_favorite,
      };
    });
  }, [filteredItems, geocodedCoordinates]);

  useEffect(() => {
    if (filteredItems.length === 0) {
      setSelectedPropertyId(null);
      return;
    }

    const selectedStillExists = filteredItems.some(
      (item) => item.property.id === selectedPropertyId
    );
    if (!selectedPropertyId || !selectedStillExists) {
      setSelectedPropertyId(filteredItems[0].property.id);
    }
  }, [filteredItems, selectedPropertyId]);

  const selectedProperty = useMemo(() => {
    if (!selectedPropertyId) {
      return null;
    }

    return (
      filteredItems.find((item) => item.property.id === selectedPropertyId) || null
    );
  }, [filteredItems, selectedPropertyId]);
  const [selectedPreviewSrc, setSelectedPreviewSrc] = useState("/bg.jpg");

  useEffect(() => {
    setSelectedPreviewSrc(
      resolvePropertyImage(selectedProperty?.property.photo_url)
    );
  }, [selectedProperty?.property.photo_url]);

  const marketSnapshot = useMemo(() => {
    const prices = filteredItems
      .map((item) => item.property.price_min || item.property.price_max || 0)
      .filter((value) => value > 0);

    const averagePrice =
      prices.length > 0
        ? Math.round(prices.reduce((sum, price) => sum + price, 0) / prices.length)
        : 0;

    const totalVacantUnits = filteredItems.reduce((sum, item) => {
      return sum + Math.max(0, item.property.vacant_units || 0);
    }, 0);

    const cheapestPrice = prices.length > 0 ? Math.min(...prices) : 0;

    return {
      totalVacantUnits,
      averagePrice,
      cheapestPrice,
    };
  }, [filteredItems]);

  const areaHighlights = useMemo(() => {
    return filteredItems.slice(0, 3).map((item) => {
      const coordinate = resolveCoordinate(
        item,
        geocodedCoordinates[item.property.id]
      );
      const nearestPopular = getNearestPopularPlace(coordinate.lat, coordinate.lng);

      return {
        id: item.property.id,
        name: item.property.name,
        district: extractDistrict(item.property.address),
        priceLabel: formatCurrency(item.property.price_min || item.property.price_max),
        distanceLabel: nearestPopular
          ? formatDistanceLabel(nearestPopular.distanceKm, nearestPopular.name)
          : "-",
      };
    });
  }, [filteredItems, geocodedCoordinates]);

  const favoriteCount = items.filter((item) => item.is_favorite).length;
  const districtCount = new Set(
    items.map((item) => extractDistrict(item.property.address))
  ).size;
  const helpHref = isTenant ? "/tenant/bantuan" : "/auth?next=%2Ftenant%2Fbantuan";

  const handleToggleFavorite = async (item: TenantFavoriteProperty) => {
    if (!isTenant) {
      return;
    }

    const propertyId = item.property.id;
    if (!propertyId || isUpdatingPropertyId !== null) {
      return;
    }

    setIsUpdatingPropertyId(propertyId);
    setError(null);

    const previousItems = getTenantFavoritesCache() || items;
    const optimisticItems = patchFavoriteState(previousItems, propertyId, {
      isFavorite: !item.is_favorite,
      favoriteId: item.is_favorite ? null : item.favorite_id,
    });
    setTenantFavoritesCache(optimisticItems);

    try {
      if (item.is_favorite) {
        await removeTenantFavoriteByProperty(propertyId);
        showSuccessToast("Properti berhasil dihapus dari favorit.");
      } else {
        const response = await addTenantFavorite(propertyId);
        const syncedItems = patchFavoriteState(optimisticItems, propertyId, {
          isFavorite: true,
          favoriteId: response.data.id,
        });
        setTenantFavoritesCache(syncedItems);
        showSuccessToast("Properti berhasil disimpan ke favorit.");
      }
    } catch (toggleError) {
      setTenantFavoritesCache(previousItems);
      showErrorToast(
        getApiErrorMessage(toggleError, "Gagal memperbarui favorit. Silakan coba lagi.")
      );
    } finally {
      setIsUpdatingPropertyId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F7FB]">
      <section className="relative overflow-hidden bg-gradient-to-br from-green-700 via-green-600 to-emerald-700 text-white">
        <div className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full bg-white/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 right-0 h-72 w-72 rounded-full bg-white/10 blur-3xl" />

        <div className="mx-auto max-w-7xl px-6 pb-14 pt-10">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/10 px-4 py-2 text-xs font-medium">
            <Sparkles size={14} />
            Rekomendasi Hunian Mahasiswa IPB
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight">
            Temukan Kost yang Nyaman, Aman, dan Sesuai Budget Kamu
          </h1>
          <p className="mt-3 max-w-3xl text-sm text-white/90">
            Jelajahi pilihan hunian dengan fasilitas lengkap, lokasi strategis,
            dan proses booking yang praktis.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <StatChip label="Hunian Tersedia" value={`${items.length} properti`} />
            <StatChip label="Area Populer" value={`${districtCount || 1} area`} />
            <StatChip
              label="Favorit Tersimpan"
              value={isTenant ? `${favoriteCount} properti` : "Masuk untuk simpan"}
            />
          </div>
        </div>
      </section>

      <section className="relative z-20 mx-auto mt-5 max-w-7xl px-6">
        <div className="rounded-3xl border border-sky-100 bg-gradient-to-br from-white via-sky-50 to-cyan-50 p-5 shadow-xl">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <p className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-3 py-1 text-xs font-semibold text-sky-700">
              <Search size={13} />
              Filter Hunian
            </p>
            <p className="text-xs text-slate-500">
              Cari lebih cepat berdasarkan area dan tipe kost
            </p>
          </div>
          <div className="grid gap-4 lg:grid-cols-4">
            <FilterField
              label="Cari Lokasi / Nama Kost"
              icon={<Search size={16} />}
              highlight
              control={
                <div className="relative">
                  <Search
                    size={15}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sky-600"
                  />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Cari nama kost, area, atau alamat..."
                    className="h-11 w-full rounded-xl border border-sky-200 bg-white pl-9 pr-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              }
            />

            <FilterField
              label="Tipe Hunian"
              icon={<Home size={16} />}
              control={
                <select
                  value={propertyType}
                  onChange={(event) => setPropertyType(event.target.value)}
                  className="h-11 w-full rounded-xl border px-3 text-sm outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-500"
                >
                  <option value="all">Semua Tipe</option>
                  {propertyTypeOptions.map((type) => (
                    <option key={type} value={type}>
                      {formatLabel(type)}
                    </option>
                  ))}
                </select>
              }
            />

            <FilterField
              label="Urutkan"
              icon={<ArrowRight size={16} />}
              control={
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as SortOption)}
                  className="h-11 w-full rounded-xl border px-3 text-sm outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-500"
                >
                  <option value="newest">Terbaru</option>
                  <option value="price_low">Harga Terendah</option>
                  <option value="price_high">Harga Tertinggi</option>
                  <option value="name">Nama A-Z</option>
                </select>
              }
            />

            <div className="flex flex-col justify-end gap-3">
              <button
                type="button"
                onClick={() => setReloadKey((value) => value + 1)}
                className="h-11 rounded-xl bg-green-600 px-4 text-sm font-semibold text-white transition hover:bg-green-700"
              >
                Muat Ulang Data
              </button>

              {isTenant && (
                <label className="inline-flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={favoriteOnly}
                    onChange={(event) => setFavoriteOnly(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-green-600 focus:ring-green-500"
                  />
                  Tampilkan favorit saja
                </label>
              )}
            </div>
          </div>
        </div>
      </section>

      {error && (
        <section className="mx-auto max-w-7xl px-6 pb-3 pt-4">
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
            <button
              type="button"
              onClick={() => setReloadKey((value) => value + 1)}
              className="ml-3 rounded-lg border border-red-200 bg-white px-3 py-1 text-xs font-medium text-red-700"
            >
              Coba Lagi
            </button>
          </div>
        </section>
      )}

      <section className="mx-auto grid max-w-7xl gap-6 px-6 pb-8 pt-5 lg:grid-cols-[minmax(250px,320px)_minmax(0,1fr)]">
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900">
              Kenapa Sewa di Kyra Stay?
            </h3>
            <div className="mt-4 space-y-3">
              <BenefitItem
                icon={<ShieldCheck size={15} />}
                text="Keamanan hunian terpantau"
              />
              <BenefitItem
                icon={<Wifi size={15} />}
                text="Internet stabil untuk kuliah online"
              />
              <BenefitItem
                icon={<Users size={15} />}
                text="Komunitas penghuni aktif"
              />
            </div>
          </div>

          {selectedProperty && (
            <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
              <div className="relative h-40">
                <Image
                  src={selectedPreviewSrc}
                  alt={selectedProperty.property.name}
                  fill
                  unoptimized
                  onError={() => {
                    setSelectedPreviewSrc("/bg.jpg");
                  }}
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <p className="absolute bottom-3 left-3 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
                  {extractDistrict(selectedProperty.property.address)}
                </p>
              </div>

              <div className="space-y-2 p-4">
                <p className="text-base font-semibold text-slate-900">
                  {selectedProperty.property.name}
                </p>
                <p className="text-sm text-slate-600">
                  {selectedProperty.property.address || "-"}
                </p>
                <p className="text-sm text-slate-500">
                  mulai dari
                  <span className="ml-1 text-lg font-semibold text-green-700">
                    {formatCurrency(selectedProperty.property.price_min)}
                  </span>
                  /bulan
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const card = document.getElementById(
                      `property-card-${selectedProperty.property.id}`
                    );
                    card?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className="mt-1 inline-flex h-9 items-center gap-1 rounded-lg bg-green-600 px-3 text-xs font-semibold text-white hover:bg-green-700"
                >
                  Lihat di Daftar
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>
          )}

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900">
              Ringkasan Pasar Sewa
            </h3>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
              <MiniMetric
                label="Unit kosong terdata"
                value={`${marketSnapshot.totalVacantUnits} unit`}
              />
              <MiniMetric
                label="Harga rata-rata"
                value={formatCurrency(marketSnapshot.averagePrice)}
              />
              <MiniMetric
                label="Harga mulai termurah"
                value={formatCurrency(marketSnapshot.cheapestPrice)}
              />
            </div>
            <a
              href="#insight-sewa"
              className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-green-700 hover:text-green-800"
            >
              Lihat insight area
              <ArrowRight size={14} />
            </a>
          </div>

        </aside>

        <div className="relative z-0 isolate overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_55px_-26px_rgba(15,23,42,0.45)]">
          <div className="flex items-center justify-between border-b border-sky-100 bg-gradient-to-r from-sky-50 via-cyan-50 to-emerald-50 px-4 py-3">
            <div>
              <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                <MapPin size={14} className="text-sky-700" />
                Peta Lokasi Kyra Stay
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                Klik marker untuk lihat harga dan ringkasan kost
              </p>
            </div>
            <span className="rounded-full border border-sky-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-sky-700">
              {mapLocations.length} titik aktif
            </span>
          </div>
          <div className="relative z-0 h-[620px] w-full md:h-[680px] lg:h-[760px]">
            <SewaLocationsMap
              locations={mapLocations}
              selectedId={selectedPropertyId}
              onSelect={setSelectedPropertyId}
            />
          </div>
          <div className="border-t border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
            Gunakan scroll/zoom untuk eksplor area, lalu pilih marker untuk lihat
            detail kost.
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-14">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">
            {isLoading
              ? "Memuat properti..."
              : `${filteredItems.length} hunian cocok dengan filter`}
          </p>
          <Link
            href="/auth?next=%2Fsewa"
            className="inline-flex items-center gap-1 text-sm font-medium text-green-700 hover:text-green-800"
          >
            Simpan favorit untuk nanti
            <ArrowRight size={14} />
          </Link>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="h-[340px] animate-pulse rounded-2xl border bg-white"
              />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-2xl border bg-white p-8 text-center">
            <h3 className="text-lg font-semibold text-slate-800">
              Belum ada properti yang sesuai
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              Ubah kata kunci pencarian atau tipe hunian untuk hasil yang lebih
              luas.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setPropertyType("all");
                setSortBy("newest");
                setFavoriteOnly(false);
              }}
              className="mt-4 inline-flex h-10 items-center rounded-xl bg-green-600 px-4 text-sm font-medium text-white hover:bg-green-700"
            >
              Reset Filter
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredItems.map((item) => (
              <PropertyCard
                key={`${item.property.id}-${item.property.photo_url || ""}-${(item.property.photo_urls || []).join(",")}-${(item.property.video_urls || []).join(",")}`}
                item={item}
                resolvedCoordinate={geocodedCoordinates[item.property.id]}
                isSelected={selectedPropertyId === item.property.id}
                isTenant={isTenant}
                isUpdating={isUpdatingPropertyId === item.property.id}
                onHover={setSelectedPropertyId}
                onToggleFavorite={handleToggleFavorite}
              />
            ))}
          </div>
        )}

        <div
          id="insight-sewa"
          className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]"
        >
          <div className="relative overflow-hidden rounded-3xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-cyan-50 p-5 shadow-sm">
            <div className="pointer-events-none absolute -left-10 -top-10 h-32 w-32 rounded-full bg-sky-200/35 blur-3xl" />
            <div className="pointer-events-none absolute -right-10 bottom-0 h-36 w-36 rounded-full bg-emerald-200/25 blur-3xl" />

            <div className="relative flex items-center justify-between gap-3">
              <div>
                <p className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-3 py-1 text-xs font-semibold text-sky-700">
                  <Sparkles size={13} />
                  Insight Area Populer
                </p>
                <h3 className="mt-2 text-base font-semibold text-slate-900">
                  Rangkuman Area yang Paling Diminati
                </h3>
              </div>
              <span className="rounded-full border border-sky-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-sky-700">
                Update realtime
              </span>
            </div>

            {areaHighlights.length === 0 ? (
              <p className="mt-3 text-sm text-slate-600">
                Insight area akan muncul setelah data properti tersedia.
              </p>
            ) : (
              <div className="mt-3 space-y-2.5">
                {areaHighlights.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-sky-200"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {item.name}
                        </p>
                        <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-slate-500">
                          <MapPin size={12} className="text-sky-700" />
                          {item.district}
                        </p>
                      </div>
                      <p className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                        {item.priceLabel}/bulan
                      </p>
                    </div>
                    <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                      <Navigation size={13} className="text-emerald-700" />
                      {item.distanceLabel}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-blue-700 via-blue-700 to-cyan-700 p-5 text-white shadow-sm">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/10 px-3 py-1 text-xs font-semibold">
              Rekomendasi
            </p>
            <h3 className="mt-3 text-xl font-semibold">
              Siap Lanjut Cari Hunian yang Paling Cocok?
            </h3>
            <p className="mt-2 text-sm text-white/90">
              Simpan kandidat terbaik, konsultasikan budget, dan dapatkan
              rekomendasi unit yang sesuai kebutuhanmu.
            </p>

            <div className="mt-4 space-y-2">
              <p className="inline-flex items-center gap-2 text-sm text-white/95">
                <CheckCircle2 size={15} className="text-emerald-300" />
                Rekomendasi berdasarkan lokasi dan harga
              </p>
              <p className="inline-flex items-center gap-2 text-sm text-white/95">
                <CheckCircle2 size={15} className="text-emerald-300" />
                Bantuan admin untuk shortlist unit
              </p>
              <p className="inline-flex items-center gap-2 text-sm text-white/95">
                <CheckCircle2 size={15} className="text-emerald-300" />
                Proses lanjut sewa lebih cepat
              </p>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href={helpHref}
                className="inline-flex h-10 items-center rounded-xl bg-white px-4 text-sm font-semibold text-blue-700 transition hover:bg-slate-100"
              >
                Konsultasi Unit
              </Link>
              <Link
                href="/auth?next=%2Fsewa"
                className="inline-flex h-10 items-center rounded-xl border border-white/45 px-4 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Simpan Favorit
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-gradient-to-r from-[#0B3D91] to-[#0E7490] text-white">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="grid gap-8 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Image
                  src="/logo-header.png"
                  alt="KiKost"
                  width={108}
                  height={34}
                  className="h-8 w-auto rounded object-contain"
                />
                <span className="text-sm text-blue-100">dikelola oleh</span>
                <Image
                  src="/logo-white.png"
                  alt="Kyra Stay"
                  width={92}
                  height={28}
                  className="h-7 w-auto object-contain"
                />
              </div>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-blue-50/95">
                Listing KiKost dikelola tim Kyra Stay agar proses pencarian dan
                sewa lebih jelas, cepat, dan tepercaya.
              </p>
              <p className="mt-4 text-sm text-blue-100">
                Bogor, Jawa Barat • support@kyrastay.id
              </p>
            </div>

            <FooterCol
              title="Menu"
              items={["Beranda", "Sewa", "Kerjasama", "Tentang"]}
            />
            <FooterCol
              title="Layanan"
              items={["Pencarian Kost", "Jadwal Visit", "Favorit", "Pusat Bantuan"]}
            />
            <FooterCol
              title="Kontak"
              items={["WhatsApp Admin", "support@kyrastay.id", "Bogor, Jawa Barat"]}
            />
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-white/20 pt-4 text-xs text-blue-100">
            <p>© 2026 KiKost by Kyra Stay.</p>
            <div className="flex items-center gap-4">
              <Link href="/tentang" className="transition hover:text-white">
                Tentang
              </Link>
              <Link href="/kerjasama" className="transition hover:text-white">
                Kerjasama
              </Link>
              <Link href="/" className="transition hover:text-white">
                Beranda
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/35 bg-white/10 px-4 py-3 backdrop-blur-sm">
      <p className="text-xs text-white/80">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function FilterField({
  label,
  icon,
  control,
  highlight = false,
}: {
  label: string;
  icon: React.ReactNode;
  control: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-3 ${
        highlight
          ? "border-sky-200 bg-white shadow-sm"
          : "border-slate-200 bg-white/80"
      }`}
    >
      <p className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-500">
        {icon}
        {label}
      </p>
      {control}
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function PropertyCard({
  item,
  resolvedCoordinate,
  isSelected,
  isTenant,
  isUpdating,
  onHover,
  onToggleFavorite,
}: {
  item: TenantFavoriteProperty;
  resolvedCoordinate?: PropertyCoordinate | null;
  isSelected: boolean;
  isTenant: boolean;
  isUpdating: boolean;
  onHover: (id: number) => void;
  onToggleFavorite: (item: TenantFavoriteProperty) => void;
}) {
  const router = useRouter();
  const detailHref = `/sewa/${item.property.id}`;
  const favoriteHref = "/auth?next=%2Fsewa";
  const district = extractDistrict(item.property.address);
  const coordinate = resolveCoordinate(item, resolvedCoordinate);
  const nearestPopularPlace = getNearestPopularPlace(coordinate.lat, coordinate.lng);
  const availabilityLabel = getAvailabilityLabel(item);
  const [mediaItems, setMediaItems] = useState<PropertyMedia[]>(
    buildPropertyMedias(item.property)
  );
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);
  const [ignoreCardClick, setIgnoreCardClick] = useState(false);

  const activeMedia = mediaItems[activeMediaIndex] || {
    type: "image" as const,
    src: "/bg.jpg",
  };
  const goToPrevMedia = () => {
    setActiveMediaIndex((prev) => (prev <= 0 ? mediaItems.length - 1 : prev - 1));
  };
  const goToNextMedia = () => {
    setActiveMediaIndex((prev) => (prev >= mediaItems.length - 1 ? 0 : prev + 1));
  };

  const handleGoDetail = () => {
    router.push(detailHref);
  };

  return (
    <div
      id={`property-card-${item.property.id}`}
      onMouseEnter={() => onHover(item.property.id)}
      onClick={(event) => {
        const target = event.target as HTMLElement;
        if (target.closest("[data-stop-card-click]")) {
          return;
        }
        if (ignoreCardClick) {
          setIgnoreCardClick(false);
          return;
        }
        handleGoDetail();
      }}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") {
          return;
        }

        const target = event.target as HTMLElement;
        if (target.closest("[data-stop-card-click]")) {
          return;
        }

        event.preventDefault();
        handleGoDetail();
      }}
      role="link"
      tabIndex={0}
      className={`group cursor-pointer overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl ${
        isSelected ? "ring-2 ring-green-500 ring-offset-1" : ""
      }`}
    >
      <div
        className="relative h-44 overflow-hidden"
        onTouchStart={(event) => {
          setTouchStartX(event.changedTouches[0]?.clientX || null);
          setTouchEndX(null);
        }}
        onTouchMove={(event) => {
          setTouchEndX(event.changedTouches[0]?.clientX || null);
        }}
        onTouchEnd={() => {
          if (mediaItems.length <= 1) {
            return;
          }

          if (touchStartX == null || touchEndX == null) {
            return;
          }

          const delta = touchEndX - touchStartX;
          if (Math.abs(delta) < 40) {
            return;
          }

          setIgnoreCardClick(true);
          if (delta > 0) {
            goToPrevMedia();
          } else {
            goToNextMedia();
          }
        }}
      >
        {activeMedia.type === "video" ? (
          <video
            src={activeMedia.src}
            autoPlay
            muted
            loop
            playsInline
            onError={() => {
              setMediaItems((prev) =>
                prev.map((media, idx) =>
                  idx === activeMediaIndex
                    ? { type: "image", src: "/bg.jpg" }
                    : media
                )
              );
            }}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <Image
            src={activeMedia.src}
            alt={item.property.name}
            fill
            unoptimized
            onError={() => {
              setMediaItems((prev) =>
                prev.map((media, idx) =>
                  idx === activeMediaIndex
                    ? { type: "image", src: "/bg.jpg" }
                    : media
                )
              );
            }}
            className="object-cover transition duration-500 group-hover:scale-105"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent" />
        {mediaItems.length > 1 ? (
          <div className="absolute bottom-3 right-3 flex items-center gap-1.5">
            <button
              type="button"
              data-stop-card-click
              onClick={(event) => {
                event.stopPropagation();
                goToPrevMedia();
              }}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/70 bg-black/40 text-white backdrop-blur-sm"
              aria-label="Media sebelumnya"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="rounded-full border border-white/70 bg-black/40 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
              {activeMediaIndex + 1}/{mediaItems.length}
            </span>
            <button
              type="button"
              data-stop-card-click
              onClick={(event) => {
                event.stopPropagation();
                goToNextMedia();
              }}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/70 bg-black/40 text-white backdrop-blur-sm"
              aria-label="Media berikutnya"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        ) : null}

        <span className="absolute left-3 top-3 rounded-lg bg-black/60 px-2.5 py-1 text-xs font-medium text-white">
          {formatLabel(item.property.property_type)}
        </span>

        {isTenant ? (
          <button
            type="button"
            data-stop-card-click
            onClick={(event) => {
              event.stopPropagation();
              onToggleFavorite(item);
            }}
            disabled={isUpdating}
            className={`absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur-sm transition ${
              item.is_favorite
                ? "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                : "border-white/70 bg-white/85 text-slate-600 hover:bg-white"
            } disabled:opacity-60`}
            aria-label={item.is_favorite ? "Hapus favorit" : "Simpan favorit"}
          >
            <Heart
              size={16}
              className={item.is_favorite ? "fill-current" : ""}
            />
          </button>
        ) : (
          <Link
            href={favoriteHref}
            data-stop-card-click
            className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/70 bg-white/85 text-slate-600 backdrop-blur-sm transition hover:bg-white"
            aria-label="Masuk untuk simpan favorit"
          >
            <Heart size={16} />
          </Link>
        )}
      </div>

      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-base font-semibold text-slate-900">
            {item.property.name}
          </h3>
          <span
            className={`inline-flex flex-shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold ${
              availabilityLabel.includes("tersedia")
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : availabilityLabel.includes("penuh")
                  ? "border-rose-200 bg-rose-50 text-rose-700"
                  : "border-slate-200 bg-slate-50 text-slate-600"
            }`}
          >
            {availabilityLabel}
          </span>
        </div>

        <p className="flex min-h-10 items-start gap-1.5 text-sm text-slate-700">
          <MapPin size={14} className="mt-0.5 flex-shrink-0 text-blue-700" />
          <span className="line-clamp-2 leading-5">
            {item.property.address || district}
          </span>
        </p>

        {nearestPopularPlace ? (
          <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <Navigation size={13} className="text-emerald-700" />
            {formatDistanceLabel(
              nearestPopularPlace.distanceKm,
              nearestPopularPlace.name
            )}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-1.5">
          {(item.property.facilities || []).length > 0 ? (
            (item.property.facilities || []).slice(0, 3).map((facility) => (
              <span
                key={`${item.property.id}-${facility}`}
                className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600"
              >
                {formatLabel(facility)}
              </span>
            ))
          ) : (
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600">
              Fasilitas menyusul
            </span>
          )}
        </div>

        <div className="rounded-xl border border-green-100 bg-green-50/70 px-3 py-2">
          <p className="text-xs font-medium text-green-800">
            mulai dari
            <span className="ml-1 text-xl font-semibold">
              {formatCurrency(item.property.price_min)}
            </span>
            <span className="ml-1 text-sm font-medium">/bulan</span>
          </p>
        </div>
      </div>
    </div>
  );
}

function BenefitItem({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
      <span className="text-green-700">{icon}</span>
      {text}
    </div>
  );
}

function FooterCol({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="text-sm font-semibold tracking-wide text-white">{title}</p>
      <div className="mt-3 space-y-2 text-sm text-blue-100">
        {items.map((item) => (
          <p key={item} className="transition hover:text-white">
            {item}
          </p>
        ))}
      </div>
    </div>
  );
}
