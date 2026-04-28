export interface RevenueData {
  month: string;
  pemasukan: number;
  pengeluaran: number;
}

export interface PaymentData {
  name: string;
  sudah: number;
  menunggu: number;
  terlambat: number;
}

export interface OccupancyData {
  name: string;
  value: number;
}

export interface MaintenanceData {
  name: string;
  value: number;
}

export interface SourceData {
  name: string;
  value: number;
}

export type PropertyStatus =
  | "vacant"
  | "occupied"
  | "booking"
  | "maintenance"
  | "cleaning"
  | "renovation";

export interface Property {
  id: string | number;
  name: string;
  address: string;
  price?: number | null;
  status: PropertyStatus;
  tenantName?: string;
  endDate?: string;
  image: string;
  totalUnits?: number;
  blockCount?: number;
  occupiedUnits?: number;
  bookingUnits?: number;
  vacantUnits?: number;
  maintenanceUnits?: number;
}
