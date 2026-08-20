"use client";

import { useEffect, useState } from "react";
import { getApiErrorMessage } from "@/lib/dashboard/admin.api";
import {
  getOwnerCashflowEntries,
  getOwnerManualRentalBookings,
  getOwnerPropertyReports,
  type OwnerCashflowEntry,
  type OwnerManualRentalBooking,
  type OwnerPropertyReportUnit,
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
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  maintenanceUnits: number;
  totalBookings: number;
  activeBookings: number;
  occupancyRate: number;
  revenue: number;
  expense: number;
  profit: number;
}

export interface OwnerMonthlyDetailRow {
  propertyId: number;
  periodKey: string;
  period: string;
  propertyName: string;
  totalBookings: number;
  activeBookings: number;
  occupancyRate: number;
  revenue: number;
  expense: number;
  profit: number;
}

export interface OwnerFinancialDetailRow {
  id: string;
  direction: "inflow" | "outflow";
  amount: number;
  occurredOn: string;
  periodKey: string;
  propertyId: number;
  unitId: number;
  tenantId: number;
  tenantName: string;
  propertyName: string;
  unitName: string;
  bookingCode: string;
  entryType: string;
  description: string;
}

export interface OwnerTenantBreakdownRow {
  tenantId: number;
  tenantName: string;
  tenantEmail: string;
  tenantPhone: string;
  propertyNames: string;
  unitNames: string;
  buildingNames: string;
  leaseStart: string;
  leaseEnd: string;
  monthlyPrice: number;
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
  financialDetails: OwnerFinancialDetailRow[];
  tenantBreakdown: OwnerTenantBreakdownRow[];
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
    { name: "Terisi", value: 0 },
    { name: "Belum Terisi", value: 0 },
  ],
  propertyBreakdown: [],
  monthlyDetails: [],
  financialDetails: [],
  tenantBreakdown: [],
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

const toMonthKey = (value: Date) => {
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  return `${value.getFullYear()}-${month}`;
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

  if (period === "lastMonth") {
    return {
      from: new Date(thisYear, now.getMonth() - 1, 1),
      to: new Date(thisYear, now.getMonth(), 0, 23, 59, 59),
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

const getBookingOwnerRevenue = (booking: OwnerManualRentalBooking) => {
  const amount = Number(booking.settlement?.owner_amount || 0);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
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
        const [allBookings, cashflowPayload, propertyReportsResponse] =
          await Promise.all([
          loadAllOwnerBookings(),
          loadAllOwnerCashflows(
            toDateParam(periodRange.from),
            toDateParam(periodRange.to),
          ),
          getOwnerPropertyReports({
            date_from: toDateParam(periodRange.from),
            date_to: toDateParam(periodRange.to),
          }),
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
        const ownerScopedCashflows = postedCashflows.filter(
          (entry) => entry.account_scope === "owner",
        );
        const shouldFallbackToSettlements = ownerScopedCashflows.length === 0;
        const propertyReports = propertyReportsResponse.data;
        const tenantByUnitId = new Map<
          number,
          NonNullable<OwnerPropertyReportUnit["tenant"]>
        >();
        propertyReports.forEach((property) => {
          property.units.forEach((unit) => {
            if (unit.tenant) {
              tenantByUnitId.set(unit.id, unit.tenant);
            }
          });
        });

        const cashflowFinancialDetails: OwnerFinancialDetailRow[] =
          shouldFallbackToSettlements
            ? bookings
                .filter(
                  (booking) =>
                    booking.status === "approved" &&
                    getBookingOwnerRevenue(booking) > 0,
                )
                .map((booking) => {
                  const date =
                    parseDate(booking.created_at) ||
                    parseDate(booking.start_date) ||
                    periodRange.from;
                  const propertyId = Number(booking.property?.id || 0);
                  const unitId = Number(booking.unit?.id || 0);
                  const currentTenant = tenantByUnitId.get(unitId);

                  return {
                    id: `booking-${booking.id}`,
                    direction: "inflow" as const,
                    amount: getBookingOwnerRevenue(booking),
                    occurredOn: date.toISOString(),
                    periodKey: toMonthKey(date),
                    propertyId,
                    unitId,
                    tenantId: Number(
                      booking.tenant?.id || currentTenant?.id || 0,
                    ),
                    tenantName:
                      booking.tenant?.full_name ||
                      currentTenant?.full_name ||
                      "-",
                    propertyName:
                      booking.property?.name ||
                      (propertyId ? `Properti #${propertyId}` : "Tanpa properti"),
                    unitName: getTenantUnitDisplayName(booking.unit),
                    bookingCode: booking.booking_code || "-",
                    entryType: "owner_income",
                    description: `Pendapatan pemesanan ${booking.booking_code || `#${booking.id}`}`,
                  };
                })
            : ownerScopedCashflows
                .filter(
                  (entry) =>
                    entry.direction === "inflow" || entry.direction === "outflow",
                )
                .map((entry) => {
                  const date =
                    parseDate(entry.occurred_on) ||
                    parseDate(entry.created_at) ||
                    periodRange.from;
                  const propertyId = Number(entry.property?.id || 0);
                  const unitId = Number(entry.unit?.id || 0);
                  const currentTenant = tenantByUnitId.get(unitId);

                  return {
                    id: `cashflow-${entry.id}`,
                    direction: entry.direction as "inflow" | "outflow",
                    amount: Number(entry.amount || 0),
                    occurredOn: date.toISOString(),
                    periodKey: toMonthKey(date),
                    propertyId,
                    unitId,
                    tenantId: Number(
                      entry.tenant?.id || currentTenant?.id || 0,
                    ),
                    tenantName:
                      entry.tenant?.full_name ||
                      currentTenant?.full_name ||
                      "-",
                    propertyName:
                      entry.property?.name ||
                      entry.rental_booking?.property_name ||
                      (propertyId ? `Properti #${propertyId}` : "Tanpa properti"),
                    unitName:
                      entry.unit?.name || entry.rental_booking?.unit_name || "-",
                    bookingCode: entry.rental_booking?.booking_code || "-",
                    entryType: entry.entry_type || "-",
                    description: entry.description || entry.notes || "-",
                  };
                });

        const mirroredTransactionIds = new Set<number>();
        ownerScopedCashflows.forEach((entry) => {
          const match = entry.description?.match(/Transaksi keuangan #(\d+)/i);
          if (match?.[1]) {
            mirroredTransactionIds.add(Number(match[1]));
          }
        });
        const bookingIdsWithSettlement = new Set(
          bookings
            .filter(
              (booking) =>
                booking.status === "approved" &&
                getBookingOwnerRevenue(booking) > 0,
            )
            .map((booking) => booking.id),
        );
        const legacyFinancialDetails: OwnerFinancialDetailRow[] = propertyReports
          .flatMap((property) =>
            property.financial_entries
              .filter(
                (entry) =>
                  !mirroredTransactionIds.has(entry.id) &&
                  (!entry.rental_booking?.id ||
                    !bookingIdsWithSettlement.has(entry.rental_booking.id)),
              )
              .map((entry) => {
                const date = parseDate(entry.occurred_on) || periodRange.from;
                const unitId = Number(entry.unit?.id || 0);
                const currentTenant = tenantByUnitId.get(unitId);

                return {
                  id: `financial-${entry.id}`,
                  direction: entry.direction,
                  amount: Number(entry.amount || 0),
                  occurredOn: date.toISOString(),
                  periodKey: toMonthKey(date),
                  propertyId: property.id,
                  unitId,
                  tenantId: Number(
                    entry.tenant?.id || currentTenant?.id || 0,
                  ),
                  tenantName:
                    entry.tenant?.full_name ||
                    currentTenant?.full_name ||
                    "-",
                  propertyName: property.name,
                  unitName: entry.unit?.name || "Operasional properti",
                  bookingCode: entry.rental_booking?.booking_code || "-",
                  entryType: "financial_transaction",
                  description: entry.description || entry.notes || "-",
                };
              }),
          );
        const financialDetails = [
          ...cashflowFinancialDetails,
          ...legacyFinancialDetails,
        ].sort(
          (a, b) =>
            new Date(b.occurredOn).getTime() - new Date(a.occurredOn).getTime(),
        );

        const propertyNameById = new Map<number, string>(
          propertyReports.map((property) => [property.id, property.name]),
        );
        bookings.forEach((item) => {
          const propertyId = Number(item.property?.id || 0);
          if (!propertyId) {
            return;
          }

          propertyNameById.set(
            propertyId,
            item.property?.name || `Properti #${propertyId}`,
          );
        });
        postedCashflows.forEach((item) => {
          const propertyId = Number(item.property?.id || 0);
          if (!propertyId) {
            return;
          }

          propertyNameById.set(
            propertyId,
            item.property?.name || `Properti #${propertyId}`,
          );
        });

        const totalBookings = bookings.length;
        const activeBookings = bookings.filter(
          (item) => item.occupancy_status === "aktif",
        ).length;
        const totalOwnedUnits = propertyReports.reduce(
          (sum, property) => sum + Number(property.total_units || 0),
          0,
        );
        const occupiedOwnedUnits = propertyReports.reduce(
          (sum, property) => sum + Number(property.occupied_units || 0),
          0,
        );
        const pendingBookings = bookings.filter((item) =>
          ["awaiting_payment", "pending_review"].includes(item.status),
        ).length;
        const approvedBookings = bookings.filter(
          (item) => item.status === "approved",
        ).length;
        const occupancyRate =
          totalOwnedUnits > 0
            ? Math.round((occupiedOwnedUnits / totalOwnedUnits) * 1000) / 10
            : 0;

        const totalRevenue = financialDetails
          .filter((entry) => entry.direction === "inflow")
          .reduce((sum, entry) => sum + entry.amount, 0);
        const totalExpense = financialDetails
          .filter((entry) => entry.direction === "outflow")
          .reduce((sum, entry) => sum + entry.amount, 0);
        const netProfit = totalRevenue - totalExpense;

        const monthlyCashflowMap = new Map<
          string,
          {
            sortValue: number;
            month: string;
            pemasukan: number;
            pengeluaran: number;
          }
        >();

        financialDetails.forEach((entry) => {
          const date = parseDate(entry.occurredOn);
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
            existing.pemasukan += entry.amount;
          } else {
            existing.pengeluaran += entry.amount;
          }
          monthlyCashflowMap.set(key, existing);
        });

        const revenueData: RevenueData[] = Array.from(
          monthlyCashflowMap.values(),
        )
          .sort((a, b) => a.sortValue - b.sortValue)
          .map((item) => ({
            month: item.month,
            pemasukan: item.pemasukan,
            pengeluaran: item.pengeluaran,
          }));

        const activePercent =
          totalOwnedUnits > 0
            ? Math.round((occupiedOwnedUnits / totalOwnedUnits) * 100)
            : 0;
        const occupancyData: OccupancyData[] = [
          { name: "Terisi", value: activePercent },
          { name: "Belum Terisi", value: Math.max(0, 100 - activePercent) },
        ];

        const bookingSummaryByProperty = new Map<
          number,
          {
            propertyName: string;
            totalBookings: number;
            activeBookings: number;
          }
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
        financialDetails.forEach((entry) => {
          if (!entry.propertyId) {
            return;
          }

          const existing = cashflowSummaryByProperty.get(entry.propertyId) || {
            revenue: 0,
            expense: 0,
          };

          if (entry.direction === "inflow") {
            existing.revenue += entry.amount;
          } else {
            existing.expense += entry.amount;
          }

          cashflowSummaryByProperty.set(entry.propertyId, existing);
        });

        const propertyIds = new Set<number>([
          ...propertyReports.map((property) => property.id),
          ...Array.from(bookingSummaryByProperty.keys()),
          ...Array.from(cashflowSummaryByProperty.keys()),
        ]);

        const propertyBreakdown: OwnerPropertyBreakdownRow[] = Array.from(
          propertyIds,
        )
          .map((propertyId) => {
            const propertyReport = propertyReports.find(
              (property) => property.id === propertyId,
            );
            const bookingSummary = bookingSummaryByProperty.get(propertyId) || {
              propertyName:
                propertyNameById.get(propertyId) || `Properti #${propertyId}`,
              totalBookings: 0,
              activeBookings: 0,
            };
            const cashflowSummary = cashflowSummaryByProperty.get(
              propertyId,
            ) || {
              revenue: 0,
              expense: 0,
            };

            const propertyOccupancyRate = propertyReport?.total_units
              ? Math.round(
                  (propertyReport.occupied_units / propertyReport.total_units) *
                    1000,
                ) / 10
              : 0;

            return {
              propertyId,
              propertyName:
                propertyReport?.name || bookingSummary.propertyName,
              totalUnits: Number(propertyReport?.total_units || 0),
              occupiedUnits: Number(propertyReport?.occupied_units || 0),
              vacantUnits: Number(propertyReport?.vacant_units || 0),
              maintenanceUnits: Number(
                propertyReport?.maintenance_units || 0,
              ),
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
            parseDate(booking.created_at) ||
            parseDate(booking.start_date) ||
            null;
          if (!propertyId || !date) {
            return;
          }

          const sortValue = date.getFullYear() * 100 + (date.getMonth() + 1);
          const key = `${sortValue}-${propertyId}`;
          const existing = monthlyDetailMap.get(key) || {
            propertyId,
            periodKey: toMonthKey(date),
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

        financialDetails.forEach((entry) => {
          const propertyId = entry.propertyId;
          const date = parseDate(entry.occurredOn);
          if (!propertyId || !date) {
            return;
          }

          const sortValue = date.getFullYear() * 100 + (date.getMonth() + 1);
          const key = `${sortValue}-${propertyId}`;
          const existing = monthlyDetailMap.get(key) || {
            propertyId,
            periodKey: toMonthKey(date),
            period: formatMonth(date),
            propertyName:
              propertyNameById.get(propertyId) || `Properti #${propertyId}`,
            totalBookings: 0,
            activeBookings: 0,
            occupancyRate: 0,
            revenue: 0,
            expense: 0,
            profit: 0,
            sortValue,
          };

          if (entry.direction === "inflow") {
            existing.revenue += entry.amount;
          } else {
            existing.expense += entry.amount;
          }

          monthlyDetailMap.set(key, existing);
        });

        const monthlyDetails: OwnerMonthlyDetailRow[] = Array.from(
          monthlyDetailMap.values(),
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
                ? Math.round((row.activeBookings / row.totalBookings) * 1000) /
                  10
                : 0;

            return {
              propertyId: row.propertyId,
              periodKey: row.periodKey,
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

        const cashflowSummaryByTenant = new Map<
          number,
          { revenue: number; expense: number }
        >();
        financialDetails.forEach((entry) => {
          if (!entry.tenantId) {
            return;
          }

          const existing = cashflowSummaryByTenant.get(entry.tenantId) || {
            revenue: 0,
            expense: 0,
          };
          if (entry.direction === "inflow") {
            existing.revenue += entry.amount;
          } else {
            existing.expense += entry.amount;
          }
          cashflowSummaryByTenant.set(entry.tenantId, existing);
        });

        type TenantAggregate = {
          tenantId: number;
          tenantName: string;
          tenantEmail: string;
          tenantPhone: string;
          propertyNames: Set<string>;
          unitNames: Set<string>;
          buildingNames: Set<string>;
          leaseStarts: string[];
          leaseEnds: string[];
          monthlyPrice: number;
        };
        const tenantAggregateMap = new Map<number, TenantAggregate>();

        propertyReports.forEach((property) => {
          property.units.forEach((unit) => {
            const tenant = unit.tenant;
            if (!tenant) {
              return;
            }

            const existing = tenantAggregateMap.get(tenant.id) || {
              tenantId: tenant.id,
              tenantName: tenant.full_name || "-",
              tenantEmail: tenant.email || "-",
              tenantPhone: tenant.phone_number || "-",
              propertyNames: new Set<string>(),
              unitNames: new Set<string>(),
              buildingNames: new Set<string>(),
              leaseStarts: [],
              leaseEnds: [],
              monthlyPrice: 0,
            };

            existing.propertyNames.add(property.name);
            existing.unitNames.add(unit.name);
            existing.buildingNames.add(unit.building_name || "-");
            existing.monthlyPrice += Number(unit.price || 0);
            if (tenant.lease_start) {
              existing.leaseStarts.push(tenant.lease_start);
            }
            if (tenant.lease_end) {
              existing.leaseEnds.push(tenant.lease_end);
            }
            tenantAggregateMap.set(tenant.id, existing);
          });
        });

        const tenantBreakdown: OwnerTenantBreakdownRow[] = Array.from(
          tenantAggregateMap.values(),
        )
          .map((tenant) => {
            const cashflowSummary = cashflowSummaryByTenant.get(
              tenant.tenantId,
            ) || {
              revenue: 0,
              expense: 0,
            };

            return {
              tenantId: tenant.tenantId,
              tenantName: tenant.tenantName,
              tenantEmail: tenant.tenantEmail,
              tenantPhone: tenant.tenantPhone,
              propertyNames: Array.from(tenant.propertyNames)
                .sort((a, b) => a.localeCompare(b, "id"))
                .join(", "),
              unitNames: Array.from(tenant.unitNames)
                .sort((a, b) => a.localeCompare(b, "id"))
                .join(", "),
              buildingNames: Array.from(tenant.buildingNames)
                .sort((a, b) => a.localeCompare(b, "id"))
                .join(", "),
              leaseStart: tenant.leaseStarts.sort()[0] || "-",
              leaseEnd: tenant.leaseEnds.sort().at(-1) || "-",
              monthlyPrice: tenant.monthlyPrice,
              revenue: cashflowSummary.revenue,
              expense: cashflowSummary.expense,
              profit: cashflowSummary.revenue - cashflowSummary.expense,
            };
          })
          .sort((a, b) => {
            const nameOrder = a.tenantName.localeCompare(b.tenantName, "id");
            return nameOrder || a.tenantId - b.tenantId;
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
            totalProperty: propertyReports.length,
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
          financialDetails,
          tenantBreakdown,
          latestBookings,
        });
      } catch (loadError) {
        if (!active) {
          return;
        }

        setError(
          getApiErrorMessage(
            loadError,
            "Data dashboard owner gagal dimuat. Silakan coba lagi.",
          ),
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
