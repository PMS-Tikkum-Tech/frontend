import axios from "axios";
import axiosInstance from "@/lib/axios";
import { resolveApiBaseUrl } from "@/lib/api-base-url";
import { optimizeImageFilesForUpload } from "@/lib/image-optimizer";
import type { ApiPaginationMeta, ApiResponse } from "@/types/api";
import type { Property, PropertyStatus } from "@/types/dashboard";

type QueryParams = Record<string, string | number | boolean | null | undefined>;

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
};

export interface AdminPropertyListItem {
  id: number;
  name: string;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  facilities: string[];
  property_type: string;
  condition: string;
  rules: string;
  total_units: number;
  block_count?: number | null;
  occupied_units: number;
  booking_units?: number | null;
  vacant_units: number;
  maintenance_units: number;
  roomphoto_urls: string[];
  photo_urls: string[];
  video_urls?: string[];
  video_url?: string | null;
  video_360_url?: string | null;
  photo_360_url?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface AdminPropertyDetailPayload {
  property: {
    id: number;
    name: string;
    property_type: string;
    address: string;
    latitude?: number | null;
    longitude?: number | null;
    description: string;
    condition: string;
    facilities: string[];
    rules: string;
    roomphoto_urls: string[];
    photo_urls: string[];
    video_urls?: string[];
    video_url?: string | null;
    video_360_url?: string | null;
    photo_360_url?: string | null;
    user?: {
      id: number;
      full_name: string;
      email: string;
      role: string;
    } | null;
    created_at?: string | null;
    updated_at?: string | null;
  };
  stats: {
    description: string;
    address: string;
    latitude?: number | null;
    longitude?: number | null;
    total_units: number;
    block_count?: number | null;
    occupied_units: number;
    booking_units?: number | null;
    vacant_units: number;
    maintenance_units: number;
    total_tenants: number;
    price_range:
      | {
          min: number;
          max: number;
        }
      | null;
  };
}

export interface AdminPropertyUpsertPayload {
  owner_id?: number;
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
  property_type: string;
  condition: string;
  description?: string;
  rules?: string;
  facilities?: string[];
  photos?: File[];
  video?: File | null;
  videos?: File[];
  video_360?: File | null;
  photo_360?: File | null;
}

export interface AdminPropertyUpdatePayload {
  owner_id?: number;
  name?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  property_type?: string;
  condition?: string;
  description?: string;
  rules?: string;
  facilities?: string[];
  photos?: File[];
  video?: File | null;
  videos?: File[];
  video_360?: File | null;
  photo_360?: File | null;
}

export interface AdminPropertyMediaOrderPayload {
  photo_urls?: string[];
  roomphoto_urls?: string[];
  delete_video?: boolean;
  delete_video_360?: boolean;
}

export interface AdminPropertyTenantRow {
  lease_id: number;
  tenant_id: number;
  tenant_name: string;
  tenant_email?: string | null;
  unit_id: number;
  unit_name: string;
  building_id?: number | null;
  building_name?: string | null;
  block_id?: number | null;
  block_name?: string | null;
  owner_id?: number | null;
  owner_name?: string | null;
  block_owner_id?: number | null;
  block_owner_name?: string | null;
  mobile_phone?: string | null;
  tenant_phone?: string | null;
  lease_start?: string | null;
  lease_end?: string | null;
  check_in_date?: string | null;
  check_out_date?: string | null;
  notes?: string | null;
  description?: string | null;
  payment_status?: string | null;
}

export interface AdminPropertyTenantCreatePayload {
  tenant_id: number;
  unit_id: number;
  start_date: string;
  end_date: string;
  payment_status: "paid" | "unpaid";
}

export interface AdminPropertyTenantUpdatePayload {
  unit_id?: number;
  start_date?: string;
  end_date?: string;
  payment_status?: "paid" | "unpaid";
}

export interface AdminPropertyUnitRow {
  unit_id: number;
  unit_name: string;
  unit_type: string;
  people_allowed: number;
  tenant_name?: string | null;
  tenant_email?: string | null;
  tenant_phone?: string | null;
  mobile_phone?: string | null;
  price: number;
  lease_end?: string | null;
  lease_start?: string | null;
  check_in_date?: string | null;
  check_out_date?: string | null;
  building_id?: number | null;
  building_name?: string | null;
  building_owner_id?: number | null;
  building_owner_name?: string | null;
  block_id?: number | null;
  block_name?: string | null;
  block_owner_id?: number | null;
  block_owner_name?: string | null;
  owner_id?: number | null;
  owner_name?: string | null;
  notes?: string | null;
  description?: string | null;
  roomphoto_urls?: string[];
  photo_urls?: string[];
  video_url?: string | null;
  video_360_url?: string | null;
  status: string;
}

export interface AdminUnitCreatePayload {
  property_id: number;
  name: string;
  building_id?: number;
  building_name?: string;
  block_id?: number;
  block_name?: string;
  owner_id?: number;
  unit_type: string;
  status: "vacant" | "occupied" | "booking" | "maintenance";
  people_allowed: number;
  price: number;
  notes?: string;
  photos?: File[];
  video?: File | null;
  video_360?: File | null;
}

export interface AdminUnitUpdatePayload {
  property_id?: number;
  name?: string;
  building_id?: number;
  building_name?: string;
  block_id?: number;
  block_name?: string;
  owner_id?: number;
  unit_type?: string;
  status?: "vacant" | "occupied" | "booking" | "maintenance";
  people_allowed?: number;
  price?: number;
  notes?: string;
  photos?: File[];
  video?: File | null;
  video_360?: File | null;
}

export interface AdminPropertyMaintenanceRow {
  id: number;
  date?: string | null;
  unit_name: string;
  unit_type: string;
  tenant_name: string;
  issue: string;
  category: string;
  priority: string;
  status: string;
  technician_name?: string | null;
}

export interface AdminUser {
  id: number;
  full_name: string | null;
  email: string;
  phone_number?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_number?: string | null;
  relationship?: string | null;
  nik?: string | null;
  role: "admin" | "owner" | "tenant" | "housekeeper" | "technician";
  account_status: "active" | "inactive" | "pending_verification";
  profile_picture_url?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface AdminUserCreatePayload {
  full_name: string;
  email?: string;
  password?: string;
  phone_number?: string;
  emergency_contact_name?: string;
  emergency_contact_number?: string;
  relationship?: string;
  nik?: string;
  role?: "admin" | "owner" | "tenant" | "housekeeper" | "technician";
  account_status?: "active" | "inactive" | "pending_verification";
}

export interface AdminUserUpdatePayload {
  full_name?: string;
  email?: string;
  password?: string;
  phone_number?: string;
  emergency_contact_name?: string;
  emergency_contact_number?: string;
  relationship?: string;
  nik?: string;
  role?: "admin" | "owner" | "tenant" | "housekeeper" | "technician";
  account_status?: "active" | "inactive" | "pending_verification";
}

export interface AdminMaintenanceRequest {
  id: number;
  property: {
    id: number;
    name?: string | null;
  };
  unit: {
    id: number;
    name?: string | null;
    unit_type?: string | null;
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

export interface AdminMaintenanceUpdatePayload {
  property_id?: number;
  unit_id?: number;
  tenant_id?: number;
  assigned_to_id?: number | null;
  issue?: string;
  category?: string;
  description?: string;
  priority?: "high" | "medium" | "low";
  status?:
    | "unassigned"
    | "assigned"
    | "pending_vendor"
    | "in_progress"
    | "completed"
    | "cancelled";
  requested_date?: string;
  repair_date?: string;
  visiting_hours?: string;
}

export interface AdminFinancialTransaction {
  id: number;
  transaction_date?: string | null;
  property: {
    id: number;
    name?: string | null;
  };
  unit: {
    id?: number | null;
    name?: string | null;
  };
  property_label: string;
  description: string;
  amount: number;
  category: "income" | "expense";
  notes?: string | null;
  receipt_url?: string | null;
  created_by: {
    id?: number | null;
    full_name?: string | null;
  };
  created_at?: string | null;
  updated_at?: string | null;
}

export interface AdminFinancialTransactionCreatePayload {
  property_id: number;
  unit_id?: number;
  category: "income" | "expense";
  transaction_date: string;
  amount: number;
  description: string;
  notes?: string;
  receipt?: File | null;
}

export interface AdminFinancialTransactionUpdatePayload {
  property_id?: number;
  unit_id?: number;
  category?: "income" | "expense";
  transaction_date?: string;
  amount?: number;
  description?: string;
  notes?: string;
  receipt?: File | null;
}

export interface AdminFinancialSummary {
  total_revenue: number;
  total_expenses: number;
  net_operating_income: number;
  outstanding_balances: number;
}

export interface AdminFinancialDashboardPayload {
  summary: AdminFinancialSummary;
  charts: {
    monthly_revenue_vs_expense: Array<{
      month: string;
      revenue: number;
      expense: number;
    }>;
    revenue_breakdown_by_category: Array<{
      category: string;
      amount: number;
      percentage: number;
    }>;
  };
}

export interface AdminPayment {
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
    | null;
  booking_status_label?: string | null;
  transfer_sender_name?: string | null;
  transfer_bank_name?: string | null;
  payment_submitted_at?: string | null;
  reviewed_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  record_type?: "payment" | "manual_booking";
}

export interface AdminManualRentalBooking {
  id: number;
  booking_code?: string | null;
  status?:
    | "awaiting_payment"
    | "pending_review"
    | "approved"
    | "denied"
    | "cancelled"
    | "expired"
    | string
    | null;
  status_label?: string | null;
  total_amount?: number | null;
  monthly_rent_amount?: number | null;
  expires_at?: string | null;
  payment_channel?: string | null;
  transfer_sender_name?: string | null;
  transfer_bank_name?: string | null;
  payment_submitted_at?: string | null;
  transferred_at?: string | null;
  transfer_proof_url?: string | null;
  reviewed_at?: string | null;
  admin_notes?: string | null;
  denied_reason?: string | null;
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
  } | null;
  tenant?: {
    id?: number | null;
    full_name?: string | null;
  } | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface AdminManualRentalBookingApprovePayload {
  commission_type: "percentage" | "nominal";
  commission_percentage?: number;
  commission_nominal?: number;
  notes?: string;
}

export interface AdminPaymentCreatePayload {
  property_id: number;
  unit_id: number;
  tenant_id: number;
  lease_id?: number;
  status?: "waiting" | "paid" | "overdue" | "cancelled";
  amount: number;
  due_date: string;
  paid_at?: string;
  payment_method?: string;
  description?: string;
}

export interface AdminPaymentUpdatePayload {
  property_id?: number;
  unit_id?: number;
  tenant_id?: number;
  lease_id?: number;
  status?: "waiting" | "paid" | "overdue" | "cancelled";
  amount?: number;
  due_date?: string;
  paid_at?: string;
  payment_method?: string;
  description?: string;
}

export interface AdminCommunication {
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
  recipients?: Array<{
    tenant_id: number;
    tenant_name?: string | null;
    status: "scheduled" | "sent" | "failed";
    sent_at?: string | null;
    failed_reason?: string | null;
  }>;
  scheduled_at?: string | null;
  sent_at?: string | null;
  created_by: {
    id?: number | null;
    full_name?: string | null;
  };
  created_at?: string | null;
  updated_at?: string | null;
}

export interface AdminCommunicationCreatePayload {
  property_id?: number | null;
  audience_type: "all_tenants" | "some_tenants" | "specific_tenants";
  subject: string;
  message: string;
  scheduled_at?: string;
  send_now?: boolean;
  tenant_ids?: number[];
}

export interface AdminCommunicationUpdatePayload {
  property_id?: number | null;
  audience_type?: "all_tenants" | "some_tenants" | "specific_tenants";
  subject?: string;
  message?: string;
  scheduled_at?: string;
  send_now?: boolean;
  tenant_ids?: number[];
}

export interface AdminLogActivity {
  id: number;
  timestamp?: string | null;
  timestamp_date?: string | null;
  timestamp_time?: string | null;
  admin?: {
    id?: number | null;
    full_name?: string | null;
  } | null;
  admin_name?: string | null;
  action: string;
  action_label: string;
  action_badge_color: "blue" | "orange" | "red" | "gray";
  module_name: string;
  module_page: string;
  description: string;
  description_detail?: string | null;
  description_raw?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

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

const getAllList = async <T>(
  path: string,
  params?: QueryParams,
  perPage = 100
): Promise<ListResult<T>> => {
  const firstResponse = await getList<T>(path, {
    ...params,
    page: 1,
    per_page: perPage,
  });
  const data = [...firstResponse.data];
  const totalPages = firstResponse.meta?.total_pages || 1;

  for (let page = 2; page <= totalPages; page += 1) {
    const nextResponse = await getList<T>(path, {
      ...params,
      page,
      per_page: firstResponse.meta?.per_page || perPage,
    });
    data.push(...nextResponse.data);
  }

  return {
    ...firstResponse,
    data,
  };
};

const getItem = async <T>(
  path: string,
  params?: QueryParams
): Promise<ItemResult<T>> => {
  const response = await axiosInstance.get<ApiResponse<T>>(path, {
    params: sanitizeParams(params),
  });

  return {
    data: response.data.data,
    message: response.data.message,
  };
};

const mergeUniqueMedia = (...items: Array<Array<string | null | undefined>>) => {
  return Array.from(
    new Set(
      items
        .flat()
        .map((item) => item?.trim())
        .filter((item): item is string => Boolean(item))
    )
  );
};

const normalizeVideoUrls = (property: {
  video_urls?: string[] | null;
  video_url?: string | null;
  video_360_url?: string | null;
  photo_360_url?: string | null;
}) => {
  return mergeUniqueMedia(
    property.video_urls || [],
    [property.video_url]
  );
};

const normalizeAdminPropertyListItem = (
  property: AdminPropertyListItem
): AdminPropertyListItem => {
  const roomphotoUrls = mergeUniqueMedia(
    property.roomphoto_urls || [],
    property.photo_urls || []
  );
  const videoUrls = normalizeVideoUrls(property);

  return {
    ...property,
    roomphoto_urls: roomphotoUrls,
    photo_urls: roomphotoUrls,
    video_urls: videoUrls,
    video_url: property.video_url || videoUrls[0] || null,
    video_360_url: property.video_360_url || property.photo_360_url || null,
    photo_360_url: property.photo_360_url || property.video_360_url || null,
  };
};

const normalizeAdminPropertyDetailPayload = (
  payload: AdminPropertyDetailPayload
): AdminPropertyDetailPayload => {
  const roomphotoUrls = mergeUniqueMedia(
    payload.property.roomphoto_urls || [],
    payload.property.photo_urls || []
  );
  const videoUrls = normalizeVideoUrls(payload.property);

  return {
    ...payload,
    property: {
      ...payload.property,
      roomphoto_urls: roomphotoUrls,
      photo_urls: roomphotoUrls,
      video_urls: videoUrls,
      video_url: payload.property.video_url || videoUrls[0] || null,
      video_360_url:
        payload.property.video_360_url ||
        payload.property.photo_360_url ||
        null,
      photo_360_url:
        payload.property.photo_360_url ||
        payload.property.video_360_url ||
        null,
    },
  };
};

const appendOptimizedPhotos = async (
  formData: FormData,
  key: string,
  photos?: File[]
) => {
  const sourcePhotos = photos || [];
  const backendOptimizedPhotos = sourcePhotos.filter((photo) => {
    const type = photo.type.toLowerCase();
    const name = photo.name.toLowerCase();

    return (
      type === "image/heic" ||
      type === "image/heif" ||
      name.endsWith(".heic") ||
      name.endsWith(".heif")
    );
  });
  const browserOptimizedPhotos = sourcePhotos.filter((photo) => {
    return !backendOptimizedPhotos.includes(photo);
  });
  const optimizedPhotos = await optimizeImageFilesForUpload(browserOptimizedPhotos, {
    fallbackToOriginal: false,
  });

  [...optimizedPhotos, ...backendOptimizedPhotos].forEach((photo) => {
    formData.append(key, photo);
  });
};

const toPropertyFormData = async (payload: AdminPropertyUpsertPayload) => {
  const formData = new FormData();

  if (typeof payload.owner_id === "number") {
    formData.append("property[user_id]", String(payload.owner_id));
  }
  formData.append("property[name]", payload.name);
  formData.append("property[address]", payload.address);
  if (typeof payload.latitude === "number" && Number.isFinite(payload.latitude)) {
    formData.append("property[latitude]", String(payload.latitude));
  }
  if (typeof payload.longitude === "number" && Number.isFinite(payload.longitude)) {
    formData.append("property[longitude]", String(payload.longitude));
  }
  formData.append("property[property_type]", payload.property_type);
  formData.append("property[condition]", payload.condition);
  formData.append("property[description]", payload.description || "");
  formData.append("property[rules]", payload.rules || "");

  (payload.facilities || []).forEach((facility) => {
    if (!facility) {
      return;
    }

    formData.append("property[facilities][]", facility);
  });

  await appendOptimizedPhotos(formData, "property[photos][]", payload.photos);

  const primaryVideo = payload.video || payload.videos?.[0] || null;
  if (primaryVideo) {
    formData.append("property[video]", primaryVideo);
  }

  const video360 = payload.video_360 || payload.photo_360 || null;
  if (video360) {
    formData.append("property[video_360]", video360);
  }

  return formData;
};

const toPropertyUpdateFormData = async (payload: AdminPropertyUpdatePayload) => {
  const formData = new FormData();

  if (typeof payload.owner_id === "number") {
    formData.append("property[user_id]", String(payload.owner_id));
  }

  if (payload.name !== undefined) {
    formData.append("property[name]", payload.name);
  }

  if (payload.address !== undefined) {
    formData.append("property[address]", payload.address);
  }

  if (typeof payload.latitude === "number" && Number.isFinite(payload.latitude)) {
    formData.append("property[latitude]", String(payload.latitude));
  }

  if (typeof payload.longitude === "number" && Number.isFinite(payload.longitude)) {
    formData.append("property[longitude]", String(payload.longitude));
  }

  if (payload.property_type !== undefined) {
    formData.append("property[property_type]", payload.property_type);
  }

  if (payload.condition !== undefined) {
    formData.append("property[condition]", payload.condition);
  }

  if (payload.description !== undefined) {
    formData.append("property[description]", payload.description || "");
  }

  if (payload.rules !== undefined) {
    formData.append("property[rules]", payload.rules || "");
  }

  if (payload.facilities !== undefined) {
    payload.facilities.forEach((facility) => {
      if (!facility) {
        return;
      }

      formData.append("property[facilities][]", facility);
    });
  }

  await appendOptimizedPhotos(formData, "property[photos][]", payload.photos);

  const primaryVideo = payload.video || payload.videos?.[0] || null;
  if (primaryVideo) {
    formData.append("property[video]", primaryVideo);
  }

  const video360 = payload.video_360 || payload.photo_360 || null;
  if (video360) {
    formData.append("property[video_360]", video360);
  }

  return formData;
};

const appendUnitFormDataValue = (
  formData: FormData,
  key: string,
  value: string | number | undefined | null
) => {
  if (value === undefined || value === null) {
    return;
  }

  formData.append(`unit[${key}]`, String(value));
};

const toUnitFormData = async (
  payload: AdminUnitCreatePayload | AdminUnitUpdatePayload
) => {
  const formData = new FormData();

  appendUnitFormDataValue(formData, "property_id", payload.property_id);
  appendUnitFormDataValue(formData, "name", payload.name);
  appendUnitFormDataValue(formData, "building_id", payload.building_id);
  appendUnitFormDataValue(formData, "building_name", payload.building_name);
  appendUnitFormDataValue(formData, "block_id", payload.block_id);
  appendUnitFormDataValue(formData, "block_name", payload.block_name);
  appendUnitFormDataValue(formData, "owner_id", payload.owner_id);
  appendUnitFormDataValue(formData, "unit_type", payload.unit_type);
  appendUnitFormDataValue(formData, "status", payload.status);
  appendUnitFormDataValue(formData, "people_allowed", payload.people_allowed);
  appendUnitFormDataValue(formData, "price", payload.price);
  appendUnitFormDataValue(formData, "notes", payload.notes);

  await appendOptimizedPhotos(formData, "unit[photos][]", payload.photos);

  if (payload.video) {
    formData.append("unit[video]", payload.video);
  }

  if (payload.video_360) {
    formData.append("unit[video_360]", payload.video_360);
  }

  return formData;
};

const toFinancialTransactionFormData = (
  payload:
    | AdminFinancialTransactionCreatePayload
    | AdminFinancialTransactionUpdatePayload
) => {
  const formData = new FormData();

  if (payload.property_id !== undefined) {
    formData.append(
      "financial_transaction[property_id]",
      String(payload.property_id)
    );
  }

  if (payload.unit_id !== undefined) {
    formData.append("financial_transaction[unit_id]", String(payload.unit_id));
  }

  if (payload.category !== undefined) {
    formData.append("financial_transaction[category]", payload.category);
  }

  if (payload.transaction_date !== undefined) {
    formData.append(
      "financial_transaction[transaction_date]",
      payload.transaction_date
    );
  }

  if (payload.amount !== undefined) {
    formData.append("financial_transaction[amount]", String(payload.amount));
  }

  if (payload.description !== undefined) {
    formData.append("financial_transaction[description]", payload.description);
  }

  if (payload.notes !== undefined) {
    formData.append("financial_transaction[notes]", payload.notes);
  }

  if (payload.receipt) {
    formData.append("financial_transaction[receipt]", payload.receipt);
  }

  return formData;
};

export const getApiErrorMessage = (
  error: unknown,
  fallback = "Gagal memuat data. Silakan coba lagi."
) => {
  const normalizeApiMessage = (message?: string) => {
    if (!message) {
      return message;
    }

    const normalized = message?.toLowerCase() || "";
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

export const toAbsoluteAssetUrl = (path?: string | null) => {
  if (!path) {
    return null;
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const baseUrl = resolveApiBaseUrl();
  return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
};

const normalizeFinancialTransaction = (
  transaction: AdminFinancialTransaction
): AdminFinancialTransaction => ({
  ...transaction,
  receipt_url: toAbsoluteAssetUrl(transaction.receipt_url) || null,
});

export const mapPropertyStatus = (
  property: Pick<
    AdminPropertyListItem,
    "occupied_units" | "booking_units" | "vacant_units" | "maintenance_units"
  >
): PropertyStatus => {
  if (property.maintenance_units > 0) {
    return "maintenance";
  }

  if ((property.booking_units || 0) > 0) {
    return "booking";
  }

  if (property.occupied_units > 0) {
    return "occupied";
  }

  return "vacant";
};

export const mapPropertyToCard = (property: AdminPropertyListItem): Property => {
  const image =
    toAbsoluteAssetUrl(property.photo_urls?.[0]) ||
    toAbsoluteAssetUrl(property.roomphoto_urls?.[0]) ||
    "/bg-1200.webp";

  return {
    id: property.id,
    name: property.name,
    address: property.address,
    status: mapPropertyStatus(property),
    image,
    totalUnits: property.total_units,
    blockCount: property.block_count || undefined,
    occupiedUnits: property.occupied_units,
    bookingUnits: property.booking_units || undefined,
    vacantUnits: property.vacant_units,
    maintenanceUnits: property.maintenance_units,
  };
};

export const buildPeriodParams = (period: string): QueryParams => {
  const now = new Date();
  const year = now.getFullYear();

  switch (period) {
    case "month":
      return { period: "this_month" };
    case "quarter": {
      const fromDate = new Date(year, now.getMonth() - 2, 1);
      const toDate = new Date(year, now.getMonth() + 1, 0);

      return {
        date_from: toDateInput(fromDate),
        date_to: toDateInput(toDate),
      };
    }
    case "lastYear":
      return {
        date_from: `${year - 1}-01-01`,
        date_to: `${year - 1}-12-31`,
      };
    case "year":
    default:
      return {};
  }
};

const toDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const getAdminProperties = async (params?: QueryParams) => {
  const response = await getList<AdminPropertyListItem>("/api/v1/properties", params);
  return {
    ...response,
    data: response.data.map(normalizeAdminPropertyListItem),
  };
};

export const getAllAdminProperties = async (params?: QueryParams) => {
  const response = await getAllList<AdminPropertyListItem>(
    "/api/v1/properties",
    params
  );
  return {
    ...response,
    data: response.data.map(normalizeAdminPropertyListItem),
  };
};

export const createAdminProperty = async (payload: AdminPropertyUpsertPayload) => {
  const formData = await toPropertyFormData(payload);
  const response = await axiosInstance.post<ApiResponse<AdminPropertyDetailPayload>>(
    "/api/v1/properties",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return {
    data: normalizeAdminPropertyDetailPayload(response.data.data),
    message: response.data.message,
  };
};

export const deleteAdminProperty = async (id: number | string) => {
  const response = await axiosInstance.delete<ApiResponse<null>>(
    `/api/v1/properties/${id}`
  );

  return {
    message: response.data.message,
  };
};

export const updateAdminProperty = async (
  id: number | string,
  payload: AdminPropertyUpdatePayload
) => {
  const formData = await toPropertyUpdateFormData(payload);
  const response = await axiosInstance.patch<ApiResponse<AdminPropertyDetailPayload>>(
    `/api/v1/properties/${id}`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return {
    data: normalizeAdminPropertyDetailPayload(response.data.data),
    message: response.data.message,
  };
};

export const updateAdminPropertyMediaOrder = async (
  id: number | string,
  payload: AdminPropertyMediaOrderPayload
) => {
  const response = await axiosInstance.patch<ApiResponse<AdminPropertyDetailPayload>>(
    `/api/v1/properties/${id}/media_order`,
    {
      property: payload,
    }
  );

  return {
    data: normalizeAdminPropertyDetailPayload(response.data.data),
    message: response.data.message,
  };
};

export const getAdminPropertyDetail = async (id: number | string) => {
  const response = await getItem<AdminPropertyDetailPayload>(`/api/v1/properties/${id}`);
  return {
    ...response,
    data: normalizeAdminPropertyDetailPayload(response.data),
  };
};

export const getAdminPropertyTenants = (
  id: number | string,
  params?: QueryParams
) => getList<AdminPropertyTenantRow>(`/api/v1/properties/${id}/tenants`, params);

export const getAllAdminPropertyTenants = (
  id: number | string,
  params?: QueryParams
) => getAllList<AdminPropertyTenantRow>(`/api/v1/properties/${id}/tenants`, params);

export const createAdminPropertyTenant = async (
  propertyId: number | string,
  payload: AdminPropertyTenantCreatePayload
) => {
  const response = await axiosInstance.post<ApiResponse<AdminPropertyTenantRow>>(
    `/api/v1/properties/${propertyId}/tenants`,
    {
      tenant_assignment: payload,
    }
  );

  return {
    data: response.data.data,
    message: response.data.message,
  };
};

export const updateAdminPropertyTenant = async (
  propertyId: number | string,
  leaseId: number | string,
  payload: AdminPropertyTenantUpdatePayload
) => {
  const response = await axiosInstance.patch<ApiResponse<AdminPropertyTenantRow>>(
    `/api/v1/properties/${propertyId}/tenants/${leaseId}`,
    {
      tenant_assignment: payload,
    }
  );

  return {
    data: response.data.data,
    message: response.data.message,
  };
};

export const deleteAdminPropertyTenant = async (
  propertyId: number | string,
  leaseId: number | string
) => {
  const response = await axiosInstance.delete<ApiResponse<null>>(
    `/api/v1/properties/${propertyId}/tenants/${leaseId}`
  );

  return {
    message: response.data.message,
  };
};

export const getAdminPropertyUnits = (id: number | string, params?: QueryParams) =>
  getList<AdminPropertyUnitRow>(`/api/v1/properties/${id}/units`, params);

export const getAllAdminPropertyUnits = (
  id: number | string,
  params?: QueryParams
) => getAllList<AdminPropertyUnitRow>(`/api/v1/properties/${id}/units`, params);

export const createAdminUnit = async (payload: AdminUnitCreatePayload) => {
  const formData = await toUnitFormData(payload);
  const response = await axiosInstance.post<ApiResponse<unknown>>(
    "/api/v1/units",
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

export const updateAdminUnit = async (
  id: number | string,
  payload: AdminUnitUpdatePayload
) => {
  const formData = await toUnitFormData(payload);
  const response = await axiosInstance.patch<ApiResponse<unknown>>(
    `/api/v1/units/${id}`,
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

export const deleteAdminUnit = async (id: number | string) => {
  const response = await axiosInstance.delete<ApiResponse<null>>(`/api/v1/units/${id}`);

  return {
    message: response.data.message,
  };
};

export const getAdminPropertyMaintenance = (
  id: number | string,
  params?: QueryParams
) =>
  getList<AdminPropertyMaintenanceRow>(
    `/api/v1/properties/${id}/maintenance`,
    params
  );

export const getAllAdminPropertyMaintenance = (
  id: number | string,
  params?: QueryParams
) =>
  getAllList<AdminPropertyMaintenanceRow>(
    `/api/v1/properties/${id}/maintenance`,
    params
  );

export const getAdminTenants = (params?: QueryParams) =>
  getList<AdminUser>("/api/v1/users/tenant", params);

export const getAdminOwners = (params?: QueryParams) =>
  getList<AdminUser>("/api/v1/users/owner", params);

export const getAdminUsers = (params?: QueryParams) =>
  getList<AdminUser>("/api/v1/users", params);

export const getAdminUser = (id: number | string) =>
  getItem<AdminUser>(`/api/v1/users/${id}`);

export const createAdminUser = async (payload: AdminUserCreatePayload) => {
  const response = await axiosInstance.post<ApiResponse<AdminUser>>(
    "/api/v1/users",
    {
      user: payload,
    }
  );

  return {
    data: response.data.data,
    message: response.data.message,
  };
};

export const updateAdminUser = async (
  id: number | string,
  payload: AdminUserUpdatePayload
) => {
  const response = await axiosInstance.patch<ApiResponse<AdminUser>>(
    `/api/v1/users/${id}`,
    {
      user: payload,
    }
  );

  return {
    data: response.data.data,
    message: response.data.message,
  };
};

export const deleteAdminUser = async (id: number | string) => {
  const response = await axiosInstance.delete<ApiResponse<null>>(
    `/api/v1/users/${id}`
  );

  return {
    message: response.data.message,
  };
};

export const getAdminMaintenanceRequests = (params?: QueryParams) =>
  getList<AdminMaintenanceRequest>("/api/v1/maintenance_requests", params);

export const getAdminMaintenanceRequest = (id: number | string) =>
  getItem<AdminMaintenanceRequest>(`/api/v1/maintenance_requests/${id}`);

export const updateAdminMaintenanceRequest = async (
  id: number | string,
  payload: AdminMaintenanceUpdatePayload
) => {
  const response = await axiosInstance.patch<ApiResponse<AdminMaintenanceRequest>>(
    `/api/v1/maintenance_requests/${id}`,
    {
      maintenance_request: payload,
    }
  );

  return {
    data: response.data.data,
    message: response.data.message,
  };
};

export const deleteAdminMaintenanceRequest = async (id: number | string) => {
  const response = await axiosInstance.delete<ApiResponse<null>>(
    `/api/v1/maintenance_requests/${id}`
  );

  return {
    message: response.data.message,
  };
};

export const exportAdminMaintenanceRequests = async (params?: QueryParams) => {
  const response = await axiosInstance.get<Blob>("/api/v1/maintenance_requests/export", {
    params: sanitizeParams(params),
    responseType: "blob",
  });

  return {
    blob: response.data,
    contentDisposition: response.headers["content-disposition"] || "",
  };
};

export const getAdminFinancialTransactions = async (params?: QueryParams) => {
  const result = await getList<AdminFinancialTransaction>(
    "/api/v1/financial_transactions",
    params
  );

  return {
    ...result,
    data: result.data.map(normalizeFinancialTransaction),
  };
};

export const getAdminFinancialTransaction = async (id: number | string) => {
  const result = await getItem<AdminFinancialTransaction>(
    `/api/v1/financial_transactions/${id}`
  );

  return {
    ...result,
    data: normalizeFinancialTransaction(result.data),
  };
};

export const createAdminFinancialTransaction = async (
  payload: AdminFinancialTransactionCreatePayload
) => {
  const response = await axiosInstance.post<ApiResponse<AdminFinancialTransaction>>(
    "/api/v1/financial_transactions",
    toFinancialTransactionFormData(payload),
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return {
    data: normalizeFinancialTransaction(response.data.data),
    message: response.data.message,
  };
};

export const updateAdminFinancialTransaction = async (
  id: number | string,
  payload: AdminFinancialTransactionUpdatePayload
) => {
  const response = await axiosInstance.patch<ApiResponse<AdminFinancialTransaction>>(
    `/api/v1/financial_transactions/${id}`,
    toFinancialTransactionFormData(payload),
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return {
    data: normalizeFinancialTransaction(response.data.data),
    message: response.data.message,
  };
};

export const deleteAdminFinancialTransaction = async (id: number | string) => {
  const response = await axiosInstance.delete<ApiResponse<null>>(
    `/api/v1/financial_transactions/${id}`
  );

  return {
    message: response.data.message,
  };
};

export const exportAdminFinancialTransactions = async (params?: QueryParams) => {
  const response = await axiosInstance.get<Blob>("/api/v1/financial_transactions/export", {
    params: sanitizeParams(params),
    responseType: "blob",
  });

  return {
    blob: response.data,
    contentDisposition: response.headers["content-disposition"] || "",
  };
};

export const getAdminFinancialDashboard = (params?: QueryParams) =>
  getItem<AdminFinancialDashboardPayload>(
    "/api/v1/financial_transactions/dashboard",
    params
  );

const mapManualBookingStatusToPaymentStatus = (
  status?: string | null
): AdminPayment["status"] => {
  if (status === "approved") {
    return "paid";
  }

  if (status === "cancelled" || status === "denied" || status === "expired") {
    return "cancelled";
  }

  return "waiting";
};

export const mapAdminManualRentalBookingToPayment = (
  booking: AdminManualRentalBooking
): AdminPayment => {
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
    },
    tenant: {
      id: booking.tenant?.id || 0,
      full_name: booking.tenant?.full_name || null,
    },
    lease_id: booking.lease?.id || null,
    status: mapManualBookingStatusToPaymentStatus(booking.status),
    amount: booking.total_amount || booking.monthly_rent_amount || 0,
    due_date: booking.expires_at || null,
    paid_at:
      booking.payment_submitted_at ||
      booking.transferred_at ||
      booking.reviewed_at ||
      null,
    payment_method: booking.payment_channel || null,
    description:
      booking.admin_notes || booking.denied_reason || booking.status_label || null,
    transfer_proof_url: toAbsoluteAssetUrl(booking.transfer_proof_url) || null,
    booking_status:
      (booking.status as AdminPayment["booking_status"] | undefined) || null,
    booking_status_label: booking.status_label || null,
    transfer_sender_name: booking.transfer_sender_name || null,
    transfer_bank_name: booking.transfer_bank_name || null,
    payment_submitted_at:
      booking.payment_submitted_at || booking.transferred_at || null,
    reviewed_at: booking.reviewed_at || null,
    created_at: booking.created_at || null,
    updated_at: booking.updated_at || null,
    record_type: "manual_booking",
  };
};

export const getAdminPayments = (params?: QueryParams) =>
  getList<AdminPayment>("/api/v1/payments", params);

export const getAdminManualRentalBookings = async (params?: QueryParams) => {
  const response = await getList<AdminManualRentalBooking>(
    "/api/v1/manual_rentals/admin/bookings",
    params
  );

  return {
    data: response.data.map(mapAdminManualRentalBookingToPayment),
    meta: response.meta,
    message: response.message,
  };
};

export const approveAdminManualRentalBooking = async (
  id: number | string,
  payload: AdminManualRentalBookingApprovePayload
) => {
  const response = await axiosInstance.post<ApiResponse<AdminManualRentalBooking>>(
    `/api/v1/manual_rentals/admin/bookings/${id}/approve`,
    {
      settlement: payload,
    }
  );

  return {
    data: mapAdminManualRentalBookingToPayment(response.data.data),
    message: response.data.message,
  };
};

export const getAdminPayment = (id: number | string) =>
  getItem<AdminPayment>(`/api/v1/payments/${id}`);

export const createAdminPayment = async (payload: AdminPaymentCreatePayload) => {
  const response = await axiosInstance.post<ApiResponse<AdminPayment>>(
    "/api/v1/payments",
    {
      payment: payload,
    }
  );

  return {
    data: response.data.data,
    message: response.data.message,
  };
};

export const updateAdminPayment = async (
  id: number | string,
  payload: AdminPaymentUpdatePayload
) => {
  const response = await axiosInstance.patch<ApiResponse<AdminPayment>>(
    `/api/v1/payments/${id}`,
    {
      payment: payload,
    }
  );

  return {
    data: response.data.data,
    message: response.data.message,
  };
};

export const deleteAdminPayment = async (id: number | string) => {
  const response = await axiosInstance.delete<ApiResponse<null>>(
    `/api/v1/payments/${id}`
  );

  return {
    message: response.data.message,
  };
};

export const pushAdminPaymentInvoice = async (id: number | string) => {
  const response = await axiosInstance.post<ApiResponse<AdminPayment>>(
    `/api/v1/payments/${id}/push_invoice`
  );

  return {
    data: response.data.data,
    message: response.data.message,
  };
};

export const getAdminCommunications = (params?: QueryParams) =>
  getList<AdminCommunication>("/api/v1/communications", params);

export const getAdminCommunication = (id: number | string) =>
  getItem<AdminCommunication>(`/api/v1/communications/${id}`);

export const createAdminCommunication = async (
  payload: AdminCommunicationCreatePayload
) => {
  const response = await axiosInstance.post<ApiResponse<AdminCommunication>>(
    "/api/v1/communications",
    {
      communication: payload,
    }
  );

  return {
    data: response.data.data,
    message: response.data.message,
  };
};

export const updateAdminCommunication = async (
  id: number | string,
  payload: AdminCommunicationUpdatePayload
) => {
  const response = await axiosInstance.patch<ApiResponse<AdminCommunication>>(
    `/api/v1/communications/${id}`,
    {
      communication: payload,
    }
  );

  return {
    data: response.data.data,
    message: response.data.message,
  };
};

export const deleteAdminCommunication = async (id: number | string) => {
  const response = await axiosInstance.delete<ApiResponse<null>>(
    `/api/v1/communications/${id}`
  );

  return {
    message: response.data.message,
  };
};

export const getAdminLogActivities = (params?: QueryParams) =>
  getList<AdminLogActivity>("/api/v1/log_activities", params);

export const getAdminLogActivity = (id: number | string) =>
  getItem<AdminLogActivity>(`/api/v1/log_activities/${id}`);

const escapeCsvValue = (value: unknown) => {
  const stringValue = value == null ? "" : String(value);
  if (
    stringValue.includes(",") ||
    stringValue.includes('"') ||
    stringValue.includes("\n")
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
};

const buildAdminLogActivitiesCsv = (rows: AdminLogActivity[]) => {
  const header = [
    "ID",
    "Waktu",
    "Admin",
    "Aksi",
    "Label Aksi",
    "Modul",
    "Halaman Modul",
    "Deskripsi",
    "Detail",
  ];

  const lines = rows.map((item) => {
    return [
      item.id,
      item.timestamp || item.created_at || "",
      item.admin_name || item.admin?.full_name || "",
      item.action || "",
      item.action_label || "",
      item.module_name || "",
      item.module_page || "",
      item.description || "",
      item.description_detail || item.description_raw || "",
    ]
      .map(escapeCsvValue)
      .join(",");
  });

  return `\uFEFF${[header.join(","), ...lines].join("\n")}`;
};

const exportAdminLogActivitiesFromList = async (params?: QueryParams) => {
  const rows: AdminLogActivity[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const response = await getAdminLogActivities({
      ...params,
      page,
      per_page: 100,
    });

    rows.push(...response.data);
    totalPages = Math.max(1, Number(response.meta?.total_pages || 1));
    page += 1;
  }

  return {
    blob: new Blob([buildAdminLogActivitiesCsv(rows)], {
      type: "text/csv;charset=utf-8;",
    }),
    contentDisposition: 'attachment; filename="log-activities.csv"',
  };
};

export const exportAdminLogActivities = async (params?: QueryParams) => {
  return exportAdminLogActivitiesFromList(params);
};
