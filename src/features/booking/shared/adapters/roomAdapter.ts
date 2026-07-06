import {
  getTenantUnitBuildingName,
  getTenantUnitDisplayName,
  getTenantUnitNumber,
} from "@/lib/dashboard/tenant-unit-display";
import {
  getCatalogUnitBasePrice,
  getCatalogUnitDisplayPrice,
  type PublicPropertySummary,
  type PublicPropertyUnitSummary,
} from "@/lib/dashboard/tenant.api";
import { formatBookingCurrency, formatBookingLabel } from "../utils/bookingFormatters";
import { firstBookingMediaUrl } from "../utils/bookingMedia";
import {
  getBookingV2RoomStatusLabel,
  mapBackendRoomStatusToBookingV2,
  type BookingV2RoomStatus,
} from "./availabilityAdapter";

export type BookingV2Room = {
  id: number;
  displayName: string;
  roomNumber: string;
  roomType: string;
  buildingName: string;
  blockName: string;
  groupName: string;
  status: Exclude<BookingV2RoomStatus, "selected">;
  statusLabel: string;
  monthlyPrice: number;
  monthlyPriceLabel: string;
  baseMonthlyPrice: number;
  baseMonthlyPriceLabel: string;
  hasPromo: boolean;
  capacityLabel: string;
  facilities: string[];
  imageUrl: string;
  raw: PublicPropertyUnitSummary;
};

const getRoomGroupName = (unit: PublicPropertyUnitSummary) => {
  return (
    getTenantUnitBuildingName(unit) ||
    unit.block_name?.trim() ||
    "Blok belum diatur"
  );
};

export const adaptPublicUnitToBookingV2Room = (
  unit: PublicPropertyUnitSummary,
  property?: PublicPropertySummary | null
): BookingV2Room => {
  const buildingName = getTenantUnitBuildingName(unit) || "";
  const blockName = unit.block_name || buildingName || "";
  const roomNumber =
    getTenantUnitNumber(unit, buildingName) || unit.name || `Unit ${unit.id}`;
  const status = mapBackendRoomStatusToBookingV2(unit.status);
  const baseMonthlyPrice = getCatalogUnitBasePrice(unit);
  const monthlyPrice = getCatalogUnitDisplayPrice(unit) || property?.price_min || property?.price_max || 0;
  const capacityLabel =
    typeof unit.people_allowed === "number" && unit.people_allowed > 0
      ? `${unit.people_allowed} orang`
      : "Kapasitas belum diatur";

  return {
    id: unit.id,
    displayName: getTenantUnitDisplayName(unit, `Unit ${roomNumber}`),
    roomNumber,
    roomType: formatBookingLabel(unit.unit_type || property?.property_type),
    buildingName,
    blockName,
    groupName: getRoomGroupName(unit),
    status,
    statusLabel: getBookingV2RoomStatusLabel(status),
    monthlyPrice,
    monthlyPriceLabel: formatBookingCurrency(monthlyPrice),
    baseMonthlyPrice: baseMonthlyPrice || monthlyPrice,
    baseMonthlyPriceLabel: formatBookingCurrency(baseMonthlyPrice || monthlyPrice),
    hasPromo: Boolean(
      baseMonthlyPrice &&
        monthlyPrice &&
        baseMonthlyPrice > monthlyPrice
    ),
    capacityLabel,
    facilities: unit.facilities?.length ? unit.facilities : property?.facilities || [],
    imageUrl: firstBookingMediaUrl(
      unit.photo_url,
      unit.photo_urls,
      unit.roomphoto_urls,
      unit.block_photo_urls,
      unit.block_roomphoto_urls
    ),
    raw: unit,
  };
};

export const adaptPublicUnitsToBookingV2Rooms = (
  units: PublicPropertyUnitSummary[],
  property?: PublicPropertySummary | null
) => units.map((unit) => adaptPublicUnitToBookingV2Room(unit, property));

export const groupBookingV2Rooms = (rooms: BookingV2Room[]) => {
  const groups = new Map<string, BookingV2Room[]>();

  rooms.forEach((room) => {
    const current = groups.get(room.groupName) || [];
    groups.set(room.groupName, [...current, room]);
  });

  return Array.from(groups.entries()).map(([name, groupRooms]) => ({
    name,
    rooms: groupRooms.sort((first, second) =>
      first.roomNumber.localeCompare(second.roomNumber, "id-ID", {
        numeric: true,
        sensitivity: "base",
      })
    ),
  }));
};
