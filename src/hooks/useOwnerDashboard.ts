"use client";

import { useEffect, useState } from "react";
import { getApiErrorMessage } from "@/lib/dashboard/admin.api";
import {
  getOwnerCashflowEntries,
  getOwnerManualRentalBookings,
  type OwnerCashflowEntry,
  type OwnerManualRentalBooking,
} from "@/lib/dashboard/owner.api";
import { getTenantUnitDisplayName } from "@/lib/dashboard/tenant-unit-display";
import type { OccupancyData, RevenueData } from "@/types/dashboard";

export interface OwnerDashboardStats {
  totalProperty: number;
  totalBookings: number;
  activeBookings: number;
  pendingBookings: number;
  approvedBookings: number;
  occupancyRate: number;
  totalRevenue: number;
  totalExpense: number;
  netProfit: number;
}

export interface OwnerPropertyBreakdownRow {
  propertyId: number;
  propertyName: string;
  totalBookings: number;
  activeBookings: number;
  occupancyRate: number;
  revenue: number;
  expense: number;
  profit: number;
}

export interface OwnerMonthlyDetailRow {
  period: string;
  propertyName: string;
  totalBookings: number;
  activeBookings: number;
  occupancyRate: number;
  revenue: number;
  expense: number;
  profit: number;
}

export interface OwnerLatestBookingRow {
  id: number;
  bookingCode: string;
  propertyName: string;
  unitName: string;
  tenantName: string;
  statusLabel: string;
  occupancyStatus: string;
  startDate: string;
  endDate: string;
  ownerAmount: number;
}

interface OwnerDashboardData {
  stats: OwnerDashboardStats;
  revenueData: RevenueData[];
  occupancyData: OccupancyData[];
  propertyBreakdown: OwnerPropertyBreakdownRow[];
  monthlyDetails: OwnerMonthlyDetailRow[];
  latestBookings: OwnerLatestBookingRow[];
}

const initialData: OwnerDashboardData = {
  stats: {
    totalProperty: 0,
    totalBookings: 0,
    activeBookings: 0,
    pendingBookings: 0,
    approvedBookings: 0,
    occupancyRate: 0,
    totalRevenue: 0,
    totalExpense: 0,
    netProfit: 0,
  },
  revenueData: [],
  occupancyData: [
    { name: "Aktif", value: 0 },
    { name: "Tidak Aktif", value: 0 },
  ],
  propertyBreakdown: [],
  monthlyDetails: [],
  latestBookings: [],
};

const parseDate = (value?: string | null) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
};

const formatMonth = (value: Date) => {
  return value.toLocaleDateString("id-ID", {
    month: "short",
    year: "numeric",
  });
};

const toPeriodRange = (period: string) => {
  const now = new Date();
  const thisYear = now.getFullYear();

  if (period === "month") {
    return {
      from: new Date(thisYear, now.getMonth(), 1),
      to: new Date(thisYear, now.getMonth() + 1, 0, 23, 59, 59),
    };
  }

  if (period === "quarter") {
    return {
      from: new Date(thisYear, now.getMonth() - 2, 1),
      to: new Date(thisYear, now.getMonth() + 1, 0, 23, 59, 59),
    };
  }

  if (period === "lastYear") {
    return {
      from: new Date(thisYear - 1, 0, 1),
      to: new Date(thisYear - 1, 11, 31, 23, 59, 59),
    };
  }

  return {
    from: new Date(thisYear, 0, 1),
    to: new Date(thisYear, 11, 31, 23, 59, 59),
  };
};

const isDateWithin = (value: Date | null, from: Date, to: Date) => {
  if (!value) {
    return false;
  }

  const timestamp = value.getTime();
  return timestamp >= from.getTime() && timestamp <= to.getTime();
};

const toDateParam = (value: Date) => {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const loadAllOwnerBookings = async () => {
  const rows: OwnerManualRentalBooking[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const response = await getOwnerManualRentalBookings({
      page,
      per_page: 100,
    });

    rows.push(...response.data);
    totalPages = Number(response.meta?.total_pages || 1);
    page += 1;
  }

  return rows;
};

const loadAllOwnerCashflows = async (dateFrom: string, dateTo: string) => {
  const rows: OwnerCashflowEntry[] = [];
  let page = 1;
  let totalPages = 1;
  let summary: {
    total_inflow?: number;
    total_outflow?: number;
    net_amount?: number;
  } | null = null;

  while (page <= totalPages) {
    const response = await getOwnerCashflowEntries({
      page,
      per_page: 100,
      date_from: dateFrom,
      date_to: dateTo,
      account_scope: "owner",
    });

    rows.push(...response.data);
    totalPages = Number(response.meta?.total_pages || 1);
    if (page === 1) {
      summary = response.meta?.summary || null;
    }
    page += 1;
  }

  return {
    rows,
    summary,
  };
};

export const useOwnerDashboard = (period: string) => {
  const [data, setData] = useState<OwnerDashboardData>(initialData);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;

    const loadDashboard = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const periodRange = toPeriodRange(period);
        const [allBookings, cashflowPayload] = await Promise.all([
          loadAllOwnerBookings(),
          loadAllOwnerCashflows(
            toDateParam(periodRange.from),
            toDateParam(periodRange.to)
          ),
        ]);

        if (!active) {
          return;
        }

        const bookings = allBookings.filter((booking) => {
          const sourceDate =
            parseDate(booking.created_at) || parseDate(booking.start_date);
          return isDateWithin(sourceDate, periodRange.from, periodRange.to);
        });

        const postedCashflows = cashflowPayload.rows.filter((entry) => {
          return entry.status === "posted" || !entry.status;
        });

        const propertyNameById = new Map<number, string>();
        bookings.forEach((item) => {
          const propertyId = Number(item.property?.id || 0);
          if (!propertyId) {
            return;
          }

          propertyNameById.set(propertyId, item.property?.name || `Properti #${propertyId}`);
        });
        postedCashflows.forEach((item) => {
          const propertyId = Number(item.property?.id || 0);
          if (!propertyId) {
            return;
          }

          propertyNameById.set(propertyId, item.property?.name || `Properti #${propertyId}`);
        });

        const totalBookings = bookings.length;
        const activeBookings = bookings.filter(
          (item) => item.occupancy_status === "aktif"
        ).length;
        const pendingBookings = bookings.filter((item) =>
          ["awaiting_payment", "pending_review"].includes(item.status)
        ).length;
        const approvedBookings = bookings.filter(
          (item) => item.status === "approved"
        ).length;
        const occupancyRate =
          totalBookings > 0
            ? Math.round((activeBookings / totalBookings) * 1000) / 10
            : 0;

        const computedRevenue = postedCashflows
          .filter((entry) => entry.direction === "inflow")
          .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
        const computedExpense = postedCashflows
          .filter((entry) => entry.direction === "outflow")
          .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
        const summaryRevenue = Number(cashflowPayload.summary?.total_inflow);
        const summaryExpense = Number(cashflowPayload.summary?.total_outflow);
        const summaryNet = Number(cashflowPayload.summary?.net_amount);

        const totalRevenue = Number.isFinite(summaryRevenue)
          ? summaryRevenue
          : computedRevenue;
        const totalExpense = Number.isFinite(summaryExpense)
          ? summaryExpense
          : computedExpense;
        const netProfit = Number.isFinite(summaryNet)
          ? summaryNet
          : totalRevenue - totalExpense;

        const monthlyCashflowMap = new Map<
          string,
          { sortValue: number; month: string; pemasukan: number; pengeluaran: number }
        >();

        postedCashflows.forEach((entry) => {
          const date =
            parseDate(entry.occurred_on) || parseDate(entry.created_at) || null;
          if (!date) {
            return;
          }

          const sortValue = date.getFullYear() * 100 + (date.getMonth() + 1);
          const key = `${sortValue}`;
          const existing = monthlyCashflowMap.get(key) || {
            sortValue,
            month: formatMonth(date),
            pemasukan: 0,
            pengeluaran: 0,
          };

          if (entry.direction === "inflow") {
            existing.pemasukan += Number(entry.amount || 0);
          } else {
            existing.pengeluaran += Number(entry.amount || 0);
          }
          monthlyCashflowMap.set(key, existing);
        });

        const revenueData: RevenueData[] = Array.from(monthlyCashflowMap.values())
          .sort((a, b) => a.sortValue - b.sortValue)
          .map((item) => ({
            month: item.month,
            pemasukan: item.pemasukan,
            pengeluaran: item.pengeluaran,
          }));

        const activePercent =
          totalBookings > 0 ? Math.round((activeBookings / totalBookings) * 100) : 0;
        const occupancyData: OccupancyData[] = [
          { name: "Aktif", value: activePercent },
          { name: "Tidak Aktif", value: Math.max(0, 100 - activePercent) },
        ];

        const bookingSummaryByProperty = new Map<
          number,
          { propertyName: string; totalBookings: number; activeBookings: number }
        >();
        bookings.forEach((booking) => {
          const propertyId = Number(booking.property?.id || 0);
          if (!propertyId) {
            return;
          }

          const existing = bookingSummaryByProperty.get(propertyId) || {
            propertyName:
              booking.property?.name ||
              propertyNameById.get(propertyId) ||
              `Properti #${propertyId}`,
            totalBookings: 0,
            activeBookings: 0,
          };

          existing.totalBookings += 1;
          if (booking.occupancy_status === "aktif") {
            existing.activeBookings += 1;
          }

          bookingSummaryByProperty.set(propertyId, existing);
        });

        const cashflowSummaryByProperty = new Map<
          number,
          { revenue: number; expense: number }
        >();
        postedCashflows.forEach((entry) => {
          const propertyId = Number(entry.property?.id || 0);
          if (!propertyId) {
            return;
          }

          const existing = cashflowSummaryByProperty.get(propertyId) || {
            revenue: 0,
            expense: 0,
          };

          if (entry.direction === "inflow") {
            existing.revenue += Number(entry.amount || 0);
          } else {
            existing.expense += Number(entry.amount || 0);
          }

          cashflowSummaryByProperty.set(propertyId, existing);
        });

        const propertyIds = new Set<number>([
          ...Array.from(bookingSummaryByProperty.keys()),
          ...Array.from(cashflowSummaryByProperty.keys()),
        ]);

        const propertyBreakdown: OwnerPropertyBreakdownRow[] = Array.from(
          propertyIds
        )
          .map((propertyId) => {
            const bookingSummary = bookingSummaryByProperty.get(propertyId) || {
              propertyName:
                propertyNameById.get(propertyId) || `Properti #${propertyId}`,
              totalBookings: 0,
              activeBookings: 0,
            };
            const cashflowSummary = cashflowSummaryByProperty.get(propertyId) || {
              revenue: 0,
              expense: 0,
            };

            const propertyOccupancyRate =
              bookingSummary.totalBookings > 0
                ? Math.round(
                    (bookingSummary.activeBookings / bookingSummary.totalBookings) *
                      1000
                  ) / 10
                : 0;

            return {
              propertyId,
              propertyName: bookingSummary.propertyName,
              totalBookings: bookingSummary.totalBookings,
              activeBookings: bookingSummary.activeBookings,
              occupancyRate: propertyOccupancyRate,
              revenue: cashflowSummary.revenue,
              expense: cashflowSummary.expense,
              profit: cashflowSummary.revenue - cashflowSummary.expense,
            };
          })
          .sort((a, b) => b.profit - a.profit);

        type MonthlyMapRow = OwnerMonthlyDetailRow & { sortValue: number };
        const monthlyDetailMap = new Map<string, MonthlyMapRow>();

        bookings.forEach((booking) => {
          const propertyId = Number(booking.property?.id || 0);
          const date =
            parseDate(booking.created_at) || parseDate(booking.start_date) || null;
          if (!propertyId || !date) {
            return;
          }

          const sortValue = date.getFullYear() * 100 + (date.getMonth() + 1);
          const key = `${sortValue}-${propertyId}`;
          const existing = monthlyDetailMap.get(key) || {
            period: formatMonth(date),
            propertyName:
              booking.property?.name ||
              propertyNameById.get(propertyId) ||
              `Properti #${propertyId}`,
            totalBookings: 0,
            activeBookings: 0,
            occupancyRate: 0,
            revenue: 0,
            expense: 0,
            profit: 0,
            sortValue,
          };

          existing.totalBookings += 1;
          if (booking.occupancy_status === "aktif") {
            existing.activeBookings += 1;
          }

          monthlyDetailMap.set(key, existing);
        });

        postedCashflows.forEach((entry) => {
          const propertyId = Number(entry.property?.id || 0);
          const date =
            parseDate(entry.occurred_on) || parseDate(entry.created_at) || null;
          if (!propertyId || !date) {
            return;
          }

          const sortValue = date.getFullYear() * 100 + (date.getMonth() + 1);
          const key = `${sortValue}-${propertyId}`;
          const existing = monthlyDetailMap.get(key) || {
            period: formatMonth(date),
            propertyName:
              entry.property?.name ||
              propertyNameById.get(propertyId) ||
              `Properti #${propertyId}`,
            totalBookings: 0,
            activeBookings: 0,
            occupancyRate: 0,
            revenue: 0,
            expense: 0,
            profit: 0,
            sortValue,
          };

          if (entry.direction === "inflow") {
            existing.revenue += Number(entry.amount || 0);
          } else {
            existing.expense += Number(entry.amount || 0);
          }

          monthlyDetailMap.set(key, existing);
        });

        const monthlyDetails: OwnerMonthlyDetailRow[] = Array.from(
          monthlyDetailMap.values()
        )
          .sort((a, b) => {
            if (b.sortValue !== a.sortValue) {
              return b.sortValue - a.sortValue;
            }

            return b.revenue - b.expense - (a.revenue - a.expense);
          })
          .map((row) => {
            const occupancy =
              row.totalBookings > 0
                ? Math.round((row.activeBookings / row.totalBookings) * 1000) / 10
                : 0;

            return {
              period: row.period,
              propertyName: row.propertyName,
              totalBookings: row.totalBookings,
              activeBookings: row.activeBookings,
              occupancyRate: occupancy,
              revenue: row.revenue,
              expense: row.expense,
              profit: row.revenue - row.expense,
            };
          });

        const latestBookings: OwnerLatestBookingRow[] = [...bookings]
          .sort((a, b) => {
            const aDate =
              parseDate(a.created_at)?.getTime() ||
              parseDate(a.start_date)?.getTime() ||
              0;
            const bDate =
              parseDate(b.created_at)?.getTime() ||
              parseDate(b.start_date)?.getTime() ||
              0;
            return bDate - aDate;
          })
          .slice(0, 8)
          .map((row) => ({
            id: row.id,
            bookingCode: row.booking_code || "-",
            propertyName: row.property?.name || "-",
            unitName: getTenantUnitDisplayName(row.unit),
            tenantName: row.tenant?.full_name || "-",
            statusLabel: row.status_label || row.status || "-",
            occupancyStatus: row.occupancy_status || "-",
            startDate: row.start_date || "-",
            endDate: row.end_date || "-",
            ownerAmount: Number(row.settlement?.owner_amount || 0),
          }));

        setData({
          stats: {
            totalProperty: propertyIds.size,
            totalBookings,
            activeBookings,
            pendingBookings,
            approvedBookings,
            occupancyRate,
            totalRevenue,
            totalExpense,
            netProfit,
          },
          revenueData,
          occupancyData,
          propertyBreakdown,
          monthlyDetails,
          latestBookings,
        });
      } catch (loadError) {
        if (!active) {
          return;
        }

        setError(
          getApiErrorMessage(
            loadError,
            "Data dashboard owner gagal dimuat. Silakan coba lagi."
          )
        );
        setData(initialData);
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
    setRefreshKey((previous) => previous + 1);
  };

  return {
    data,
    isLoading,
    error,
    refresh,
  };
};

export default useOwnerDashboard;
