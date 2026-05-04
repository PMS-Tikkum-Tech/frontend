import axios from "axios";
import axiosInstance, { AUTH_SESSION_STORAGE_KEY } from "@/lib/axios";
import type { ApiPaginationMeta } from "@/types/api";
import type { BackendUser } from "@/types/auth";

type QueryParams = Record<string, string | number | boolean | null | undefined>;

type ApiResponse<T, M = undefined> = {
  success: boolean;
  message: string;
  data: T;
  meta?: M;
  errors?: string[];
};

type ListResult<T> = {
  data: T[];
  meta?: ApiPaginationMeta;
  message: string;
};

type ItemResult<T> = {
  data: T;
  message: string;
};

type ApiErrorPayload = {
  message?: string;
  errors?: string[];
  data?: {
    code?: string;
    missing_fields?: string[];
  };
};

export interface TenantPayment {
  id: number;
  invoice_id: string;
  xendit_invoice_id?: string | null;
  property: {
    id: number;
    name?: string | null;
  };
  unit: {
    id: number;
    name?: string | null;
    unit_number?: string | number | null;
    room_number?: string | number | null;
    number?: string | number | null;
    building_name?: string | null;
    block_name?: string | null;
  };
  tenant: {
    id: number;
    full_name?: string | null;
  };
  lease_id?: number | null;
  status: "waiting" | "paid" | "overdue" | "cancelled";
  amount: number;
  due_date?: string | null;
  paid_at?: string | null;
  payment_method?: string | null;
  description?: string | null;
  transfer_proof_url?: string | null;
  booking_status?:
    | "awaiting_payment"
    | "pending_review"
    | "approved"
    | "denied"
    | "cancelled"
    | "expired"
    | string
    | null;
  booking_status_label?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface TenantMaintenanceRequest {
  id: number;
  property: {
    id: number;
    name?: string | null;
  };
  unit: {
    id: number;
    name?: string | null;
    unit_type?: string | null;
    unit_number?: string | number | null;
    room_number?: string | number | null;
    number?: string | number | null;
    building_name?: string | null;
    block_name?: string | null;
  };
  tenant: {
    id: number;
    full_name?: string | null;
  };
  assigned_to: {
    id?: number | null;
    full_name?: string | null;
  };
  issue: string;
  category: string;
  description?: string | null;
  priority: "high" | "medium" | "low";
  status:
    | "unassigned"
    | "assigned"
    | "pending_vendor"
    | "in_progress"
    | "completed"
    | "cancelled";
  requested_date?: string | null;
  repair_date?: string | null;
  visiting_hours?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface TenantCommunication {
  id: number;
  date?: string | null;
  time?: string | null;
  date_time?: string | null;
  target_property: string;
  property: {
    id?: number | null;
    name?: string | null;
    property_type?: string | null;
  };
  subject: string;
  message: string;
  audience_type: "all_tenants" | "some_tenants" | "specific_tenants";
  audience_label: string;
  audience: string;
  status: "scheduled" | "sent" | "failed";
  recipient_count: number;
  scheduled_at?: string | null;
  sent_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface TenantPropertySummary {
  id: number;
  name: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  property_type?: string | null;
  condition?: string | null;
  facilities?: string[];
  owner_name?: string | null;
  total_units?: number;
  occupied_units?: number;
  vacant_units?: number;
  available_units?: number;
  maintenance_units?: number;
  blocked_units?: number;
  total_tenants?: number;
  availability_status?: PublicPropertyAvailabilityStatus | string | null;
  price_min?: number;
  price_max?: number;
  photo_url?: string | null;
  photo_urls?: string[];
  video_urls?: string[];
  video_url?: string | null;
  video_360_url?: string | null;
  photo_360_url?: string | null;
}

export interface TenantFavoriteProperty {
  favorite_id?: number | null;
  is_favorite: boolean;
  property: TenantPropertySummary;
}

export interface TenantFavoriteItem {
  id: number;
  property_id: number;
  favorited_at?: string | null;
  property: TenantPropertySummary;
}

export interface TenantCurrentStay {
  booking_id: number | null;
  booking_code?: string | null;
  status?: string | null;
  status_label?: string | null;
  occupancy_status?: string | null;
  duration_status?: string | null;
  is_currently_renting: boolean;
  days_remaining?: number | null;
  expired_days?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  duration_months?: number | null;
  monthly_rent_amount?: number | null;
  total_amount?: number | null;
  transfer_proof_url?: string | null;
  property: {
    id: number;
    name?: string | null;
    address?: string | null;
    property_type?: string | null;
    condition?: string | null;
  } | null;
  unit: {
    id: number;
    name?: string | null;
    unit_number?: string | number | null;
    room_number?: string | number | null;
    number?: string | number | null;
    building_name?: string | null;
    block_name?: string | null;
    unit_type?: string | null;
    status?: string | null;
    people_allowed?: number | null;
    monthly_rent_amount?: number | null;
    roomphoto_urls?: string[];
  } | null;
  lease?: {
    id?: number | null;
    lease_status?: string | null;
    payment_status?: string | null;
    start_date?: string | null;
    end_date?: string | null;
  } | null;
  settlement?: unknown;
  reviewed_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface TenantStaySummary {
  booking_id: number;
  booking_code?: string | null;
  occupancy_status?: string | null;
  status_label?: string | null;
  property_name?: string | null;
  unit_name?: string | null;
  unit_number?: string | number | null;
  room_number?: string | number | null;
  building_name?: string | null;
  block_name?: string | null;
  monthly_rent_amount?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  duration_months?: number | null;
  roomphoto_urls?: string[];
  transfer_proof_url?: string | null;
  can_report_maintenance: boolean;
  can_submit_payment: boolean;
}

export type TenantVisitRequestPayload = {
  property_id: number;
  preferred_date?: string;
  preferred_time?: string;
  note?: string;
};

export type TenantVisitRequestStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled";

export interface TenantVisitRequest {
  id: number;
  property: {
    id: number;
    name?: string | null;
    address?: string | null;
  };
  preferred_date?: string | null;
  preferred_time?: string | null;
  note?: string | null;
  status: TenantVisitRequestStatus;
  created_at?: string | null;
  updated_at?: string | null;
}

export type PublicPropertyAvailabilityStatus =
  | "available"
  | "maintenance_only"
  | "fully_occupied"
  | "unavailable";

export interface PublicPropertySummary extends TenantPropertySummary {
  created_at?: string | null;
  updated_at?: string | null;
}

export interface PublicPropertyUnitSummary {
  id: number;
  name?: string | null;
  unit_number?: string | number | null;
  room_number?: string | number | null;
  number?: string | number | null;
  building_id?: number | null;
  building_name?: string | null;
  block_id?: number | null;
  block_name?: string | null;
  unit_type?: string | null;
  status?: "vacant" | "occupied" | "maintenance" | string;
  people_allowed?: number | null;
  price?: number | null;
  photo_url?: string | null;
  photo_urls?: string[];
  roomphoto_urls?: string[];
  video_urls?: string[];
  video_url?: string | null;
  video_360_url?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export type TenantMaintenanceCreatePayload = {
  property_id: number;
  unit_id: number;
  issue: string;
  category: string;
  description?: string;
  priority: "high" | "medium" | "low";
  requested_date?: string;
  visiting_hours?: string;
};

export type TenantBookingPaymentPayload = {
  property_id: number;
  unit_id: number;
  check_in_date: string;
  duration_months: number;
  duration_type?: "daily" | "monthly";
  payment_method: string;
  note?: string;
  terms_accepted: boolean;
  transfer_proof: File;
};

type ManualRentalCatalogUnit = {
  id: number;
  name?: string | null;
  unit_number?: string | number | null;
  room_number?: string | number | null;
  number?: string | number | null;
  building_id?: number | null;
  building_name?: string | null;
  block_id?: number | null;
  block_name?: string | null;
  unit_type?: string | null;
  status?: string | null;
  people_allowed?: number | null;
  monthly_rent_amount?: number | null;
  roomphoto_urls?: string[];
  photo_urls?: string[];
  video_urls?: string[];
  video_url?: string | null;
  video_360_url?: string | null;
  property?: {
    id: number;
    name?: string | null;
    address?: string | null;
    description?: string | null;
    property_type?: string | null;
    condition?: string | null;
    facilities?: string[];
    rules?: string | null;
    roomphoto_urls?: string[];
    photo_urls?: string[];
    video_urls?: string[];
    video_url?: string | null;
    video_360_url?: string | null;
    photo_360_url?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  } | null;
  owner?: {
    id?: number | null;
    full_name?: string | null;
    email?: string | null;
    phone_number?: string | null;
  } | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type PublicPropertyApiItem = {
  id: number;
  name?: string | null;
  address?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  property_type?: string | null;
  condition?: string | null;
  facilities?: string[];
  rules?: string | null;
  description?: string | null;
  total_units?: number | null;
  occupied_units?: number | null;
  vacant_units?: number | null;
  maintenance_units?: number | null;
  blocked_units?: number | null;
  available_units?: number | null;
  total_tenants?: number | null;
  price_min?: number | string | null;
  price_max?: number | string | null;
  stats?: {
    total_units?: number | string | null;
    occupied_units?: number | string | null;
    vacant_units?: number | string | null;
    maintenance_units?: number | string | null;
    blocked_units?: number | string | null;
    available_units?: number | string | null;
    total_tenants?: number | string | null;
    price_range?: {
      min?: number | string | null;
      max?: number | string | null;
    } | null;
    availability_status?: string | null;
  } | null;
  availability_status?: string | null;
  photo_url?: string | null;
  photo_urls?: string[];
  roomphoto_urls?: string[];
  video_urls?: string[];
  video_url?: string | null;
  video_360_url?: string | null;
  photo_360_url?: string | null;
  owner_name?: string | null;
  owner?: {
    id?: number | null;
    full_name?: string | null;
  } | null;
  user?: {
    id?: number | null;
    full_name?: string | null;
  } | null;
  available_units_preview?: Array<{
    id: number;
    name?: string | null;
    unit_type?: string | null;
    monthly_rent_amount?: number | string | null;
    roomphoto_urls?: string[];
  }>;
  created_at?: string | null;
  updated_at?: string | null;
};

type ManualRentalBooking = {
  id: number;
  booking_code?: string | null;
  status?: string | null;
  status_label?: string | null;
  total_amount?: number | null;
  monthly_rent_amount?: number | null;
  expires_at?: string | null;
  payment_channel?: string | null;
  payment_submitted_at?: string | null;
  transferred_at?: string | null;
  transfer_proof_url?: string | null;
  reviewed_at?: string | null;
  lease?: {
    id?: number | null;
  } | null;
  property?: {
    id?: number | null;
    name?: string | null;
  } | null;
  unit?: {
    id?: number | null;
    name?: string | null;
    unit_number?: string | number | null;
    room_number?: string | number | null;
    number?: string | number | null;
    building_name?: string | null;
    block_name?: string | null;
  } | null;
  tenant?: {
    id?: number | null;
    full_name?: string | null;
  } | null;
  created_at?: string | null;
  updated_at?: string | null;
};

const sanitizeParams = (params?: QueryParams) => {
  if (!params) {
    return undefined;
  }

  const entries = Object.entries(params).filter(([, value]) => {
    return value !== undefined && value !== null && value !== "";
  });

  return Object.fromEntries(entries);
};

const getList = async <T>(
  path: string,
  params?: QueryParams
): Promise<ListResult<T>> => {
  const response = await axiosInstance.get<ApiResponse<T[], ApiPaginationMeta>>(
    path,
    {
      params: sanitizeParams(params),
    }
  );

  return {
    data: response.data.data,
    meta: response.data.meta,
    message: response.data.message,
  };
};

const getItem = async <T>(path: string): Promise<ItemResult<T>> => {
  const response = await axiosInstance.get<ApiResponse<T>>(path);

  return {
    data: response.data.data,
    message: response.data.message,
  };
};

const resolveApiBaseUrl = () => {
  const envBaseUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (envBaseUrl) {
    return envBaseUrl.replace(/\/$/, "");
  }

  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:3001`;
  }

  return "http://127.0.0.1:3001";
};

const toAbsoluteAssetUrl = (path?: string | null) => {
  if (!path) {
    return null;
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const baseUrl = resolveApiBaseUrl();
  return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
};

const normalizeSortToCatalog = (sort?: string) => {
  if (!sort) {
    return undefined;
  }

  if (sort === "price_low" || sort === "price_asc") {
    return "price_asc";
  }

  if (sort === "price_high" || sort === "price_desc") {
    return "price_desc";
  }

  if (sort === "oldest") {
    return "oldest";
  }

  return "newest";
};

const getNumberParam = (value: unknown, fallback: number) => {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return fallback;
};

const getNumberValue = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().replace(",", ".");
    if (normalized === "") {
      return null;
    }

    const parsed = Number.parseFloat(normalized);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
};

const normalizeAvailabilityStatus = (
  value?: string | null,
  fallback?: {
    availableUnits?: number | null;
    vacantUnits?: number | null;
    maintenanceUnits?: number | null;
    occupiedUnits?: number | null;
    totalUnits?: number | null;
  }
): PublicPropertyAvailabilityStatus => {
  const normalized = value?.trim().toLowerCase().replace(/-/g, "_");
  if (
    normalized === "available" ||
    normalized === "maintenance_only" ||
    normalized === "fully_occupied" ||
    normalized === "unavailable"
  ) {
    return normalized;
  }

  if (normalized === "vacant") {
    return "available";
  }

  if (normalized === "maintenance") {
    return "maintenance_only";
  }

  if (normalized === "occupied") {
    return "fully_occupied";
  }

  const availableUnits = fallback?.availableUnits ?? null;
  const vacantUnits = fallback?.vacantUnits ?? null;
  const maintenanceUnits = fallback?.maintenanceUnits ?? null;
  const occupiedUnits = fallback?.occupiedUnits ?? null;
  const totalUnits = fallback?.totalUnits ?? null;

  if (
    (availableUnits != null && availableUnits > 0) ||
    (vacantUnits != null && vacantUnits > 0)
  ) {
    return "available";
  }

  if (
    maintenanceUnits != null &&
    maintenanceUnits > 0 &&
    (occupiedUnits == null || occupiedUnits <= 0) &&
    (vacantUnits == null || vacantUnits <= 0)
  ) {
    return "maintenance_only";
  }

  if (totalUnits != null && totalUnits > 0) {
    return "fully_occupied";
  }

  return "unavailable";
};

const toStringArray = (value: unknown) => {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  if (typeof value === "string" && value.trim() !== "") {
    return [value.trim()];
  }

  return [] as string[];
};

const dedupeMediaPaths = (...groups: unknown[]) => {
  return Array.from(
    new Set(
      groups.flatMap((group) => {
        return toStringArray(group);
      })
    )
  );
};

const getClientAccessToken = () => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawSession = window.localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
    if (!rawSession) {
      return null;
    }

    const session = JSON.parse(rawSession) as { accessToken?: unknown };
    if (
      typeof session.accessToken === "string" &&
      session.accessToken.trim() !== ""
    ) {
      return session.accessToken;
    }

    return null;
  } catch {
    return null;
  }
};

const getClientRoleFromAccessToken = () => {
  const token = getClientAccessToken();
  if (!token || typeof window === "undefined") {
    return null;
  }

  try {
    const payloadSegment = token.split(".")[1];
    if (!payloadSegment) {
      return null;
    }

    const normalized = payloadSegment
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(payloadSegment.length / 4) * 4, "=");
    const decodedPayload = window.atob(normalized);
    const payload = JSON.parse(decodedPayload) as { role?: unknown };

    return typeof payload.role === "string" ? payload.role : null;
  } catch {
    return null;
  }
};

const getPublicApi = async <T, M = ApiPaginationMeta>(
  path: string,
  params?: QueryParams
) => {
  const token = getClientAccessToken();
  const headers =
    token != null
      ? {
          Authorization: `Bearer ${token}`,
        }
      : undefined;

  return axios.get<ApiResponse<T, M>>(`${resolveApiBaseUrl()}${path}`, {
    params: sanitizeParams(params),
    headers,
  });
};

const paginateArray = <T>(items: T[], page: number, perPage: number) => {
  const totalCount = items.length;
  const totalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / perPage);
  const safePage = Math.max(page, 1);
  const offset = (safePage - 1) * perPage;
  const data = items.slice(offset, offset + perPage);

  return {
    data,
    meta: {
      current_page: safePage,
      next_page: totalPages > safePage ? safePage + 1 : null,
      prev_page: safePage > 1 && totalPages > 0 ? safePage - 1 : null,
      total_pages: totalPages,
      total_count: totalCount,
      per_page: perPage,
    } satisfies ApiPaginationMeta,
  };
};

const isStatusError = (error: unknown, statuses: number[]) => {
  if (!axios.isAxiosError(error)) {
    return false;
  }

  const status = error.response?.status;
  if (!status) {
    return false;
  }

  return statuses.includes(status);
};

const buildCatalogQuery = (params?: QueryParams, page = 1, perPage = 100) => {
  const sort = normalizeSortToCatalog(params?.sort?.toString());

  return sanitizeParams({
    page,
    per_page: perPage,
    search: params?.search,
    location: params?.location,
    property_type: params?.property_type,
    unit_type: params?.unit_type,
    min_price: params?.min_price,
    max_price: params?.max_price,
    sort,
  });
};

const buildAdminPropertyQuery = (params?: QueryParams) => {
  const sort = params?.sort?.toString() === "oldest" ? "oldest" : "newest";

  return sanitizeParams({
    page: params?.page,
    per_page: params?.per_page,
    search: params?.search,
    property_type: params?.property_type,
    sort,
  });
};

const normalizePublicProperty = (
  property: PublicPropertyApiItem
): PublicPropertySummary => {
  const stats = property.stats || {};
  const priceRange = stats.price_range || null;
  const photoUrls = dedupeMediaPaths(
    property.photo_urls,
    property.roomphoto_urls,
    property.photo_url,
    property.available_units_preview?.flatMap((unit) => unit.roomphoto_urls || [])
  );
  const videoUrls = dedupeMediaPaths(property.video_urls, property.video_url);
  const priceMin = getNumberValue(priceRange?.min ?? property.price_min);
  const priceMax = getNumberValue(priceRange?.max ?? property.price_max);
  const totalUnits = getNumberValue(stats.total_units ?? property.total_units);
  const occupiedUnits = getNumberValue(
    stats.occupied_units ?? property.occupied_units
  );
  const vacantUnits = getNumberValue(stats.vacant_units ?? property.vacant_units);
  const maintenanceUnits = getNumberValue(
    stats.maintenance_units ?? property.maintenance_units
  );
  const blockedUnits = getNumberValue(stats.blocked_units ?? property.blocked_units);
  const availableUnits = getNumberValue(
    stats.available_units ?? property.available_units
  );
  const totalTenants = getNumberValue(stats.total_tenants ?? property.total_tenants);
  const availabilityStatus = normalizeAvailabilityStatus(
    stats.availability_status ?? property.availability_status,
    {
      availableUnits,
      vacantUnits,
      maintenanceUnits,
      occupiedUnits,
      totalUnits,
    }
  );

  return {
    id: property.id,
    name: property.name || `Properti #${property.id}`,
    address: property.address || null,
    latitude: getNumberValue(property.latitude),
    longitude: getNumberValue(property.longitude),
    property_type: property.property_type || null,
    condition: property.condition || null,
    facilities: property.facilities || [],
    owner_name:
      property.owner_name ||
      property.owner?.full_name ||
      property.user?.full_name ||
      null,
    total_units: totalUnits == null ? undefined : Math.max(0, totalUnits),
    occupied_units:
      occupiedUnits == null ? undefined : Math.max(0, occupiedUnits),
    vacant_units: vacantUnits == null ? undefined : Math.max(0, vacantUnits),
    maintenance_units:
      maintenanceUnits == null ? undefined : Math.max(0, maintenanceUnits),
    blocked_units: blockedUnits == null ? undefined : Math.max(0, blockedUnits),
    available_units:
      availableUnits == null ? undefined : Math.max(0, availableUnits),
    total_tenants: totalTenants == null ? undefined : Math.max(0, totalTenants),
    availability_status: availabilityStatus,
    price_min: priceMin == null ? undefined : Math.max(0, priceMin),
    price_max: priceMax == null ? undefined : Math.max(0, priceMax),
    photo_url: photoUrls[0] || null,
    photo_urls: photoUrls,
    video_urls: videoUrls,
    video_url: property.video_url || videoUrls[0] || null,
    video_360_url: property.video_360_url || null,
    photo_360_url: property.photo_360_url || null,
    created_at: property.created_at || null,
    updated_at: property.updated_at || null,
  };
};

const fetchAllCatalogUnits = async (params?: QueryParams) => {
  const perPage = 100;
  const firstResponse = await axiosInstance.get<
    ApiResponse<ManualRentalCatalogUnit[], ApiPaginationMeta>
  >("/api/v1/manual_rentals/catalog", {
    params: buildCatalogQuery(params, 1, perPage),
  });

  const units: ManualRentalCatalogUnit[] = [...firstResponse.data.data];
  const totalPages = firstResponse.data.meta?.total_pages || 0;

  for (let page = 2; page <= totalPages; page += 1) {
    const nextResponse = await axiosInstance.get<
      ApiResponse<ManualRentalCatalogUnit[], ApiPaginationMeta>
    >("/api/v1/manual_rentals/catalog", {
      params: buildCatalogQuery(params, page, perPage),
    });
    units.push(...nextResponse.data.data);
  }

  return {
    data: units,
    message: firstResponse.data.message,
  };
};

const fetchAllCatalogProperties = async (params?: QueryParams) => {
  const perPage = 100;
  const firstResponse = await axiosInstance.get<
    ApiResponse<PublicPropertyApiItem[], ApiPaginationMeta>
  >("/api/v1/manual_rentals/catalog/properties", {
    params: buildCatalogQuery(params, 1, perPage),
  });

  const properties: PublicPropertyApiItem[] = [...firstResponse.data.data];
  const totalPages = firstResponse.data.meta?.total_pages || 0;

  for (let page = 2; page <= totalPages; page += 1) {
    const nextResponse = await axiosInstance.get<
      ApiResponse<PublicPropertyApiItem[], ApiPaginationMeta>
    >("/api/v1/manual_rentals/catalog/properties", {
      params: buildCatalogQuery(params, page, perPage),
    });
    properties.push(...nextResponse.data.data);
  }

  return {
    data: properties.map(normalizePublicProperty),
    message: firstResponse.data.message,
  };
};

const aggregatePublicPropertiesFromCatalogUnits = async (
  params?: QueryParams
): Promise<ListResult<PublicPropertySummary>> => {
  const catalogResponse = await fetchAllCatalogUnits(params);
  const propertyMap = new Map<number, PublicPropertySummary>();

  catalogResponse.data.forEach((unit) => {
    const property = unit.property;
    if (!property?.id) {
      return;
    }

    const existing = propertyMap.get(property.id);
    const unitPrice = getNumberValue(unit.monthly_rent_amount);
    const propertyPhotoUrls = dedupeMediaPaths(
      property.photo_urls,
      property.roomphoto_urls,
      unit.roomphoto_urls
    );
    const propertyVideoUrls = dedupeMediaPaths(
      property.video_urls,
      property.video_url
    );

    if (!existing) {
      propertyMap.set(property.id, {
        id: property.id,
        name: property.name || `Properti #${property.id}`,
        address: property.address || null,
        latitude: getNumberValue(property.latitude),
        longitude: getNumberValue(property.longitude),
        property_type: property.property_type || null,
        condition: property.condition || null,
        facilities: property.facilities || [],
        owner_name:
          unit.owner?.full_name ||
          unit.owner?.email ||
          unit.owner?.phone_number ||
          null,
        total_units: 1,
        occupied_units: 0,
        vacant_units: 1,
        maintenance_units: 0,
        blocked_units: 0,
        available_units: 1,
        total_tenants: 0,
        availability_status: "available",
        price_min: unitPrice == null ? undefined : Math.max(0, unitPrice),
        price_max: unitPrice == null ? undefined : Math.max(0, unitPrice),
        photo_url: propertyPhotoUrls[0] || null,
        photo_urls: propertyPhotoUrls,
        video_urls: propertyVideoUrls,
        video_url: property.video_url || propertyVideoUrls[0] || null,
        video_360_url: property.video_360_url || null,
        photo_360_url: property.photo_360_url || null,
        created_at: unit.created_at || null,
        updated_at: unit.updated_at || null,
      });
      return;
    }

    existing.total_units = (existing.total_units || 0) + 1;
    existing.vacant_units = (existing.vacant_units || 0) + 1;
    existing.available_units = (existing.available_units || 0) + 1;
    if (existing.price_min == null || (unitPrice != null && unitPrice < existing.price_min)) {
      existing.price_min = unitPrice == null ? existing.price_min : Math.max(0, unitPrice);
    }
    if (existing.price_max == null || (unitPrice != null && unitPrice > existing.price_max)) {
      existing.price_max = unitPrice == null ? existing.price_max : Math.max(0, unitPrice);
    }
    existing.photo_urls = dedupeMediaPaths(
      existing.photo_urls,
      propertyPhotoUrls,
      unit.roomphoto_urls
    );
    existing.photo_url = existing.photo_urls[0] || null;
    existing.video_urls = dedupeMediaPaths(existing.video_urls, propertyVideoUrls);
    existing.video_url = existing.video_url || property.video_url || existing.video_urls[0] || null;
    existing.video_360_url = existing.video_360_url || property.video_360_url || null;
    existing.photo_360_url = existing.photo_360_url || property.photo_360_url || null;
    existing.updated_at = unit.updated_at || existing.updated_at || null;
  });

  let properties = Array.from(propertyMap.values());
  const sort = params?.sort?.toString();

  if (sort === "price_asc" || sort === "price_low") {
    properties = [...properties].sort(
      (first, second) =>
        (first.price_min || Number.MAX_SAFE_INTEGER) -
        (second.price_min || Number.MAX_SAFE_INTEGER)
    );
  } else if (sort === "price_desc" || sort === "price_high") {
    properties = [...properties].sort(
      (first, second) => (second.price_max || 0) - (first.price_max || 0)
    );
  } else if (sort === "oldest") {
    properties = [...properties].sort((first, second) => {
      const firstDate = new Date(first.created_at || 0).getTime();
      const secondDate = new Date(second.created_at || 0).getTime();
      return firstDate - secondDate;
    });
  } else {
    properties = [...properties].sort((first, second) => {
      const firstDate = new Date(first.created_at || 0).getTime();
      const secondDate = new Date(second.created_at || 0).getTime();
      return secondDate - firstDate;
    });
  }

  const page = getNumberParam(params?.page, 1);
  const perPage = getNumberParam(params?.per_page, 20);
  const paginated = paginateArray(properties, page, perPage);

  return {
    data: paginated.data,
    meta: paginated.meta,
    message: catalogResponse.message,
  };
};

const toPublicUnitSummary = (unit: ManualRentalCatalogUnit): PublicPropertyUnitSummary => {
  const photoUrls = dedupeMediaPaths(unit.photo_urls, unit.roomphoto_urls);
  const videoUrls = dedupeMediaPaths(
    unit.video_urls,
    unit.video_url,
    unit.video_360_url
  );

  return {
    id: unit.id,
    name: unit.name || `Unit ${unit.id}`,
    unit_number: unit.unit_number ?? unit.room_number ?? unit.number ?? null,
    room_number: unit.room_number ?? null,
    number: unit.number ?? null,
    building_id: unit.building_id ?? unit.block_id ?? null,
    building_name: unit.building_name || unit.block_name || null,
    block_id: unit.block_id ?? unit.building_id ?? null,
    block_name: unit.block_name || unit.building_name || null,
    unit_type: unit.unit_type || null,
    status: unit.status || "vacant",
    people_allowed: unit.people_allowed || null,
    price: unit.monthly_rent_amount || null,
    photo_url: photoUrls[0] || null,
    photo_urls: photoUrls,
    roomphoto_urls: photoUrls,
    video_urls: videoUrls,
    video_url: unit.video_url || videoUrls[0] || null,
    video_360_url: unit.video_360_url || null,
    created_at: unit.created_at || null,
    updated_at: unit.updated_at || null,
  };
};

const fetchAdminPropertiesForPublic = async (
  params?: QueryParams
): Promise<ListResult<PublicPropertySummary>> => {
  const response = await getPublicApi<PublicPropertyApiItem[]>(
    "/api/v1/properties",
    buildAdminPropertyQuery(params)
  );

  return {
    data: response.data.data.map(normalizePublicProperty),
    meta: response.data.meta,
    message: response.data.message,
  };
};

const mergePublicProperties = (
  source: PublicPropertySummary[],
  fallback: PublicPropertySummary[]
) => {
  const fallbackMap = new Map<number, PublicPropertySummary>();
  fallback.forEach((item) => {
    fallbackMap.set(item.id, item);
  });

  return source.map((item) => {
    const fallbackItem = fallbackMap.get(item.id);
    if (!fallbackItem) {
      return item;
    }

    return {
      ...item,
      total_units: item.total_units ?? fallbackItem.total_units,
      occupied_units: item.occupied_units ?? fallbackItem.occupied_units,
      vacant_units: item.vacant_units ?? fallbackItem.vacant_units,
      maintenance_units:
        item.maintenance_units ?? fallbackItem.maintenance_units,
      blocked_units: item.blocked_units ?? fallbackItem.blocked_units,
      available_units: item.available_units ?? fallbackItem.available_units,
      total_tenants: item.total_tenants ?? fallbackItem.total_tenants,
      availability_status:
        item.availability_status ?? fallbackItem.availability_status ?? null,
      price_min: item.price_min ?? fallbackItem.price_min,
      price_max: item.price_max ?? fallbackItem.price_max,
      photo_url: item.photo_url || fallbackItem.photo_url || null,
      photo_urls:
        item.photo_urls && item.photo_urls.length > 0
          ? item.photo_urls
          : fallbackItem.photo_urls || [],
      video_urls:
        item.video_urls && item.video_urls.length > 0
          ? item.video_urls
          : fallbackItem.video_urls || [],
      video_url: item.video_url || fallbackItem.video_url || null,
      video_360_url: item.video_360_url || fallbackItem.video_360_url || null,
      photo_360_url: item.photo_360_url || fallbackItem.photo_360_url || null,
    };
  });
};

const getPublicPropertiesFromCatalog = async (
  params?: QueryParams
): Promise<ListResult<PublicPropertySummary>> => {
  try {
    const catalogResponse = await fetchAllCatalogProperties(params);
    if (catalogResponse.data.length > 0) {
      return catalogResponse;
    }

    return await aggregatePublicPropertiesFromCatalogUnits(params);
  } catch (error) {
    if (!isStatusError(error, [401, 403, 404, 405])) {
      throw error;
    }

    return await aggregatePublicPropertiesFromCatalogUnits(params);
  }
};

const getPublicPropertyUnitsFromCatalog = async (
  propertyNumericId: number,
  params?: QueryParams
): Promise<ListResult<PublicPropertyUnitSummary>> => {
  const catalogResponse = await fetchAllCatalogUnits(params);
  let units = catalogResponse.data
    .filter((unit) => unit.property?.id === propertyNumericId)
    .map(toPublicUnitSummary);
  const sort = params?.sort?.toString();

  if (sort === "price_desc") {
    units = [...units].sort((first, second) => (second.price || 0) - (first.price || 0));
  } else if (sort === "price_asc") {
    units = [...units].sort((first, second) => (first.price || 0) - (second.price || 0));
  }

  const page = getNumberParam(params?.page, 1);
  const perPage = getNumberParam(params?.per_page, 20);
  const paginated = paginateArray(units, page, perPage);

  return {
    data: paginated.data,
    meta: paginated.meta,
    message: catalogResponse.message,
  };
};

export const getPublicPropertyAvailabilityStatus = (
  property: Pick<
    PublicPropertySummary,
    | "availability_status"
    | "available_units"
    | "vacant_units"
    | "maintenance_units"
    | "occupied_units"
    | "total_units"
  >
) => {
  return normalizeAvailabilityStatus(property.availability_status, {
    availableUnits: property.available_units,
    vacantUnits: property.vacant_units,
    maintenanceUnits: property.maintenance_units,
    occupiedUnits: property.occupied_units,
    totalUnits: property.total_units,
  });
};

export const getPublicPropertyAvailabilityLabel = (
  property: Pick<
    PublicPropertySummary,
    | "availability_status"
    | "available_units"
    | "vacant_units"
    | "maintenance_units"
    | "occupied_units"
    | "total_units"
  >
) => {
  const status = getPublicPropertyAvailabilityStatus(property);

  if (status === "available") {
    return "Tersedia";
  }

  if (status === "maintenance_only") {
    return "Maintenance";
  }

  return "Penuh";
};

const mapManualBookingStatusToTenantPayment = (
  status?: string | null
): TenantPayment["status"] => {
  if (status === "approved") {
    return "paid";
  }

  if (status === "cancelled" || status === "denied" || status === "expired") {
    return "cancelled";
  }

  return "waiting";
};

const mapManualBookingToTenantPayment = (
  booking: ManualRentalBooking
): TenantPayment => {
  return {
    id: booking.id,
    invoice_id: booking.booking_code || `BOOKING-${booking.id}`,
    xendit_invoice_id: null,
    property: {
      id: booking.property?.id || 0,
      name: booking.property?.name || null,
    },
    unit: {
      id: booking.unit?.id || 0,
      name: booking.unit?.name || null,
      unit_number: booking.unit?.unit_number ?? booking.unit?.room_number ?? booking.unit?.number ?? null,
      room_number: booking.unit?.room_number ?? null,
      number: booking.unit?.number ?? null,
      building_name: booking.unit?.building_name || booking.unit?.block_name || null,
      block_name: booking.unit?.block_name || booking.unit?.building_name || null,
    },
    tenant: {
      id: booking.tenant?.id || 0,
      full_name: booking.tenant?.full_name || null,
    },
    lease_id: booking.lease?.id || null,
    status: mapManualBookingStatusToTenantPayment(booking.status),
    amount: booking.total_amount || booking.monthly_rent_amount || 0,
    due_date: booking.expires_at || null,
    paid_at: booking.payment_submitted_at || booking.reviewed_at || null,
    payment_method: booking.payment_channel || null,
    description: booking.status_label || null,
    transfer_proof_url: toAbsoluteAssetUrl(booking.transfer_proof_url),
    booking_status: booking.status || null,
    booking_status_label: booking.status_label || null,
    created_at: booking.created_at || null,
    updated_at: booking.updated_at || null,
  };
};

const TENANT_FAVORITES_STORAGE_KEY = "kyra.tenant.favorite.property.ids";
export const PUBLIC_PROPERTY_LOGIN_REQUIRED_MESSAGE =
  "Katalog properti tersedia setelah login.";
export const PUBLIC_PROPERTY_UNITS_LOGIN_REQUIRED_MESSAGE =
  "Unit properti tersedia setelah login.";
export const TENANT_NOTIFICATIONS_UNAVAILABLE_MESSAGE =
  "Notifikasi tenant belum tersedia pada backend terbaru.";
export const BASIC_PROFILE_REQUIRED_ERROR_CODE = "BASIC_PROFILE_REQUIRED";

export class BasicProfileRequiredError extends Error {
  code = BASIC_PROFILE_REQUIRED_ERROR_CODE;
  missingFields: string[];

  constructor(missingFields: string[]) {
    super(
      `Lengkapi data dasar profil sebelum booking: ${missingFields.join(", ")}.`
    );
    this.name = "BasicProfileRequiredError";
    this.missingFields = missingFields;
  }
}

export const getBasicProfileRequiredFields = (error: unknown) => {
  if (error instanceof BasicProfileRequiredError) {
    return error.missingFields;
  }

  if (axios.isAxiosError(error)) {
    const payload = error.response?.data as ApiErrorPayload | undefined;
    if (payload?.data?.code === BASIC_PROFILE_REQUIRED_ERROR_CODE) {
      return payload.data.missing_fields || payload.errors || [];
    }

    if (payload?.message === "Basic profile required") {
      return payload.errors || [];
    }
  }

  return null;
};

export const isBasicProfileRequiredError = (error: unknown) =>
  getBasicProfileRequiredFields(error) !== null;

const VISIT_REQUEST_SUBJECT_PREFIX = "Permintaan jadwal kunjungan";
const VISIT_REQUEST_CANCELLED_VALUE = "dibatalkan";
const INDONESIAN_MONTH_MAP: Record<string, string> = {
  jan: "01",
  januari: "01",
  feb: "02",
  februari: "02",
  mar: "03",
  maret: "03",
  apr: "04",
  april: "04",
  mei: "05",
  jun: "06",
  juni: "06",
  jul: "07",
  juli: "07",
  agu: "08",
  agt: "08",
  agustus: "08",
  aug: "08",
  sep: "09",
  september: "09",
  okt: "10",
  oktober: "10",
  oct: "10",
  nov: "11",
  november: "11",
  des: "12",
  desember: "12",
  dec: "12",
};

const getVisitMessageValue = (message: string, label: string) => {
  const prefix = `${label.toLowerCase()}:`;
  const line = message
    .split("\n")
    .map((item) => item.trim())
    .find((item) => item.toLowerCase().startsWith(prefix));

  if (!line) {
    return "-";
  }

  return line.slice(prefix.length).trim() || "-";
};

const normalizeVisitDateValue = (value?: string | null) => {
  const normalized = value?.trim();
  if (!normalized || normalized === "-") {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return normalized;
  }

  const slashMatch = normalized.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (slashMatch) {
    const [, day, month, year] = slashMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const monthMatch = normalized.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (monthMatch) {
    const [, day, rawMonth, year] = monthMatch;
    const month = INDONESIAN_MONTH_MAP[rawMonth.toLowerCase()];
    if (month) {
      return `${year}-${month}-${day.padStart(2, "0")}`;
    }
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
};

const normalizeVisitTimeValue = (value?: string | null) => {
  const normalized = value?.trim();
  if (!normalized || normalized === "-") {
    return null;
  }

  const match = normalized.match(/(\d{1,2}):(\d{2})/);
  if (!match) {
    return normalized;
  }

  const [, hour, minute] = match;
  return `${hour.padStart(2, "0")}:${minute}`;
};

const isVisitDatePast = (value?: string | null) => {
  const normalized = normalizeVisitDateValue(value);
  if (!normalized) {
    return false;
  }

  const visitDate = new Date(`${normalized}T00:00:00`);
  if (Number.isNaN(visitDate.getTime())) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return visitDate.getTime() < today.getTime();
};

const buildTenantVisitRequestSubject = (propertyName: string) =>
  `${VISIT_REQUEST_SUBJECT_PREFIX} - ${propertyName}`;

const buildTenantVisitRequestMessage = ({
  tenantName,
  tenantEmail,
  tenantPhone,
  propertyName,
  propertyAddress,
  preferredDate,
  preferredTime,
  note,
}: {
  tenantName: string;
  tenantEmail: string;
  tenantPhone: string;
  propertyName: string;
  propertyAddress?: string | null;
  preferredDate: string;
  preferredTime: string;
  note?: string | null;
}) => {
  return [
    `Nama penyewa: ${tenantName}`,
    `Email penyewa: ${tenantEmail}`,
    `Nomor HP penyewa: ${tenantPhone}`,
    `Properti: ${propertyName}`,
    `Alamat properti: ${propertyAddress || "-"}`,
    `Tanggal preferensi: ${preferredDate}`,
    `Jam preferensi: ${preferredTime}`,
    `Catatan: ${note?.trim() || "-"}`,
  ].join("\n");
};

const mapCommunicationToTenantVisitRequest = (
  communication: TenantCommunication
): TenantVisitRequest => {
  const message = communication.message || "";
  const propertyId = Number(communication.property.id || 0);
  const propertyNameValue = getVisitMessageValue(message, "Properti");
  const propertyAddressValue = getVisitMessageValue(message, "Alamat properti");
  const propertyAddress =
    propertyAddressValue && propertyAddressValue !== "-" ? propertyAddressValue : null;
  const requestedDate = normalizeVisitDateValue(
    getVisitMessageValue(message, "Tanggal preferensi")
  );
  const requestedTime = normalizeVisitTimeValue(
    getVisitMessageValue(message, "Jam preferensi")
  );
  const approvedDate = normalizeVisitDateValue(
    getVisitMessageValue(message, "Tanggal kunjungan disetujui")
  );
  const approvedTime = normalizeVisitTimeValue(
    getVisitMessageValue(message, "Jam kunjungan disetujui")
  );
  const noteValue = getVisitMessageValue(message, "Catatan");
  const statusValue = getVisitMessageValue(message, "Status pengajuan").toLowerCase();

  let status: TenantVisitRequestStatus = "pending";
  if (statusValue === VISIT_REQUEST_CANCELLED_VALUE) {
    status = "cancelled";
  } else if (approvedDate || approvedTime) {
    status = isVisitDatePast(approvedDate || requestedDate) ? "completed" : "confirmed";
  }

  return {
    id: communication.id,
    property: {
      id: propertyId,
      name:
        propertyNameValue && propertyNameValue !== "-"
          ? propertyNameValue
          : communication.property.name || `Kost #${propertyId}`,
      address:
        propertyAddress && propertyAddress !== "-" ? propertyAddress : null,
    },
    preferred_date: approvedDate || requestedDate,
    preferred_time: approvedTime || requestedTime,
    note: noteValue && noteValue !== "-" ? noteValue : null,
    status,
    created_at: communication.created_at || communication.scheduled_at || null,
    updated_at: communication.updated_at || null,
  };
};

const getFavoritePropertyIds = () => {
  if (typeof window === "undefined") {
    return new Set<number>();
  }

  try {
    const raw = window.localStorage.getItem(TENANT_FAVORITES_STORAGE_KEY);
    if (!raw) {
      return new Set<number>();
    }

    const parsed = JSON.parse(raw) as number[];
    if (!Array.isArray(parsed)) {
      return new Set<number>();
    }

    return new Set(parsed.filter((value) => Number.isFinite(value)));
  } catch {
    return new Set<number>();
  }
};

const saveFavoritePropertyIds = (ids: Set<number>) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      TENANT_FAVORITES_STORAGE_KEY,
      JSON.stringify(Array.from(ids))
    );
  } catch {
    // ignore storage errors
  }
};

export const getApiErrorMessage = (
  error: unknown,
  fallback = "Terjadi kesalahan. Silakan coba lagi."
) => {
  const normalizeApiMessage = (message?: string) => {
    if (!message) {
      return message;
    }

    const normalized = message.toLowerCase();

    if (
      normalized.includes("authentication token has expired") ||
      normalized.includes("invalid authentication token") ||
      normalized.includes("authentication required") ||
      normalized.includes("token autentikasi telah kedaluwarsa") ||
      normalized.includes("token autentikasi tidak valid") ||
      normalized.includes("autentikasi diperlukan") ||
      normalized.includes("akses tidak terautentikasi")
    ) {
      return "Sesi login berakhir. Silakan masuk kembali.";
    }

    if (
      normalized.includes("cannot delete record because of dependent payments")
    ) {
      return "Data tidak bisa dihapus karena masih memiliki pembayaran terkait.";
    }

    if (
      normalized.includes("cannot delete record because of dependent rental_bookings") ||
      normalized.includes("cannot delete record because of dependent rental bookings")
    ) {
      return "Data tidak bisa dihapus karena masih memiliki pemesanan sewa terkait.";
    }

    if (
      normalized.includes("cannot delete record because dependent") &&
      normalized.includes("exist")
    ) {
      return "Data tidak bisa dihapus karena masih memiliki data terkait.";
    }

    return message;
  };

  if (axios.isAxiosError(error)) {
    const payload = error.response?.data as ApiErrorPayload | undefined;
    const firstError = normalizeApiMessage(payload?.errors?.[0]);
    const message = normalizeApiMessage(payload?.message);
    const axiosMessage = normalizeApiMessage(error.message);
    return firstError || message || axiosMessage || fallback;
  }

  if (error instanceof Error) {
    return normalizeApiMessage(error.message) || fallback;
  }

  return fallback;
};

export const isPublicPropertyLoginRequiredMessage = (message?: string | null) =>
  (message || "").trim() === PUBLIC_PROPERTY_LOGIN_REQUIRED_MESSAGE;

export const isPublicPropertyUnitsLoginRequiredMessage = (
  message?: string | null
) => (message || "").trim() === PUBLIC_PROPERTY_UNITS_LOGIN_REQUIRED_MESSAGE;

export const isTenantNotificationsUnavailableMessage = (
  message?: string | null
) => (message || "").trim() === TENANT_NOTIFICATIONS_UNAVAILABLE_MESSAGE;

export const getTenantProfile = () =>
  getItem<BackendUser>("/api/v1/auth/me");

export const updateTenantProfile = async (payload: {
  user_id: number;
  full_name?: string;
  email?: string;
  phone_number?: string;
  emergency_contact_name?: string;
  emergency_contact_number?: string;
  relationship?: string;
  nik?: string;
  date_of_birth?: string;
  domicile_address?: string;
  occupation?: string;
  institution_name?: string;
  profile_picture?: File | null;
  identity_document?: File | null;
  selfie_photo?: File | null;
}) => {
  const formData = new FormData();

  if (payload.full_name !== undefined) {
    formData.append("user[full_name]", payload.full_name);
  }

  if (payload.email !== undefined) {
    formData.append("user[email]", payload.email);
  }

  if (payload.phone_number !== undefined) {
    formData.append("user[phone_number]", payload.phone_number);
  }

  if (payload.emergency_contact_name !== undefined) {
    formData.append(
      "user[emergency_contact_name]",
      payload.emergency_contact_name
    );
  }

  if (payload.emergency_contact_number !== undefined) {
    formData.append(
      "user[emergency_contact_number]",
      payload.emergency_contact_number
    );
  }

  if (payload.relationship !== undefined) {
    formData.append("user[relationship]", payload.relationship);
  }

  if (payload.nik !== undefined) {
    formData.append("user[nik]", payload.nik);
  }

  if (payload.date_of_birth !== undefined) {
    formData.append("user[date_of_birth]", payload.date_of_birth);
  }

  if (payload.domicile_address !== undefined) {
    formData.append("user[domicile_address]", payload.domicile_address);
  }

  if (payload.occupation !== undefined) {
    formData.append("user[occupation]", payload.occupation);
  }

  if (payload.institution_name !== undefined) {
    formData.append("user[institution_name]", payload.institution_name);
  }

  if (payload.profile_picture) {
    formData.append("user[profile_picture]", payload.profile_picture);
  }

  if (payload.identity_document) {
    formData.append("user[identity_document]", payload.identity_document);
  }

  if (payload.selfie_photo) {
    formData.append("user[selfie_photo]", payload.selfie_photo);
  }

  const response = await axiosInstance.patch<ApiResponse<BackendUser>>(
    `/api/v1/users/${payload.user_id}`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return {
    data: response.data.data,
    message: response.data.message,
  };
};

export const getIncompleteTenantProfileFields = (profile: BackendUser) => {
  const required: Array<{ value: unknown; label: string }> = [
    { value: profile.full_name, label: "Nama Lengkap" },
    { value: profile.email, label: "Email" },
    { value: profile.phone_number, label: "Nomor Telepon" },
    { value: profile.nik, label: "NIK / Nomor Identitas" },
    { value: profile.date_of_birth, label: "Tanggal Lahir" },
    { value: profile.domicile_address, label: "Alamat Domisili" },
  ];

  return required
    .filter((item) => item.value?.toString().trim() === "" || item.value == null)
    .map((item) => item.label);
};

export const getTenantPayments = async (
  params?: QueryParams
): Promise<ListResult<TenantPayment>> => {
  const response = await getList<ManualRentalBooking>(
    "/api/v1/manual_rentals/bookings",
    {
      page: 1,
      per_page: 100,
    }
  );

  let mapped = response.data.map(mapManualBookingToTenantPayment);
  const statusFilter = params?.status?.toString();
  if (statusFilter) {
    mapped = mapped.filter((item) => item.status === statusFilter);
  }

  const sort = params?.sort?.toString();
  if (sort === "due_date") {
    mapped = [...mapped].sort((first, second) => {
      const firstDate = new Date(first.due_date || first.created_at || 0).getTime();
      const secondDate = new Date(
        second.due_date || second.created_at || 0
      ).getTime();
      return firstDate - secondDate;
    });
  } else {
    mapped = [...mapped].sort((first, second) => {
      const firstDate = new Date(first.created_at || 0).getTime();
      const secondDate = new Date(second.created_at || 0).getTime();
      return secondDate - firstDate;
    });
  }

  const page = getNumberParam(params?.page, 1);
  const perPage = getNumberParam(params?.per_page, 20);
  const paginated = paginateArray(mapped, page, perPage);

  return {
    data: paginated.data,
    meta: paginated.meta,
    message: response.message,
  };
};

export const getTenantCurrentStay = () =>
  getItem<TenantCurrentStay>("/api/v1/manual_rentals/stays/current");

export const getTenantStays = async (
  params?: QueryParams
): Promise<ListResult<TenantStaySummary>> => {
  const response = await getList<TenantStaySummary>(
    "/api/v1/manual_rentals/stays",
    params
  );

  return {
    ...response,
    data: response.data.map((item) => ({
      ...item,
      roomphoto_urls: (item.roomphoto_urls || []).map((path) => {
        return toAbsoluteAssetUrl(path) || path;
      }),
      transfer_proof_url: toAbsoluteAssetUrl(item.transfer_proof_url),
    })),
  };
};

export const getTenantStayDetail = (bookingId: number | string) =>
  getItem<TenantCurrentStay>(`/api/v1/manual_rentals/stays/${bookingId}`);

export const getTenantMaintenanceRequests = async (
  params?: QueryParams
): Promise<ListResult<TenantMaintenanceRequest>> => {
  try {
    return await getList<TenantMaintenanceRequest>(
      "/api/v1/maintenance_requests",
      params
    );
  } catch (error) {
    if (isStatusError(error, [403, 404])) {
      const page = getNumberParam(params?.page, 1);
      const perPage = getNumberParam(params?.per_page, 20);
      const paginated = paginateArray<TenantMaintenanceRequest>([], page, perPage);
      return {
        data: paginated.data,
        meta: paginated.meta,
        message: "Data perawatan tenant belum tersedia pada backend terbaru.",
      };
    }

    throw error;
  }
};

export const createTenantMaintenanceRequest = async (
  payload: TenantMaintenanceCreatePayload
) => {
  const response = await axiosInstance.post<ApiResponse<TenantMaintenanceRequest>>(
    "/api/v1/maintenance_requests",
    {
      maintenance_request: payload,
    }
  );

  return {
    data: response.data.data,
    message: response.data.message,
  };
};

export const getTenantNotifications = async (
  params?: QueryParams
): Promise<ListResult<TenantCommunication>> => {
  try {
    return await getList<TenantCommunication>("/api/v1/communications", params);
  } catch (error) {
    if (isStatusError(error, [403, 404])) {
      const page = getNumberParam(params?.page, 1);
      const perPage = getNumberParam(params?.per_page, 20);
      const paginated = paginateArray<TenantCommunication>([], page, perPage);
      return {
        data: paginated.data,
        meta: paginated.meta,
        message: TENANT_NOTIFICATIONS_UNAVAILABLE_MESSAGE,
      };
    }

    throw error;
  }
};

export const getTenantFavoriteProperties = async (
  params?: QueryParams
): Promise<ListResult<TenantFavoriteProperty>> => {
  const propertiesResponse = await getPublicProperties(params);
  const favoriteIds = getFavoritePropertyIds();

  const data = propertiesResponse.data.map((property) => {
    const isFavorite = favoriteIds.has(property.id);

    return {
      favorite_id: isFavorite ? property.id : null,
      is_favorite: isFavorite,
      property,
    };
  });

  return {
    data,
    meta: propertiesResponse.meta,
    message: "Daftar favorit properti dimuat.",
  };
};

export const getPublicProperties = async (
  params?: QueryParams
): Promise<ListResult<PublicPropertySummary>> => {
  const page = getNumberParam(params?.page, 1);
  const perPage = getNumberParam(params?.per_page, 20);
  const emptyResult = (message: string): ListResult<PublicPropertySummary> => {
    const paginated = paginateArray<PublicPropertySummary>([], page, perPage);
    return {
      data: paginated.data,
      meta: paginated.meta,
      message,
    };
  };

  const clientRole = getClientRoleFromAccessToken();
  const isAdminSession = clientRole === "admin";

  if (isAdminSession) {
    try {
      const adminResponse = await fetchAdminPropertiesForPublic(params);

      try {
        const catalogResponse = await getPublicPropertiesFromCatalog(params);
        return {
          data: mergePublicProperties(adminResponse.data, catalogResponse.data),
          meta: adminResponse.meta,
          message: adminResponse.message,
        };
      } catch {
        return adminResponse;
      }
    } catch (adminError) {
      if (!isStatusError(adminError, [401, 403, 404, 405])) {
        throw adminError;
      }
    }
  }

  try {
    return await getPublicPropertiesFromCatalog(params);
  } catch (error) {
    if (isStatusError(error, [401, 403, 404, 405])) {
      return emptyResult(PUBLIC_PROPERTY_LOGIN_REQUIRED_MESSAGE);
    }

    throw error;
  }
};

export const getPublicPropertyUnits = (
  propertyId: number | string,
  params?: QueryParams
): Promise<ListResult<PublicPropertyUnitSummary>> => {
  const propertyNumericId = Number(propertyId);
  const page = getNumberParam(params?.page, 1);
  const perPage = getNumberParam(params?.per_page, 20);

  if (!Number.isFinite(propertyNumericId)) {
    const paginated = paginateArray<PublicPropertyUnitSummary>([], page, perPage);
    return Promise.resolve({
      data: paginated.data,
      meta: paginated.meta,
      message: "Unit properti tidak tersedia.",
    });
  }

  return getPublicPropertyUnitsFromCatalog(propertyNumericId, params).catch(
    (error: unknown) => {
      if (isStatusError(error, [401, 403, 404, 405])) {
        const paginated = paginateArray<PublicPropertyUnitSummary>([], page, perPage);
        return {
          data: paginated.data,
          meta: paginated.meta,
          message: PUBLIC_PROPERTY_UNITS_LOGIN_REQUIRED_MESSAGE,
        };
      }

      throw error;
    }
  );
};

export const getTenantVisitRequests = async (
  params?: QueryParams
): Promise<ListResult<TenantVisitRequest>> => {
  const response = await getList<TenantCommunication>(
    "/api/v1/communications/visit_requests",
    params
  );

  return {
    data: response.data.map(mapCommunicationToTenantVisitRequest),
    meta: response.meta,
    message: response.message,
  };
};

export const addTenantFavorite = async (propertyId: number) => {
  const ids = getFavoritePropertyIds();
  ids.add(propertyId);
  saveFavoritePropertyIds(ids);

  return {
    data: {
      id: propertyId,
      property_id: propertyId,
      favorited_at: new Date().toISOString(),
      property: {
        id: propertyId,
        name: "",
      },
    } satisfies TenantFavoriteItem,
    message: "Properti berhasil ditambahkan ke favorit.",
  };
};

export const removeTenantFavoriteByProperty = async (propertyId: number) => {
  const ids = getFavoritePropertyIds();
  ids.delete(propertyId);
  saveFavoritePropertyIds(ids);

  return {
    message: "Properti berhasil dihapus dari favorit.",
  };
};

export const createTenantVisitRequest = async (
  payload: TenantVisitRequestPayload
) => {
  const propertyId = Number(payload.property_id);
  const preferredDate = payload.preferred_date?.trim();
  const preferredTime = payload.preferred_time?.trim();

  if (!Number.isFinite(propertyId) || propertyId <= 0) {
    throw new Error("Kost wajib dipilih.");
  }

  if (!preferredDate || !preferredTime) {
    throw new Error("Tanggal dan jam survei wajib diisi.");
  }

  const profileResponse = await getTenantProfile();
  const profile = profileResponse.data;
  const tenantName = profile.full_name?.trim() || "Penyewa KIKOST";
  const tenantEmail = profile.email?.trim();
  const tenantPhone = profile.phone_number?.toString().trim();

  if (!tenantEmail || !tenantPhone) {
    throw new Error(
      "Lengkapi email dan nomor HP pada profil sebelum mengajukan jadwal kunjungan."
    );
  }

  let propertyName = `Kost #${propertyId}`;
  let propertyAddress: string | null = null;

  try {
    const propertiesResponse = await getPublicProperties({
      page: 1,
      per_page: 100,
    });
    const matchedProperty = propertiesResponse.data.find(
      (item) => item.id === propertyId
    );

    if (matchedProperty) {
      propertyName = matchedProperty.name || propertyName;
      propertyAddress = matchedProperty.address || null;
    }
  } catch {
    // Data kost tetap disimpan memakai ID jika katalog sedang tidak dapat diakses.
  }

  const response = await axiosInstance.post<ApiResponse<TenantCommunication>>(
    "/api/v1/communications/visit_requests",
    {
      communication: {
        property_id: propertyId,
        subject: buildTenantVisitRequestSubject(propertyName),
        message: buildTenantVisitRequestMessage({
          tenantName,
          tenantEmail,
          tenantPhone,
          propertyName,
          propertyAddress,
          preferredDate,
          preferredTime,
          note: payload.note,
        }),
      },
    }
  );

  return {
    data: mapCommunicationToTenantVisitRequest(response.data.data),
    message: response.data.message,
  };
};

export const cancelTenantVisitRequest = async (requestId: number | string) => {
  const numericId = Number(requestId);

  if (!Number.isFinite(numericId)) {
    throw new Error("Jadwal survei tidak valid.");
  }

  const response = await axiosInstance.post<ApiResponse<TenantCommunication>>(
    `/api/v1/communications/${numericId}/cancel_visit_request`
  );

  return {
    data: mapCommunicationToTenantVisitRequest(response.data.data),
    message: response.data.message,
  };
};

export const createTenantBookingPayment = async (
  payload: TenantBookingPaymentPayload
) => {
  if (!payload.terms_accepted) {
    throw new Error("Setujui syarat dan ketentuan sebelum melanjutkan.");
  }

  const profileResponse = await getTenantProfile();
  const profile = profileResponse.data;
  const missingProfileFields = getIncompleteTenantProfileFields(profile);

  if (missingProfileFields.length > 0) {
    throw new BasicProfileRequiredError(missingProfileFields);
  }

  const tenantName = profile.full_name?.trim() || "Tenant Kyra Stay";
  const tenantEmail = profile.email?.trim();
  const tenantPhone = profile.phone_number?.toString().trim();

  if (!tenantEmail || !tenantPhone) {
    throw new Error(
      "Lengkapi email dan nomor HP pada profil sebelum upload bukti pembayaran."
    );
  }

  const formData = new FormData();
  formData.append("booking[unit_id]", String(payload.unit_id));
  formData.append(
    "booking[payment_scheme]",
    payload.duration_type === "daily" ? "full_payment" : "monthly"
  );
  formData.append("booking[duration_type]", payload.duration_type || "monthly");
  formData.append("booking[duration_months]", String(payload.duration_months));
  formData.append("booking[start_date]", payload.check_in_date);
  formData.append("booking[tenant_full_name]", tenantName);
  formData.append("booking[tenant_email]", tenantEmail);
  formData.append("booking[tenant_phone_number]", tenantPhone);
  formData.append("booking[agree_to_terms]", String(payload.terms_accepted));
  formData.append("payment[payment_channel]", payload.payment_method);
  formData.append("payment[transfer_sender_name]", tenantName);
  formData.append(
    "payment[transfer_bank_name]",
    payload.note?.trim() || "Transfer Bank"
  );
  formData.append("payment[transfer_proof]", payload.transfer_proof);

  const response = await axiosInstance.post<ApiResponse<ManualRentalBooking>>(
    "/api/v1/manual_rentals/bookings",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return {
    data: mapManualBookingToTenantPayment(response.data.data),
    message: response.data.message,
  };
};
