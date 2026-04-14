"use client";

import Link from "next/link";
import Image from "next/image";
import { Heart, MapPin, RefreshCw, Search, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  addTenantFavorite,
  getApiErrorMessage,
  getTenantFavoriteProperties,
  removeTenantFavoriteByProperty,
  type TenantFavoriteProperty,
} from "@/lib/dashboard/tenant.api";
import {
  getTenantFavoritesCache,
  patchFavoriteState,
  setTenantFavoritesCache,
  subscribeTenantFavoritesCache,
} from "@/lib/dashboard/tenant-favorites.store";
import { useTransientToast } from "@/hooks/useTransientToast";

const CURRENCY_FORMATTER = new Intl.NumberFormat("id-ID");

const formatCurrency = (value?: number) => {
  if (!value || value <= 0) {
    return "Hubungi admin";
  }

  return `Rp ${CURRENCY_FORMATTER.format(value)}`;
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

const formatPriceRange = (min?: number, max?: number) => {
  const normalizedMin = min || 0;
  const normalizedMax = max || 0;

  if (normalizedMin <= 0 && normalizedMax <= 0) {
    return "Hubungi admin";
  }

  if (normalizedMax <= 0 || normalizedMax === normalizedMin) {
    return `${formatCurrency(normalizedMin)} /bulan`;
  }

  return `${formatCurrency(normalizedMin)} - ${formatCurrency(normalizedMax)} /bulan`;
};

const extractDistrict = (address?: string | null) => {
  if (!address) {
    return "Bogor";
  }

  return address.split(",")[0]?.trim() || "Bogor";
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

const filterBySearch = (
  items: TenantFavoriteProperty[],
  searchTerm: string
): TenantFavoriteProperty[] => {
  if (!searchTerm.trim()) {
    return items;
  }

  const normalizedTerm = searchTerm.toLowerCase();
  return items.filter((item) => {
    const property = item.property;
    const searchable = `${property.name} ${property.address || ""}`.toLowerCase();
    return searchable.includes(normalizedTerm);
  });
};

export default function FavoritPage() {
  const [items, setItems] = useState<TenantFavoriteProperty[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingPropertyId, setIsUpdatingPropertyId] = useState<number | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const { showSuccessToast, showErrorToast } = useTransientToast();

  useEffect(() => {
    return subscribeTenantFavoritesCache((nextItems) => {
      setItems(nextItems);
    });
  }, []);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const cachedItems = getTenantFavoritesCache();
      if (cachedItems && reloadKey === 0) {
        setItems(cachedItems);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

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
            "Gagal memuat daftar favorit. Silakan coba lagi."
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
  }, [reloadKey]);

  const filteredItems = useMemo(() => {
    return filterBySearch(items, search);
  }, [items, search]);

  const favoriteItems = filteredItems.filter((item) => item.is_favorite);
  const suggestedItems = filteredItems.filter((item) => !item.is_favorite);
  const cheapestFavoritePrice = useMemo(() => {
    const prices = favoriteItems
      .map((item) => item.property.price_min || 0)
      .filter((value) => value > 0);

    if (prices.length === 0) {
      return null;
    }

    return Math.min(...prices);
  }, [favoriteItems]);

  const favoriteAreaCount = useMemo(() => {
    return new Set(
      favoriteItems.map((item) => extractDistrict(item.property.address))
    ).size;
  }, [favoriteItems]);

  const handleToggleFavorite = async (item: TenantFavoriteProperty) => {
    const propertyId = item.property.id;
    if (!propertyId || isUpdatingPropertyId !== null) {
      return;
    }

    setIsUpdatingPropertyId(propertyId);
    setError(null);

    const previousItems = items;
    const optimisticItems = patchFavoriteState(items, propertyId, {
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
        getApiErrorMessage(
          toggleError,
          "Gagal memperbarui daftar favorit. Silakan coba lagi."
        )
      );
    } finally {
      setIsUpdatingPropertyId(null);
    }
  };

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-rose-500 via-pink-500 to-red-500 p-6 text-white shadow-sm">
        <div className="pointer-events-none absolute -left-10 top-0 h-44 w-44 rounded-full bg-white/20 blur-2xl" />
        <div className="pointer-events-none absolute -right-12 bottom-0 h-48 w-48 rounded-full bg-white/15 blur-3xl" />

        <div className="relative space-y-3">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/15 px-3 py-1 text-xs font-medium">
            <Sparkles size={14} />
            Daftar Properti Favorit
          </p>

          <h1 className="text-3xl font-semibold">Favorit Saya</h1>
          <p className="max-w-2xl text-sm text-white/90">
            Simpan kost yang kamu minati, pantau harganya, dan kelola daftar
            properti yang ingin segera kamu kunjungi.
          </p>

          <div className="grid gap-3 pt-1 sm:grid-cols-3">
            <StatChip label="Kost Favorit" value={`${favoriteItems.length} properti`} />
            <StatChip label="Area Tersimpan" value={`${favoriteAreaCount} area`} />
            <StatChip
              label="Harga Mulai"
              value={cheapestFavoritePrice ? formatCurrency(cheapestFavoritePrice) : "-"}
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-[260px] flex-1">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
              <Search size={18} className="text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari nama atau alamat kost..."
                className="w-full bg-transparent text-sm outline-none"
              />
            </div>
          </div>

          <button
            onClick={() => setReloadKey((value) => value + 1)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-green-300 hover:text-green-700"
          >
            <RefreshCw size={15} />
            Muat Ulang
          </button>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button
            onClick={() => setReloadKey((value) => value + 1)}
            className="ml-3 rounded-lg border border-red-200 bg-white px-3 py-1 text-xs font-medium text-red-700"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={idx}
              className="h-[320px] animate-pulse rounded-2xl border bg-white"
            />
          ))}
        </div>
      ) : (
        <>
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-800">
                Kost Favorit ({favoriteItems.length})
              </h2>
            </div>

            {favoriteItems.length === 0 ? (
              <div className="rounded-2xl border bg-white p-8 text-center">
                <div className="mx-auto w-full max-w-md">
                  <Image
                    src="/empty-favorite.png"
                    alt="Belum ada favorit"
                    width={600}
                    height={400}
                    className="rounded-2xl opacity-90"
                  />
                </div>
                <p className="mt-4 text-sm text-slate-600">
                  Kamu belum menyimpan kost favorit.
                </p>
                <Link
                  href="/sewa"
                  className="mt-4 inline-flex rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700"
                >
                  Jelajahi Kost
                </Link>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {favoriteItems.map((item) => (
                  <PropertyCard
                    key={item.property.id}
                    item={item}
                    isUpdating={isUpdatingPropertyId === item.property.id}
                    onToggleFavorite={handleToggleFavorite}
                  />
                ))}
              </div>
            )}
          </section>

          <section id="rekomendasi-favorit" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-800">
                Rekomendasi Untuk Disimpan
              </h2>
              <p className="text-sm text-slate-500">{suggestedItems.length} properti</p>
            </div>

            {suggestedItems.length === 0 ? (
              <div className="rounded-2xl border bg-white p-6 text-sm text-slate-500">
                Tidak ada rekomendasi tambahan untuk kata kunci saat ini.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {suggestedItems.map((item) => (
                  <PropertyCard
                    key={item.property.id}
                    item={item}
                    isUpdating={isUpdatingPropertyId === item.property.id}
                    onToggleFavorite={handleToggleFavorite}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/30 bg-white/15 px-4 py-3 backdrop-blur-sm">
      <p className="text-xs text-white/80">{label}</p>
      <p className="mt-1 text-base font-semibold">{value}</p>
    </div>
  );
}

function PropertyCard({
  item,
  isUpdating,
  onToggleFavorite,
}: {
  item: TenantFavoriteProperty;
  isUpdating: boolean;
  onToggleFavorite: (item: TenantFavoriteProperty) => void;
}) {
  const property = item.property;
  const facilityPreview = (property.facilities || []).slice(0, 4);
  const buttonLabel = item.is_favorite ? "Hapus Favorit" : "Simpan Favorit";
  const district = extractDistrict(property.address);

  return (
    <article className="overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="relative h-44 w-full">
        <Image
          src={resolvePropertyImage(property.photo_url)}
          alt={property.name}
          fill
          unoptimized
          className="object-cover"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

        <span className="absolute left-3 top-3 rounded-lg bg-black/60 px-2.5 py-1 text-xs font-medium text-white">
          {formatLabel(property.property_type)}
        </span>

        <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
          <MapPin size={12} />
          {district}
        </span>
      </div>

      <div className="space-y-3 p-4">
        <h3 className="text-base font-semibold text-slate-900">{property.name}</h3>

        <p className="text-sm text-slate-600">{property.address || "-"}</p>

        <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold text-green-700">
          {formatPriceRange(property.price_min, property.price_max)}
        </p>

        <div className="flex flex-wrap gap-2">
          {facilityPreview.length === 0 ? (
            <span className="text-xs text-slate-400">Fasilitas belum tersedia</span>
          ) : (
            facilityPreview.map((facility) => (
              <span
                key={facility}
                className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600"
              >
                {formatLabel(facility)}
              </span>
            ))
          )}
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            onClick={() => onToggleFavorite(item)}
            disabled={isUpdating}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition disabled:opacity-60 ${
              item.is_favorite
                ? "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                : "border border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
            }`}
          >
            <Heart size={16} />
            {isUpdating ? "Memproses..." : buttonLabel}
          </button>

          <Link
            href="/sewa"
            className="inline-flex items-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-green-300 hover:text-green-700"
          >
            Lihat di Sewa
          </Link>
        </div>
      </div>
    </article>
  );
}
