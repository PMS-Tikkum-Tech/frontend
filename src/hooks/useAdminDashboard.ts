"use client";

import { useEffect, useState } from "react";
import {
  buildPeriodParams,
  getAllAdminProperties,
  getAdminFinancialDashboard,
  getAdminLogActivities,
  getAdminMaintenanceRequests,
  getAdminManualRentalBookings,
  getAdminPayments,
  getApiErrorMessage,
} from "@/lib/dashboard/admin.api";
import type {
  MaintenanceData,
  OccupancyData,
  PaymentData,
  RevenueData,
  SourceData,
} from "@/types/dashboard";

type ActivityType = "payment" | "maintenance" | "tenant" | "property";

export interface AdminDashboardActivity {
  id: number;
  type: ActivityType;
  title: string;
  description: string;
  time: string;
}

interface AdminDashboardStats {
  totalProperty: number;
  occupiedUnit: number;
  activeMaintenance: number;
  pendingPayments: number;
}

export interface AdminDashboardData {
  stats: AdminDashboardStats;
  revenueData: RevenueData[];
  paymentData: PaymentData[];
  occupancyData: OccupancyData[];
  maintenanceData: MaintenanceData[];
  sourceData: SourceData[];
  activities: AdminDashboardActivity[];
}

const initialData: AdminDashboardData = {
  stats: {
    totalProperty: 0,
    occupiedUnit: 0,
    activeMaintenance: 0,
    pendingPayments: 0,
  },
  revenueData: [],
  paymentData: [],
  occupancyData: [],
  maintenanceData: [],
  sourceData: [],
  activities: [],
};

const mapModuleToActivityType = (moduleName: string): ActivityType => {
  const normalized = moduleName.toLowerCase();

  if (normalized.includes("payment") || normalized.includes("financial")) {
    return "payment";
  }

  if (normalized.includes("maintenance")) {
    return "maintenance";
  }

  if (normalized.includes("user") || normalized.includes("tenant")) {
    return "tenant";
  }

  return "property";
};

const formatRelativeTime = (timestamp?: string | null) => {
  if (!timestamp) {
    return "-";
  }

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 1) {
    return "Baru saja";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} menit lalu`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} jam lalu`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} hari lalu`;
};

export const useAdminDashboard = (period: string) => {
  const [data, setData] = useState<AdminDashboardData>(initialData);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    const periodParams = buildPeriodParams(period);

    const loadDashboard = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [
          propertiesResponse,
          maintenanceResponse,
          paymentsResponse,
          manualBookingsResponse,
          financialDashboardResponse,
          activityResponse,
        ] = await Promise.all([
          getAllAdminProperties(),
          getAdminMaintenanceRequests({
            ...periodParams,
            page: 1,
            per_page: 100,
          }),
          getAdminPayments({
            ...periodParams,
            page: 1,
            per_page: 100,
          }),
          getAdminManualRentalBookings({
            ...periodParams,
            page: 1,
            per_page: 100,
          }),
          getAdminFinancialDashboard(periodParams),
          getAdminLogActivities({
            page: 1,
            per_page: 6,
          }),
        ]);

        if (!active) {
          return;
        }

        const properties = propertiesResponse.data;
        const maintenanceRequests = maintenanceResponse.data;
        const payments = [...paymentsResponse.data, ...manualBookingsResponse.data];
        const dashboard = financialDashboardResponse.data;
        const activities = activityResponse.data;

        const totalUnits = properties.reduce(
          (sum, property) => sum + property.total_units,
          0
        );
        const occupiedUnits = properties.reduce(
          (sum, property) => sum + property.occupied_units,
          0
        );
        const vacantUnits = properties.reduce(
          (sum, property) => sum + property.vacant_units,
          0
        );
        const activeMaintenance = properties.reduce(
          (sum, property) => sum + property.maintenance_units,
          0
        );
        const pendingPayments = payments.filter(
          (payment) => payment.status === "waiting" || payment.status === "overdue"
        ).length;

        const monthlyChartEntries = dashboard.charts.monthly_revenue_vs_expense;
        const revenueData: RevenueData[] = monthlyChartEntries.map((entry) => ({
          month: entry.period
            ? new Intl.DateTimeFormat("id-ID", {
                month: "short",
              }).format(new Date(`${entry.period}-01T00:00:00`))
            : entry.month,
          pemasukan: entry.revenue,
          pengeluaran: entry.expense,
        }));

        const paymentsByProperty = new Map<string, PaymentData>();
        payments.forEach((payment) => {
          const propertyName = payment.property.name || "Tanpa Properti";
          const base =
            paymentsByProperty.get(propertyName) || {
              name: propertyName,
              sudah: 0,
              menunggu: 0,
              terlambat: 0,
            };

          if (payment.status === "paid") {
            base.sudah += 1;
          } else if (payment.status === "waiting") {
            base.menunggu += 1;
          } else if (payment.status === "overdue") {
            base.terlambat += 1;
          }

          paymentsByProperty.set(propertyName, base);
        });

        const paymentData = Array.from(paymentsByProperty.values());

        const transitionalUnits = Math.max(
          totalUnits - occupiedUnits - vacantUnits,
          0,
        );
        const occupancyData: OccupancyData[] =
          totalUnits > 0
            ? [
                {
                  name: "Terisi",
                  value: Math.round((occupiedUnits / totalUnits) * 100),
                },
                {
                  name: "Tersedia",
                  value: Math.round((vacantUnits / totalUnits) * 100),
                },
                ...(transitionalUnits > 0
                  ? [
                      {
                        name: "Dalam Proses",
                        value: Math.round((transitionalUnits / totalUnits) * 100),
                      },
                    ]
                  : []),
              ]
            : [
                { name: "Terisi", value: 0 },
                { name: "Tersedia", value: 0 },
              ];

        const maintenanceByCategory = new Map<string, number>();
        maintenanceRequests.forEach((request) => {
          const categoryName = request.category || "lainnya";
          const currentValue = maintenanceByCategory.get(categoryName) || 0;
          maintenanceByCategory.set(categoryName, currentValue + 1);
        });

        const maintenanceData: MaintenanceData[] = Array.from(
          maintenanceByCategory.entries()
        ).map(([name, value]) => ({
          name,
          value,
        }));

        const sourceData: SourceData[] =
          dashboard.charts.revenue_breakdown_by_category.map((entry) => ({
            name: entry.category,
            value: entry.percentage,
          }));

        const activityData: AdminDashboardActivity[] = activities.map((item) => ({
          id: item.id,
          type: mapModuleToActivityType(item.module_name),
          title: `${item.action_label} ${item.module_page}`,
          description: item.description,
          time: formatRelativeTime(item.created_at),
        }));

        setData({
          stats: {
            totalProperty: propertiesResponse.meta?.total_count || properties.length,
            occupiedUnit: occupiedUnits,
            activeMaintenance,
            pendingPayments,
          },
          revenueData,
          paymentData,
          occupancyData,
          maintenanceData,
          sourceData,
          activities: activityData,
        });
      } catch (loadError) {
        if (!active) {
          return;
        }

        setError(
          getApiErrorMessage(
            loadError,
            "Data dashboard gagal dimuat. Coba refresh halaman."
          )
        );
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadDashboard();

    return () => {
      active = false;
    };
  }, [period, refreshKey]);

  const refresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return {
    data,
    isLoading,
    error,
    refresh,
  };
};

export default useAdminDashboard;
