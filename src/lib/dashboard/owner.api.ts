import axiosInstance from "@/lib/axios";
import type { ApiPaginationMeta, ApiResponse } from "@/types/api";

type QueryParams = Record<string, string | number | boolean | null | undefined>;

type ListResult<T, M = ApiPaginationMeta> = {
  data: T[];
  meta?: M;
  message: string;
};

type OwnerCashflowMeta = ApiPaginationMeta & {
  summary?: {
    total_inflow?: number;
    total_outflow?: number;
    net_amount?: number;
  };
};

export interface OwnerManualRentalBooking {
  id: number;
  booking_code: string;
  status: string;
  status_label?: string | null;
  occupancy_status?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  created_at?: string | null;
  monthly_rent_amount?: number;
  property?: {
    id?: number | null;
    name?: string | null;
  } | null;
  unit?: {
    id?: number | null;
    name?: string | null;
  } | null;
  settlement?: {
    owner_amount?: number | null;
  } | null;
}

export interface OwnerCashflowEntry {
  id: number;
  account_scope: string;
  entry_type: string;
  direction: "inflow" | "outflow" | string;
  status: string;
  amount: number;
  occurred_on?: string | null;
  description?: string | null;
  property?: {
    id?: number | null;
    name?: string | null;
  } | null;
  unit?: {
    id?: number | null;
    name?: string | null;
  } | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface OwnerManagedProperty {
  id: number;
  name: string;
}

interface OwnerCatalogUnit {
  id: number;
  property?: {
    id?: number | null;
    name?: string | null;
  } | null;
  owner?: {
    id?: number | null;
  } | null;
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

export const getOwnerManualRentalBookings = async (
  params?: QueryParams
): Promise<ListResult<OwnerManualRentalBooking>> => {
  const response = await axiosInstance.get<
    ApiResponse<OwnerManualRentalBooking[], ApiPaginationMeta>
  >("/api/v1/manual_rentals/owner/bookings", {
    params: sanitizeParams(params),
  });

  return {
    data: response.data.data,
    meta: response.data.meta,
    message: response.data.message,
  };
};

export const getOwnerCashflowEntries = async (
  params?: QueryParams
): Promise<ListResult<OwnerCashflowEntry, OwnerCashflowMeta>> => {
  const response = await axiosInstance.get<
    ApiResponse<OwnerCashflowEntry[], OwnerCashflowMeta>
  >("/api/v1/cashflow_entries", {
    params: sanitizeParams(params),
  });

  return {
    data: response.data.data,
    meta: response.data.meta,
    message: response.data.message,
  };
};

export const getOwnerManagedProperties = async (
  ownerId: number
): Promise<OwnerManagedProperty[]> => {
  if (!Number.isFinite(ownerId) || ownerId <= 0) {
    return [];
  }

  const normalizedOwnerId = Math.trunc(ownerId);
  const perPage = 100;
  const propertyMap = new Map<number, OwnerManagedProperty>();
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const response = await axiosInstance.get<
      ApiResponse<OwnerCatalogUnit[], ApiPaginationMeta>
    >("/api/v1/manual_rentals/catalog", {
      params: sanitizeParams({
        page,
        per_page: perPage,
      }),
    });

    response.data.data.forEach((item) => {
      const ownerItemId = Number(item.owner?.id || 0);
      if (ownerItemId !== normalizedOwnerId) {
        return;
      }

      const propertyId = Number(item.property?.id || 0);
      if (!Number.isFinite(propertyId) || propertyId <= 0) {
        return;
      }

      if (propertyMap.has(propertyId)) {
        return;
      }

      propertyMap.set(propertyId, {
        id: propertyId,
        name: item.property?.name || `Properti #${propertyId}`,
      });
    });

    totalPages = Math.max(1, Number(response.data.meta?.total_pages || 1));
    page += 1;
  }

  return Array.from(propertyMap.values());
};
