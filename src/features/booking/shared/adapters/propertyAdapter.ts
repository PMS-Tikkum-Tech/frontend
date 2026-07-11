import {
  getPublicPropertyAvailabilityLabel,
  getPublicPropertyAvailabilityStatus,
  type PublicPropertySummary,
} from "@/lib/dashboard/tenant.api";
import { formatBookingCurrency, formatBookingLabel } from "../utils/bookingFormatters";
import { firstBookingMediaUrl } from "../utils/bookingMedia";
import { createBookingPropertySlug } from "../utils/propertySlug";

export type BookingV2Property = {
  id: number;
  slug: string;
  name: string;
  address: string;
  location: string;
  distanceText: string;
  propertyType: string | null;
  propertyTypeLabel: string;
  conditionLabel: string;
  availabilityStatus: string;
  availabilityLabel: string;
  totalUnits: number;
  availableUnits: number;
  priceMin: number;
  priceMax: number;
  priceLabel: string;
  hasPromo: boolean;
  imageUrl: string;
  images: string[];
  facilities: string[];
  raw: PublicPropertySummary;
};

const dedupeImages = (property: PublicPropertySummary) => {
  const candidates = [
    property.photo_url || "",
    ...(property.photo_urls || []),
    property.photo_360_url || "",
    ...(property.roomphoto_urls || []),
  ]
    .map((item) => item.trim())
    .filter(Boolean);

  const uniqueCandidates = Array.from(new Set(candidates));
  const images = uniqueCandidates.map((path) => firstBookingMediaUrl(path));

  return images.length > 0 ? images : ["/bg.jpg"];
};

const extractLocation = (address?: string | null) => {
  if (!address) {
    return "Bogor";
  }

  const parts = address.split(",").map((part) => part.trim()).filter(Boolean);
  return parts.slice(-2).join(", ") || parts[0] || "Bogor";
};

export const adaptPublicPropertyToBookingV2Property = (
  property: PublicPropertySummary
): BookingV2Property => {
  const priceMin = property.price_min || 0;
  const priceMax = property.price_max || priceMin;
  const images = dedupeImages(property);

  return {
    id: property.id,
    slug: createBookingPropertySlug(property.id, property.name),
    name: property.name || `Properti #${property.id}`,
    address: property.address || "-",
    location: extractLocation(property.address),
    distanceText: property.address?.toLowerCase().includes("dramaga")
      ? "Dekat area IPB Dramaga"
      : "Area Bogor",
    propertyType: property.property_type || null,
    propertyTypeLabel: formatBookingLabel(property.property_type),
    conditionLabel: formatBookingLabel(property.condition),
    availabilityStatus: getPublicPropertyAvailabilityStatus(property),
    availabilityLabel: getPublicPropertyAvailabilityLabel(property),
    totalUnits: property.total_units || 0,
    availableUnits: property.available_units ?? property.vacant_units ?? 0,
    priceMin,
    priceMax,
    priceLabel:
      priceMax > priceMin && priceMin > 0
        ? `${formatBookingCurrency(priceMin)} - ${formatBookingCurrency(priceMax)}`
        : formatBookingCurrency(priceMin || priceMax),
    hasPromo: Boolean(property.has_promo),
    imageUrl: images[0],
    images,
    facilities: property.facilities || [],
    raw: property,
  };
};

export const adaptPublicPropertiesToBookingV2 = (
  properties: PublicPropertySummary[]
) => properties.map(adaptPublicPropertyToBookingV2Property);
