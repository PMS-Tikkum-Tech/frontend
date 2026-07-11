"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { resolveApiBaseUrl } from "@/lib/api-base-url";
import {
  ArrowRight,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Gift,
  Heart,
  Home,
  MapPin,
  MessageCircle,
  Navigation,
  Quote,
  Search,
  ShieldCheck,
  Star,
  Users,
  Wallet,
  Wifi,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  addTenantFavorite,
  getApiErrorMessage,
  getPublicPropertyAvailabilityLabel,
  getPublicPropertyAvailabilityStatus,
  getPublicProperties,
  getTenantFavoriteProperties,
  isPublicPropertyLoginRequiredMessage,
  removeTenantFavoriteByProperty,
  type PublicPropertyAvailabilityStatus,
  type PublicPropertySummary,
  type TenantFavoriteProperty,
} from "@/lib/dashboard/tenant.api";
import {
  getAdminProperties,
  type AdminPropertyListItem,
} from "@/lib/dashboard/admin.api";
import { TENANT_PENDING_APPROVAL_NOTICE_STORAGE_KEY } from "@/lib/auth";
import { useTransientToast } from "@/hooks/useTransientToast";

const heroSlides = [
  {
    src: "/bg.jpg",
    alt: "Visual hunian Kyra Stay - tampak depan properti",
    objectPosition: "center 58%",
  },
  {
    src: "/bg.jpg",
    alt: "Visual hunian Kyra Stay - area bangunan modern",
    objectPosition: "center 42%",
  },
  {
    src: "/bg.jpg",
    alt: "Visual hunian Kyra Stay - fasad properti",
    objectPosition: "center 72%",
  },
];

const CURRENCY_FORMATTER = new Intl.NumberFormat("id-ID");
const rawWhatsappNumber =
  process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP?.trim() || "082260773748";
const normalizedWhatsappDigits = rawWhatsappNumber.replace(/[^\d]/g, "");
const whatsappNumber = normalizedWhatsappDigits.startsWith("0")
  ? `62${normalizedWhatsappDigits.slice(1)}`
  : normalizedWhatsappDigits;
const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
  "Halo administrator Kyra Stay, saya ingin tanya soal hunian yang tersedia."
)}`;

type PropertyItem = {
  id: number;
  name: string;
  district: string;
  type: string;
  area: string;
  availabilityStatus: PublicPropertyAvailabilityStatus;
  availabilityLabel: string;
  priceStart: string;
  nearestPopularDistance: string;
  facilities: string[];
  image: string;
  medias: PropertyMedia[];
  occupiedUnits: number;
  totalUnits: number;
  isFavorite: boolean;
  favoriteId: number | null;
};

type PropertyMedia = {
  type: "image" | "video";
  src: string;
};

const formatCurrency = (value?: number) => {
  if (!value || value <= 0) {
    return "Hubungi administrator";
  }

  return `Rp${CURRENCY_FORMATTER.format(value)}`;
};

const hasMonthlyPrice = (value?: number | null) => {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
};

const formatMonthlyPriceLabel = (value?: number | null) => {
  return hasMonthlyPrice(value)
    ? `mulai dari ${formatCurrency(value)} /bulan`
    : "Hubungi administrator";
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

const getAvailabilityBadgeClass = (status: PublicPropertyAvailabilityStatus) => {
  if (status === "available") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "maintenance_only") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-rose-200 bg-rose-50 text-rose-700";
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

  const baseUrl = resolveApiBaseUrl();

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

const parseCoordinate = (
  value: unknown,
  range: { min: number; max: number }
) => {
  let parsed: number | null = null;

  if (typeof value === "number") {
    parsed = value;
  } else if (typeof value === "string") {
    const normalized = value.trim().replace(",", ".");
    if (normalized !== "") {
      const numeric = Number.parseFloat(normalized);
      if (Number.isFinite(numeric)) {
        parsed = numeric;
      }
    }
  }

  if (parsed === null || !Number.isFinite(parsed)) {
    return null;
  }

  if (parsed < range.min || parsed > range.max) {
    return null;
  }

  return parsed;
};

const resolveCoordinate = (property: PublicPropertySummary) => {
  const latitude = parseCoordinate(property.latitude, { min: -90, max: 90 });
  const longitude = parseCoordinate(property.longitude, {
    min: -180,
    max: 180,
  });
  if (latitude !== null && longitude !== null) {
    return {
      lat: latitude,
      lng: longitude,
    };
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

const getNearestPopularDistanceLabel = (property: PublicPropertySummary) => {
  const coordinate = resolveCoordinate(property);
  const nearest = POPULAR_PLACES.reduce(
    (selected, place) => {
      const distanceKm = calculateDistanceKm(
        coordinate.lat,
        coordinate.lng,
        place.lat,
        place.lng
      );
      if (!selected || distanceKm < selected.distanceKm) {
        return {
          name: place.name,
          distanceKm,
        };
      }

      return selected;
    },
    null as { name: string; distanceKm: number } | null
  );

  if (!nearest) {
    return "-";
  }

  return `${nearest.distanceKm.toFixed(1).replace(".", ",")} km ke ${nearest.name}`;
};

const toPropertyItem = (
  property: PublicPropertySummary,
  options?: {
    isFavorite?: boolean;
    favoriteId?: number | null;
  }
): PropertyItem => {
  const medias = buildPropertyMedias(property);
  const occupiedUnits = Math.max(0, property.occupied_units || 0);
  const totalUnits = Math.max(
    property.total_units || 0,
    occupiedUnits + Math.max(0, property.vacant_units || 0)
  );

  return {
    id: property.id,
    name: property.name || "Hunian Kyra Stay",
    district: extractDistrict(property.address),
    type: formatLabel(property.property_type),
    area: property.address || "-",
    availabilityStatus: getPublicPropertyAvailabilityStatus(property),
    availabilityLabel: getPublicPropertyAvailabilityLabel(property),
    priceStart: formatMonthlyPriceLabel(property.price_min || property.price_max),
    nearestPopularDistance: getNearestPopularDistanceLabel(property),
    facilities: (property.facilities || [])
      .slice(0, 3)
      .map((facility) => formatLabel(facility)),
    image: medias[0]?.src || "/bg.jpg",
    medias,
    occupiedUnits,
    totalUnits,
    isFavorite: options?.isFavorite || false,
    favoriteId: options?.favoriteId ?? null,
  };
};

const toPropertyItemsFromFavorites = (items: TenantFavoriteProperty[]) => {
  return items.map((item) =>
    toPropertyItem(item.property, {
      isFavorite: item.is_favorite,
      favoriteId: item.favorite_id ?? null,
    })
  );
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

const serviceHighlights = [
  {
    title: "Keamanan 24 Jam",
    description: "Akses masuk terkontrol, area terpantau, dan tim operasional siaga.",
    icon: <ShieldCheck size={18} />,
  },
  {
    title: "Komunitas Positif",
    description: "Suasana penghuni nyaman untuk belajar, networking, dan aktivitas harian.",
    icon: <Users size={18} />,
  },
  {
    title: "Internet Stabil",
    description: "Cocok untuk kuliah online, streaming materi, dan tugas kelompok.",
    icon: <Wifi size={18} />,
  },
  {
    title: "Pembayaran Praktis",
    description: "Tagihan terpusat dan histori pembayaran mudah dipantau setiap bulan.",
    icon: <Wallet size={18} />,
  },
];

const bookingSteps = [
  {
    title: "Pilih Area dan Unit",
    description: "Saring berdasarkan lokasi, tipe hunian, dan tanggal masuk.",
    icon: <Search size={18} />,
  },
  {
    title: "Jadwalkan Kunjungan",
    description: "Tentukan waktu kunjungan langsung dari halaman daftar hunian.",
    icon: <Calendar size={18} />,
  },
  {
    title: "Pemesanan Daring",
    description: "Lanjutkan pemesanan dan pembayaran dengan proses yang transparan.",
    icon: <Home size={18} />,
  },
];

const testimonials = [
  {
    name: "Nadia, TPB IPB",
    role: "Penghuni 11 bulan",
    avatar: "/avatars/penghuni-nadia.svg",
    quote:
      "Informasi unitnya detail, jadi tidak buang waktu saat survei. Proses pemesanan juga cepat.",
  },
  {
    name: "Raka, Teknik IPB",
    role: "Penghuni 1 tahun",
    avatar: "/avatars/penghuni-raka.svg",
    quote:
      "Yang paling membantu itu filter lokasi dan jarak ke kampus. Tinggal pilih yang paling cocok.",
  },
  {
    name: "Dina, FEM IPB",
    role: "Penghuni 8 bulan",
    avatar: "/avatars/penghuni-dina.svg",
    quote:
      "Suasana kost rapi dan aman. Buat fokus kuliah lebih enak karena fasilitasnya lengkap.",
  },
];

const faqItems = [
  {
    question: "Apakah bisa memesan tanpa survei lokasi?",
    answer:
      "Bisa. Kamu tetap disarankan melihat detail unit, foto, dan fasilitas sebelum membayar.",
  },
  {
    question: "Bagaimana cara mengajukan jadwal kunjungan?",
    answer:
      "Masuk ke halaman sewa, pilih properti yang diinginkan, lalu tentukan tanggal kunjungan.",
  },
  {
    question: "Apakah biaya bulanan sudah termasuk internet?",
    answer:
      "Sebagian besar unit sudah termasuk internet. Cek detail fasilitas pada masing-masing properti.",
  },
];

const footerColumns = [
  {
    title: "Menu",
    items: ["Beranda", "Sewa", "Kerjasama", "Tentang"],
  },
  {
    title: "Layanan",
    items: ["Pencarian Kost", "Jadwal Kunjungan", "Pembayaran", "Pusat Bantuan"],
  },
  {
    title: "Kontak",
    items: ["WhatsApp Administrator", "support@kikost.com", "Bogor, Jawa Barat"],
  },
];

export default function LegacyPublicHomePage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const isTenant = user?.role === "tenant";
  const isAdmin = user?.role === "admin" || user?.role === "finance";
  const { showErrorToast, showSuccessToast } = useTransientToast();
  const [slideIndex, setSlideIndex] = useState(0);
  const [properties, setProperties] = useState<PropertyItem[]>([]);
  const [isLoadingProperties, setIsLoadingProperties] = useState(true);
  const [isUpdatingFavoriteId, setIsUpdatingFavoriteId] = useState<number | null>(
    null
  );
  const [propertyError, setPropertyError] = useState<string | null>(null);
  const [propertyNotice, setPropertyNotice] = useState<string | null>(null);
  const [activeDistrict, setActiveDistrict] = useState("Semua");
  const [promoPeriodLabel, setPromoPeriodLabel] = useState("bulan ini");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setPromoPeriodLabel(
      new Date().toLocaleDateString("id-ID", {
        month: "long",
        year: "numeric",
      })
    );

    const shouldShowPendingApprovalNotice = window.sessionStorage.getItem(
      TENANT_PENDING_APPROVAL_NOTICE_STORAGE_KEY
    );

    if (!shouldShowPendingApprovalNotice) {
      return;
    }

    window.sessionStorage.removeItem(TENANT_PENDING_APPROVAL_NOTICE_STORAGE_KEY);
    showSuccessToast(
      "Pendaftaran berhasil. Akun kamu sudah siap digunakan.",
      {
        durationMs: 7000,
      }
    );
  }, [showSuccessToast]);

  useEffect(() => {
    const interval = setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % heroSlides.length);
    }, 4500);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    let active = true;

    const loadProperties = async () => {
      setIsLoadingProperties(true);
      setPropertyError(null);
      setPropertyNotice(null);

      try {
        if (isTenant) {
          const favoriteResponse = await getTenantFavoriteProperties({
            page: 1,
            per_page: 100,
            sort: "newest",
          });

          if (!active) {
            return;
          }

          setPropertyNotice(null);
          setProperties(toPropertyItemsFromFavorites(favoriteResponse.data));
        } else {
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

          setPropertyNotice(response.message || null);
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

          setProperties(
            response.data.map((property) => {
              const adminMedia = adminMediaLookup.get(property.id);
              return toPropertyItem(
                {
                  ...property,
                  photo_url: adminMedia?.photo_url ?? property.photo_url ?? null,
                  photo_urls: adminMedia?.photo_urls ?? property.photo_urls ?? [],
                  video_urls: adminMedia?.video_urls ?? property.video_urls ?? [],
                  video_url: adminMedia?.video_url ?? property.video_url ?? null,
                  video_360_url:
                    adminMedia?.video_360_url ?? property.video_360_url ?? null,
                  photo_360_url:
                    adminMedia?.photo_360_url ?? property.photo_360_url ?? null,
                },
                {
                isFavorite: false,
                favoriteId: null,
                }
              );
            })
          );
        }
      } catch (error) {
        if (!active) {
          return;
        }

        setPropertyError(
          getApiErrorMessage(
            error,
            "Gagal memuat daftar properti. Silakan coba lagi."
          )
        );
        setPropertyNotice(null);
      } finally {
        if (active) {
          setIsLoadingProperties(false);
        }
      }
    };

    void loadProperties();

    return () => {
      active = false;
    };
  }, [isAdmin, isAuthLoading, isTenant]);

  const districts = useMemo(() => {
    const availableDistricts = Array.from(
      new Set(properties.map((property) => property.district).filter(Boolean))
    );

    return ["Semua", ...availableDistricts];
  }, [properties]);

  useEffect(() => {
    if (activeDistrict === "Semua") {
      return;
    }

    if (!districts.includes(activeDistrict)) {
      setActiveDistrict("Semua");
    }
  }, [activeDistrict, districts]);

  const visibleProperties = useMemo(() => {
    const filtered =
      activeDistrict === "Semua"
        ? properties
        : properties.filter((item) => item.district === activeDistrict);
    const ranked = [...filtered].sort((a, b) => {
      if (b.occupiedUnits !== a.occupiedUnits) {
        return b.occupiedUnits - a.occupiedUnits;
      }

      if (b.totalUnits !== a.totalUnits) {
        return b.totalUnits - a.totalUnits;
      }

      return (a.name || "").localeCompare(b.name || "", "id-ID", {
        numeric: true,
        sensitivity: "base",
      });
    });

    return ranked.slice(0, 6);
  }, [activeDistrict, properties]);

  const showCatalogLoginNotice =
    !isTenant &&
    !isAdmin &&
    isPublicPropertyLoginRequiredMessage(propertyNotice) &&
    visibleProperties.length === 0;

  const handleToggleFavorite = async (item: PropertyItem) => {
    if (!isTenant) {
      showErrorToast("Masuk sebagai penyewa untuk menyimpan properti favorit.", {
        action: {
          label: "Masuk / Daftar",
          href: "/auth?next=%2Fsewa",
        },
      });
      return;
    }

    if (isUpdatingFavoriteId !== null) {
      return;
    }

    setIsUpdatingFavoriteId(item.id);
    const previous = properties;
    const optimistic = properties.map((entry) =>
      entry.id === item.id ? { ...entry, isFavorite: !entry.isFavorite } : entry
    );
    setProperties(optimistic);

    try {
      if (item.isFavorite) {
        await removeTenantFavoriteByProperty(item.id);
        showSuccessToast("Properti berhasil dihapus dari favorit.");
      } else {
        const response = await addTenantFavorite(item.id);
        setProperties((current) =>
          current.map((entry) =>
            entry.id === item.id
              ? {
                  ...entry,
                  isFavorite: true,
                  favoriteId: response.data.id,
                }
              : entry
          )
        );
        showSuccessToast("Properti berhasil disimpan ke favorit.");
      }
    } catch (toggleError) {
      setProperties(previous);
      showErrorToast(
        getApiErrorMessage(toggleError, "Gagal menyimpan favorit. Silakan coba lagi.")
      );
    } finally {
      setIsUpdatingFavoriteId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F6FA]">
      <section className="relative overflow-hidden bg-gradient-to-br from-green-700 via-green-600 to-emerald-600 text-white">
        <div className="pointer-events-none absolute -left-20 -top-24 h-72 w-72 rounded-full bg-white/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 right-0 h-80 w-80 rounded-full bg-white/15 blur-3xl" />

        <div className="mx-auto max-w-7xl px-6 pb-28 pt-10">
          <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/15 px-4 py-2 text-xs font-medium">
                <Gift size={14} />
                Promo Spesial Mahasiswa IPB
              </div>

              <h1 className="mt-4 max-w-2xl text-5xl font-bold leading-tight">
                Gaya Hidup Kost Modern,
                <span className="block text-white/90">Nyaman dan Dekat Kampus</span>
              </h1>

              <p className="mt-4 max-w-2xl text-base text-white/90">
                Jelajahi hunian siap huni dengan fasilitas lengkap, proses pemesanan
                cepat, dan dukungan administrator responsif tanpa repot.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/sewa"
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-green-700 transition hover:bg-slate-100"
                >
                  Lihat Semua Kost
                  <ArrowRight size={15} />
                </Link>
                <Link
                  href="/company-profile"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/50 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Pelajari Layanan
                </Link>
              </div>

            </div>

            <div className="relative">
              <div className="relative h-[430px] overflow-hidden rounded-3xl border border-white/30 shadow-2xl">
                {heroSlides.map((image, idx) => (
                  <Image
                    key={`${image.src}-${idx}`}
                    src={image.src}
                    alt={image.alt}
                    fill
                    className={`object-cover transition-opacity duration-1000 ${
                      idx === slideIndex ? "opacity-100" : "opacity-0"
                    }`}
                    style={{ objectPosition: image.objectPosition }}
                  />
                ))}
                <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent" />
              </div>

              <div className="absolute -right-3 top-4 rounded-xl border border-white/40 bg-white/90 px-4 py-3 text-slate-800 shadow-lg">
                <p className="text-xs text-slate-500">Lokasi Populer</p>
                <p className="text-sm font-semibold">Dramaga</p>
              </div>
            </div>
          </div>

        </div>
      </section>

      <main className="mx-auto max-w-7xl space-y-14 px-6 pb-16 pt-10">
        <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="relative overflow-hidden rounded-3xl border border-sky-100 bg-gradient-to-br from-sky-600 via-cyan-600 to-teal-600 p-5 text-white shadow-sm md:p-6">
            <div className="pointer-events-none absolute inset-0 bg-slate-950/10" />
            <div className="pointer-events-none absolute -left-12 -top-12 h-36 w-36 rounded-full bg-white/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-16 -right-8 h-44 w-44 rounded-full bg-white/10 blur-3xl" />

            <div className="relative">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/15 px-3 py-1 text-xs font-semibold">
                  <Gift size={14} />
                  Promo Bulan Ini
                </p>
                <span className="rounded-full border border-white/35 bg-white/15 px-3 py-1 text-xs font-semibold text-white">
                  Terbatas
                </span>
              </div>

              <h2 className="mt-3 text-xl font-semibold leading-tight text-white md:text-2xl">
                Potongan biaya admin dan bonus khusus penghuni baru
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-white">
                Klaim promo saat memesan unit. Berlaku untuk periode pendaftaran
                bulan ini.
              </p>

              <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-white/45 bg-slate-950/20 px-3 py-1.5 text-xs font-medium text-white shadow-sm">
                <Calendar size={14} />
                Periode promo:{" "}
                {promoPeriodLabel}
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <PromoChip
                  title="Diskon Khusus"
                  subtitle="Hingga Rp300.000"
                  icon={<Wallet size={16} />}
                  variant="inverted"
                />
                <PromoChip
                  title="Survei Gratis"
                  subtitle="Tanpa biaya kunjungan"
                  icon={<MapPin size={16} />}
                  variant="inverted"
                />
                <PromoChip
                  title="Uang Kembali"
                  subtitle="Khusus pembayaran awal"
                  icon={<Gift size={16} />}
                  variant="inverted"
                />
              </div>

            </div>
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-emerald-50 p-5 shadow-sm">
            <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-sky-200/35 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-12 -left-10 h-36 w-36 rounded-full bg-emerald-200/25 blur-3xl" />

            <div className="relative">
              <p className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-3 py-1 text-xs font-semibold text-sky-700">
                <MessageCircle size={13} />
                Butuh Bantuan?
              </p>
              <h3 className="mt-3 text-xl font-semibold leading-tight text-slate-900">
                Tim Admin Siap Bantu Cari Unit Terbaik
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Konsultasi cepat untuk rekomendasi unit sesuai anggaran, lokasi, dan
                kebutuhanmu.
              </p>

              <div className="mt-4 space-y-1.5 text-xs text-slate-600">
                <p>• Rekomendasi unit yang masih tersedia</p>
                <p>• Bantuan jadwal kunjungan dan proses pemesanan</p>
              </div>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700"
              >
                <MessageCircle size={15} />
                Hubungi Admin
                <ArrowRight size={14} />
              </a>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">
          <div className="pointer-events-none absolute -left-10 -top-12 h-36 w-36 rounded-full bg-sky-100/60 blur-3xl" />
          <div className="pointer-events-none absolute -right-10 bottom-0 h-40 w-40 rounded-full bg-emerald-100/50 blur-3xl" />

          <div className="relative">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                  <Star size={13} fill="currentColor" />
                  Pilihan Terpopuler
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-slate-900">
                  Pilihan Hunian Terpopuler
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Rekomendasi hunian yang paling sering dilihat dan dipilih
                  penghuni Kyra Stay.
                </p>
              </div>
              <Link
                href="/sewa"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
              >
                Lihat Semua
                <ArrowRight size={14} />
              </Link>
            </div>

            {!isLoadingProperties && districts.length > 1 && (
              <div className="mb-5 flex flex-wrap gap-2">
                {districts.map((district) => (
                  <button
                    key={district}
                    type="button"
                    onClick={() => setActiveDistrict(district)}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                      district === activeDistrict
                        ? "border-sky-600 bg-sky-600 text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    {district}
                  </button>
                ))}
              </div>
            )}

            {propertyError && (
              <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {propertyError}
              </div>
            )}

            {isLoadingProperties ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="h-[360px] animate-pulse rounded-2xl border bg-slate-50"
                  />
                ))}
              </div>
            ) : visibleProperties.length === 0 ? (
              <div className="rounded-2xl border bg-slate-50 p-6 text-center">
                <h3 className="text-lg font-semibold text-slate-900">
                  {showCatalogLoginNotice
                    ? "Masuk untuk melihat katalog hunian"
                    : "Belum ada properti tersedia"}
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  {showCatalogLoginNotice
                    ? "Sistem yang dipakai saat ini hanya membuka katalog properti setelah pengguna masuk."
                    : "Data properti akan muncul otomatis setelah ditambahkan dari dasbor administrator."}
                </p>
                {showCatalogLoginNotice ? (
                  <Link
                    href="/auth?next=%2Fsewa"
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700"
                  >
                    Masuk untuk lihat katalog
                    <ArrowRight size={14} />
                  </Link>
                ) : null}
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {visibleProperties.map((item) => (
                  <PropertyCard
                    key={`${item.id}-${item.medias.length}-${item.medias[0]?.src || "no-media"}`}
                    item={item}
                    isTenant={isTenant}
                    isUpdatingFavorite={isUpdatingFavoriteId === item.id}
                    onToggleFavorite={handleToggleFavorite}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="relative overflow-hidden rounded-3xl border border-sky-200/40 bg-gradient-to-br from-[#1E2746] via-[#295A9A] to-sky-600 p-6 text-white shadow-sm md:p-7">
          <div className="pointer-events-none absolute -left-12 -top-10 h-40 w-40 rounded-full bg-white/15 blur-3xl" />
          <div className="pointer-events-none absolute -right-10 -bottom-16 h-44 w-44 rounded-full bg-white/10 blur-3xl" />

          <div className="relative">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/15 px-3 py-1 text-xs font-semibold text-white">
              <ShieldCheck size={13} />
              Keunggulan Kyra Stay
            </p>
            <h2 className="mt-3 text-2xl font-semibold leading-tight text-white">
              Kenapa Banyak Mahasiswa Pilih Kyra Stay?
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-white/85">
              Fokus kami bukan hanya tempat tinggal, tapi pengalaman hunian yang
              aman, nyaman, dan mendukung aktivitas kuliah harian.
            </p>

            <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {serviceHighlights.map((item, index) => (
                <ServiceCard
                  key={item.title}
                  order={index + 1}
                  title={item.title}
                  description={item.description}
                  icon={item.icon}
                  variant="inverted"
                />
              ))}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-sky-50 p-6 shadow-sm md:p-7">
          <div className="pointer-events-none absolute -left-12 top-4 h-36 w-36 rounded-full bg-emerald-200/35 blur-3xl" />
          <div className="pointer-events-none absolute -right-12 bottom-0 h-40 w-40 rounded-full bg-sky-200/30 blur-3xl" />

          <div className="relative">
            <p className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold text-emerald-700">
              <Calendar size={13} />
              Alur Pemesanan
            </p>
            <h2 className="mt-3 text-2xl font-semibold leading-tight text-slate-900">
              Cara Memesan Dalam 3 Langkah
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Proses sewa dirancang sederhana supaya kamu bisa cepat memilih unit,
              berkunjung, dan lanjut memesan tanpa repot.
            </p>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {bookingSteps.map((step, index) => (
                <StepCard
                  key={step.title}
                  order={index + 1}
                  title={step.title}
                  description={step.description}
                  icon={step.icon}
                />
              ))}
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-6 text-2xl font-semibold text-slate-900">
            Cerita Penghuni
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {testimonials.map((item) => (
              <TestimonialCard
                key={item.name}
                name={item.name}
                role={item.role}
                avatar={item.avatar}
                quote={item.quote}
              />
            ))}
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1fr_1fr]">
          <div className="relative overflow-hidden rounded-3xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-cyan-50 p-5 shadow-sm md:p-6">
            <div className="pointer-events-none absolute -left-10 -top-12 h-32 w-32 rounded-full bg-sky-200/35 blur-3xl" />
            <div className="relative">
              <p className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-3 py-1 text-xs font-semibold text-sky-700">
                <MessageCircle size={13} />
                FAQ Singkat
              </p>
              <h2 className="mt-3 text-xl font-semibold text-slate-900">
                Pertanyaan yang Sering Ditanyakan
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Ringkasan jawaban cepat sebelum kamu pilih unit.
              </p>

              <div className="mt-4 space-y-3">
                {faqItems.map((item) => (
                  <details
                    key={item.question}
                    className="group rounded-2xl border border-slate-200 bg-white p-3 shadow-sm open:border-sky-200 open:bg-sky-50/50"
                  >
                    <summary className="cursor-pointer list-none text-sm font-semibold text-slate-800">
                      <span className="flex items-start justify-between gap-3">
                        <span>{item.question}</span>
                        <span className="mt-0.5 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 transition group-open:bg-sky-100 group-open:text-sky-700">
                          Q
                        </span>
                      </span>
                    </summary>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">
                      {item.answer}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-700 via-cyan-700 to-emerald-700 p-6 text-white shadow-sm">
            <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/20 blur-2xl" />
            <div className="pointer-events-none absolute -left-10 -bottom-12 h-44 w-44 rounded-full bg-white/10 blur-3xl" />

            <div className="relative">
              <p className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/15 px-3 py-1 text-xs font-semibold text-white">
                <Search size={13} />
                Rekomendasi Unit
              </p>
              <h3 className="mt-3 text-2xl font-semibold leading-tight">
                Dapatkan rekomendasi unit paling cocok untukmu
              </h3>
              <p className="mt-2 text-sm text-white/85">
                Tim kami bantu pilihkan unit berdasarkan anggaran, lokasi, dan gaya
                hidupmu.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/sewa"
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-sky-700 transition hover:bg-slate-100"
                >
                  Cari Unit Sekarang
                  <ArrowRight size={14} />
                </Link>
                <Link
                  href="/kerjasama"
                  className="inline-flex items-center rounded-xl border border-white/50 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Lihat Program Kerjasama
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-gradient-to-r from-[#0B3D91] to-[#0E7490] text-white">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="grid gap-8 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Image
                  src="/logo-header.png"
                  alt="KiKost"
                  width={204}
                  height={64}
                  className="h-16 w-auto rounded object-contain"
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
                KIKOST membantu mahasiswa menemukan hunian yang dikelola Kyra Stay
                dengan proses sewa yang praktis, aman, dan transparan.
              </p>
              <p className="mt-4 text-sm text-blue-100">
                Bogor, Jawa Barat • support@kikost.com
              </p>
            </div>

            {footerColumns.map((column) => (
              <FooterColumn key={column.title} title={column.title} items={column.items} />
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-white/20 pt-4 text-xs text-blue-100">
            <p>© 2026 KIKOST by Kyra Stay. Semua hak dilindungi.</p>
            <div className="flex items-center gap-4">
              <Link href="/tentang" className="transition hover:text-white">
                Tentang
              </Link>
              <Link href="/kerjasama" className="transition hover:text-white">
                Kerjasama
              </Link>
              <Link href="/sewa" className="transition hover:text-white">
                Sewa
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}


function PromoChip({
  title,
  subtitle,
  icon,
  variant = "default",
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  variant?: "default" | "inverted";
}) {
  const isInverted = variant === "inverted";

  return (
    <div
      className={`group rounded-2xl border p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        isInverted
          ? "border-white/30 bg-slate-950/18 backdrop-blur-sm hover:border-white/45"
          : "border-slate-200 bg-white/90 hover:border-sky-200"
      }`}
    >
      <div
        className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${
          isInverted ? "bg-white/20 text-white" : "bg-sky-100 text-sky-700"
        }`}
      >
        {icon}
      </div>
      <p className={`mt-2 text-xs font-medium ${isInverted ? "text-white" : "text-slate-500"}`}>
        {title}
      </p>
      <p className={`mt-1 text-sm font-semibold ${isInverted ? "text-white" : "text-slate-900"}`}>
        {subtitle}
      </p>
    </div>
  );
}

function PropertyCard({
  item,
  isTenant,
  isUpdatingFavorite,
  onToggleFavorite,
}: {
  item: PropertyItem;
  isTenant: boolean;
  isUpdatingFavorite: boolean;
  onToggleFavorite: (item: PropertyItem) => void;
}) {
  const router = useRouter();
  const detailHref = `/sewa/${item.id}`;
  const [mediaItems, setMediaItems] = useState<PropertyMedia[]>(
    item.medias.length > 0 ? item.medias : [{ type: "image", src: "/bg.jpg" }]
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
      className="group cursor-pointer overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
    >
      <div
        className="relative h-56 overflow-hidden"
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
            alt={`Hunian ${item.type}`}
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
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
        <div className="absolute left-3 top-3 rounded-lg bg-black/65 px-3 py-1 text-xs font-medium text-white">
          {item.type}
        </div>
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
        {isTenant ? (
          <button
            type="button"
            data-stop-card-click
            onClick={(event) => {
              event.stopPropagation();
              onToggleFavorite(item);
            }}
            disabled={isUpdatingFavorite}
            className={`absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border bg-white/90 text-slate-600 transition hover:bg-white ${
              item.isFavorite ? "border-red-200 text-red-600" : "border-white/80"
            } disabled:opacity-60`}
            aria-label={item.isFavorite ? "Hapus favorit" : "Simpan favorit"}
          >
            <Heart
              size={16}
              className={item.isFavorite ? "fill-current" : ""}
            />
          </button>
        ) : (
          <Link
            href="/auth?next=%2Fsewa"
            data-stop-card-click
            className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/80 bg-white/90 text-slate-600 transition hover:bg-white"
            aria-label="Masuk untuk simpan favorit"
          >
            <Heart size={16} />
          </Link>
        )}
      </div>

      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-base font-semibold text-slate-900">
            {item.name}
          </h3>
          <span
            className={`inline-flex flex-shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold ${getAvailabilityBadgeClass(item.availabilityStatus)}`}
          >
            {item.availabilityLabel}
          </span>
        </div>

        <p className="flex min-h-10 items-start gap-1.5 text-sm text-slate-700">
          <MapPin size={14} className="mt-0.5 flex-shrink-0 text-blue-700" />
          <span className="line-clamp-2 leading-5">{item.area || item.district}</span>
        </p>

        <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
          <Navigation size={13} className="text-emerald-700" />
          {item.nearestPopularDistance}
        </p>

        <div className="flex flex-wrap gap-1.5">
          {(item.facilities.length > 0 ? item.facilities : ["Fasilitas menyusul"]).map(
            (facility) => (
              <span
                key={`${item.id}-${facility}`}
                className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600"
              >
                {facility}
              </span>
            )
          )}
        </div>

        <div className="rounded-xl border border-green-100 bg-green-50/70 px-3 py-2">
          <p className="text-sm font-semibold text-green-800">{item.priceStart}</p>
        </div>
      </div>
    </div>
  );
}

function ServiceCard({
  order,
  title,
  description,
  icon,
  variant = "default",
}: {
  order: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  variant?: "default" | "inverted";
}) {
  const isInverted = variant === "inverted";

  return (
    <div
      className={`group rounded-2xl border p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-md ${
        isInverted
          ? "border-white/15 bg-white/10 backdrop-blur-sm hover:border-white/30"
          : "border-slate-200 bg-white/90 hover:border-sky-200"
      }`}
    >
      <div className="flex items-center justify-between">
        <div
          className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${
            isInverted ? "bg-white/15 text-white" : "bg-sky-100 text-sky-700"
          }`}
        >
          {icon}
        </div>
        <span
          className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
            isInverted
              ? "border-white/20 bg-white/10 text-white/80"
              : "border-slate-200 bg-slate-50 text-slate-500"
          }`}
        >
          0{order}
        </span>
      </div>
      <h3 className={`mt-3 text-sm font-semibold ${isInverted ? "text-white" : "text-slate-900"}`}>
        {title}
      </h3>
      <p className={`mt-1 text-sm leading-relaxed ${isInverted ? "text-white/80" : "text-slate-600"}`}>
        {description}
      </p>
    </div>
  );
}

function StepCard({
  order,
  title,
  description,
  icon,
}: {
  order: number;
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:border-emerald-200 hover:shadow-md">
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-emerald-100/60 blur-2xl" />

      <div className="relative flex items-center justify-between">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
          {icon}
        </div>
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
          0{order}
        </span>
      </div>
      <h3 className="relative mt-3 text-sm font-semibold text-slate-900">
        {title}
      </h3>
      <p className="relative mt-1 text-sm leading-relaxed text-slate-600">
        {description}
      </p>
    </div>
  );
}

function TestimonialCard({
  name,
  role,
  avatar,
  quote,
}: {
  name: string;
  role: string;
  avatar: string;
  quote: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
      <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-sky-100/60 blur-2xl" />

      <div className="relative">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm">
          <Image
            src={avatar}
            alt={`Foto ${name}`}
            width={360}
            height={460}
            className="h-52 w-full object-cover"
            unoptimized
          />
        </div>
        <div className="mt-3 min-w-0">
          <p className="truncate text-base font-semibold text-slate-900">{name}</p>
          <p className="mt-0.5 text-xs text-slate-500">{role}</p>
          <div className="mt-2 flex items-center gap-1 text-amber-500">
            <Star size={13} fill="currentColor" />
            <Star size={13} fill="currentColor" />
            <Star size={13} fill="currentColor" />
            <Star size={13} fill="currentColor" />
            <Star size={13} fill="currentColor" />
          </div>
        </div>

        <div className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-sky-700 shadow-sm">
          <Quote size={15} />
        </div>
      </div>

      <p className="relative mt-4 text-sm leading-relaxed text-slate-600">
        &ldquo;{quote}&rdquo;
      </p>
    </div>
  );
}

function FooterColumn({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="text-sm font-semibold tracking-wide text-white">{title}</p>
      <ul className="mt-3 space-y-2 text-sm text-blue-100">
        {items.map((item) => (
          <li key={item} className="transition hover:text-white">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
