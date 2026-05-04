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
