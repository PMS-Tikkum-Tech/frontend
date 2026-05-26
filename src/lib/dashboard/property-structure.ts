import type {
  AdminPropertyTenantRow,
  AdminPropertyUnitRow,
  AdminUser,
} from "@/lib/dashboard/admin.api";

type OwnerLike = {
  id?: number | null;
  full_name?: string | null;
  email?: string | null;
} | null;

export type StructuredUnitStatus =
  | "vacant"
  | "occupied"
  | "booking"
  | "maintenance"
  | string;

export interface ParsedUnitIdentity {
  buildingName: string;
  unitName: string;
}

export interface PropertyStructureUnit {
  id: number;
  name: string;
  displayName: string;
  buildingName: string;
  unitType: string;
  status: StructuredUnitStatus;
  peopleAllowed: number;
  price: number;
  tenantName?: string | null;
  tenantEmail?: string | null;
  tenantPhone?: string | null;
  leaseStart?: string | null;
  leaseEnd?: string | null;
  leaseDurationLabel: string;
  note?: string | null;
}

export interface PropertyStructureBlock {
  key: string;
  id?: number | null;
  name: string;
  ownerId?: number | null;
  ownerName: string;
  photoUrls: string[];
  videoUrl?: string | null;
  video360Url?: string | null;
  totalUnits: number;
  occupiedUnits: number;
  bookingUnits: number;
  vacantUnits: number;
  maintenanceUnits: number;
  units: PropertyStructureUnit[];
}

export interface PropertyStructure {
  propertyId: number | string;
  propertyName: string;
  blockCount: number;
  totalUnits: number;
  occupiedUnits: number;
  bookingUnits: number;
  vacantUnits: number;
  maintenanceUnits: number;
  blocks: PropertyStructureBlock[];
}

const UNSET_BUILDING_NAME = "Blok belum diatur";

const toOptionalString = (value: unknown) => {
  return typeof value === "string" && value.trim() ? value.trim() : null;
};

const toOptionalNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

export const parseUnitIdentity = ({
  unitName,
  buildingName,
}: {
  unitName?: string | null;
  buildingName?: string | null;
}): ParsedUnitIdentity => {
  const normalizedUnitName = unitName?.trim() || "Unit";
  const explicitBuildingName = buildingName?.trim();

  if (explicitBuildingName) {
    return {
      buildingName: explicitBuildingName,
      unitName: normalizedUnitName,
    };
  }

  const separatorMatch = normalizedUnitName.match(
    /^(.+?)\s*(?:-|\/|\||•|·|:)\s*(.+)$/
  );
  if (separatorMatch?.[1] && separatorMatch[2]) {
    return {
      buildingName: separatorMatch[1].trim(),
      unitName: separatorMatch[2].trim(),
    };
  }

  const compactBlockMatch = normalizedUnitName.match(
    /^((?:blok|block|tower|gedung|bangunan)\s+[a-z0-9][\w\s-]*?)\s+(.+)$/i
  );
  if (compactBlockMatch?.[1] && compactBlockMatch[2]) {
    return {
      buildingName: compactBlockMatch[1].trim(),
      unitName: compactBlockMatch[2].trim(),
    };
  }

  return {
    buildingName: UNSET_BUILDING_NAME,
    unitName: normalizedUnitName,
  };
};

export const buildPersistedUnitName = (buildingName: string, unitName: string) => {
  const normalizedBuildingName = buildingName.trim();
  const normalizedUnitName = unitName.trim();

  if (!normalizedBuildingName) {
    return normalizedUnitName;
  }

  if (
    normalizedUnitName
      .toLowerCase()
      .startsWith(normalizedBuildingName.toLowerCase())
  ) {
    return normalizedUnitName;
  }

  return `${normalizedBuildingName} - ${normalizedUnitName}`;
};

const getTenantByUnitId = (
  tenants: AdminPropertyTenantRow[],
  unitId: number
) => {
  return tenants.find((tenant) => tenant.unit_id === unitId) || null;
};

const getOwnerName = ({
  ownerId,
  ownerName,
  owners,
  fallbackOwner,
}: {
  ownerId?: number | null;
  ownerName?: string | null;
  owners: AdminUser[];
  fallbackOwner?: OwnerLike;
}) => {
  if (ownerName?.trim()) {
    return ownerName.trim();
  }

  if (ownerId) {
    const owner = owners.find((item) => item.id === ownerId);
    if (owner) {
      return owner.full_name;
    }
  }

  return fallbackOwner?.full_name || "Owner belum diatur";
};

const normalizeStatus = (
  unit: AdminPropertyUnitRow,
  tenant: AdminPropertyTenantRow | null
): StructuredUnitStatus => {
  const status = unit.status?.toLowerCase().trim();

  if (status === "booked" || status === "reserved") {
    return "booking";
  }

  if (status === "booking" || status === "maintenance" || status === "occupied") {
    return status;
  }

  if (tenant?.tenant_name || unit.tenant_name) {
    return "occupied";
  }

  return status || "vacant";
};

const getLeaseDurationLabel = (
  startDate?: string | null,
  endDate?: string | null
) => {
  if (!startDate || !endDate) {
    return "-";
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "-";
  }

  const dayDiff = Math.max(
    1,
    Math.ceil((end.getTime() - start.getTime()) / 86_400_000)
  );
  const monthDiff = Math.max(1, Math.round(dayDiff / 30));

  if (dayDiff < 30) {
    return `${dayDiff} hari`;
  }

  return `${monthDiff} bulan`;
};

const getStatusCount = (units: PropertyStructureUnit[], status: string) => {
  return units.filter((unit) => unit.status === status).length;
};

export const buildPropertyStructure = ({
  propertyId,
  propertyName,
  units,
  tenants,
  owners,
  fallbackOwner,
}: {
  propertyId: number | string;
  propertyName: string;
  units: AdminPropertyUnitRow[];
  tenants: AdminPropertyTenantRow[];
  owners: AdminUser[];
  fallbackOwner?: OwnerLike;
}): PropertyStructure => {
  const blockMap = new Map<string, PropertyStructureBlock>();

  units.forEach((unit) => {
    const tenant = getTenantByUnitId(tenants, unit.unit_id);
    const rawBuildingName =
      toOptionalString(unit.building_name) ||
      toOptionalString(unit.block_name) ||
      toOptionalString(tenant?.building_name) ||
      toOptionalString(tenant?.block_name);
    const parsedIdentity = parseUnitIdentity({
      unitName: unit.unit_name,
      buildingName: rawBuildingName,
    });
    const ownerId =
      toOptionalNumber(unit.owner_id) ??
      toOptionalNumber(unit.block_owner_id) ??
      toOptionalNumber(unit.building_owner_id) ??
      toOptionalNumber(tenant?.owner_id) ??
      toOptionalNumber(tenant?.block_owner_id) ??
      toOptionalNumber(fallbackOwner?.id);
    const ownerName = getOwnerName({
      ownerId,
      ownerName:
        toOptionalString(unit.owner_name) ||
        toOptionalString(unit.block_owner_name) ||
        toOptionalString(unit.building_owner_name) ||
        toOptionalString(tenant?.owner_name) ||
        toOptionalString(tenant?.block_owner_name),
      owners,
      fallbackOwner,
    });
    const blockId =
      toOptionalNumber(unit.building_id) ??
      toOptionalNumber(unit.block_id) ??
      toOptionalNumber(tenant?.building_id) ??
      toOptionalNumber(tenant?.block_id);
    const blockPhotoUrls = Array.from(
      new Set([
        ...((unit.block_photo_urls || unit.block_roomphoto_urls || []) as string[]),
      ])
    ).filter(Boolean);
    const blockVideoUrl =
      toOptionalString(unit.block_video_url) || null;
    const blockVideo360Url =
      toOptionalString(unit.block_video_360_url) || null;
    const blockKey = blockId
      ? `id:${blockId}`
      : parsedIdentity.buildingName.toLowerCase();
    const unitStatus = normalizeStatus(unit, tenant);
    const leaseStart =
      tenant?.lease_start || unit.lease_start || unit.check_in_date || null;
    const leaseEnd =
      tenant?.lease_end || unit.lease_end || unit.check_out_date || null;
    const structuredUnit: PropertyStructureUnit = {
      id: unit.unit_id,
      name: unit.unit_name,
      displayName: parsedIdentity.unitName,
      buildingName: parsedIdentity.buildingName,
      unitType: unit.unit_type,
      status: unitStatus,
      peopleAllowed: Number(unit.people_allowed || 0),
      price: Number(unit.price || 0),
      tenantName: tenant?.tenant_name || unit.tenant_name || null,
      tenantEmail: tenant?.tenant_email || unit.tenant_email || null,
      tenantPhone:
        tenant?.mobile_phone ||
        tenant?.tenant_phone ||
        unit.mobile_phone ||
        unit.tenant_phone ||
        null,
      leaseStart,
      leaseEnd,
      leaseDurationLabel: getLeaseDurationLabel(leaseStart, leaseEnd),
      note:
        tenant?.notes ||
        tenant?.description ||
        unit.notes ||
        unit.description ||
        null,
    };

    const existingBlock = blockMap.get(blockKey);
    const block = existingBlock || {
      key: blockKey,
      id: blockId,
      name: parsedIdentity.buildingName,
      ownerId,
      ownerName,
      photoUrls: blockPhotoUrls,
      videoUrl: blockVideoUrl,
      video360Url: blockVideo360Url,
      totalUnits: 0,
      occupiedUnits: 0,
      bookingUnits: 0,
      vacantUnits: 0,
      maintenanceUnits: 0,
      units: [],
    };

    block.units.push(structuredUnit);
    block.photoUrls = block.photoUrls.length > 0 ? block.photoUrls : blockPhotoUrls;
    block.videoUrl = block.videoUrl || blockVideoUrl;
    block.video360Url = block.video360Url || blockVideo360Url;
    block.totalUnits = block.units.length;
    block.occupiedUnits = getStatusCount(block.units, "occupied");
    block.bookingUnits = getStatusCount(block.units, "booking");
    block.vacantUnits = getStatusCount(block.units, "vacant");
    block.maintenanceUnits = getStatusCount(block.units, "maintenance");
    blockMap.set(blockKey, block);
  });

  const blocks = Array.from(blockMap.values())
    .map((block) => ({
      ...block,
      units: [...block.units].sort((a, b) =>
        a.displayName.localeCompare(b.displayName, "id-ID", {
          numeric: true,
        })
      ),
    }))
    .sort((a, b) =>
      a.name.localeCompare(b.name, "id-ID", {
        numeric: true,
      })
    );
  const allUnits = blocks.flatMap((block) => block.units);

  return {
    propertyId,
    propertyName,
    blockCount: blocks.length,
    totalUnits: allUnits.length,
    occupiedUnits: getStatusCount(allUnits, "occupied"),
    bookingUnits: getStatusCount(allUnits, "booking"),
    vacantUnits: getStatusCount(allUnits, "vacant"),
    maintenanceUnits: getStatusCount(allUnits, "maintenance"),
    blocks,
  };
};
