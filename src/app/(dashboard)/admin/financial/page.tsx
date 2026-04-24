"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Filter,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import {
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import StatCard from "@/components/dashboard/admin/cards/StatCard";
import {
  buildPeriodParams,
  createAdminFinancialTransaction,
  deleteAdminFinancialTransaction,
  exportAdminFinancialTransactions,
  getAdminFinancialDashboard,
  getAdminFinancialTransactions,
  getAdminProperties,
  getAdminPropertyUnits,
  getApiErrorMessage,
  toAbsoluteAssetUrl,
  updateAdminFinancialTransaction,
  type AdminFinancialSummary,
  type AdminFinancialTransaction,
  type AdminPropertyListItem,
  type AdminPropertyUnitRow,
} from "@/lib/dashboard/admin.api";
import { hasFilterOption, uniqueFilterOptions } from "@/lib/filter-options";

const COLORS = [
  "#1E2746",
  "#3B4A8A",
  "#6D78C3",
  "#A7B0E5",
  "#E0C46C",
  "#16A34A",
];

const PAGE_SIZE = 10;

const categoryLabelMap: Record<string, string> = {
  income: "Pemasukan",
  expense: "Pengeluaran",
};

const formatDate = (value?: string | null) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const toDateInput = (value?: string | null) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
};

const formatCurrency = (value: number) =>
  `Rp ${Number(value || 0).toLocaleString("id-ID")}`;

const parseFilenameFromDisposition = (contentDisposition: string) => {
  const match = /filename="?([^"]+)"?/i.exec(contentDisposition || "");
  return match?.[1] || "financial-transactions.xls";
};

const initialSummary: AdminFinancialSummary = {
  total_revenue: 0,
  total_expenses: 0,
  net_operating_income: 0,
  outstanding_balances: 0,
};

type Notice = {
  variant: "success" | "error";
  message: string;
} | null;

type TransactionFormMode = "create" | "edit";

type TransactionFormState = {
  propertyId: string;
  unitId: string;
  category: "income" | "expense";
  transactionDate: string;
  amount: string;
  description: string;
  notes: string;
  receiptFile: File | null;
};

const getInitialForm = (propertyId = ""): TransactionFormState => ({
  propertyId,
  unitId: "",
  category: "income",
  transactionDate: new Date().toISOString().slice(0, 10),
  amount: "",
  description: "",
  notes: "",
  receiptFile: null,
});

export default function AdminFinancialPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [propertyFilter, setPropertyFilter] = useState("");
  const [period, setPeriod] = useState("year");
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");
  const [summary, setSummary] = useState<AdminFinancialSummary>(initialSummary);
  const [monthlyData, setMonthlyData] = useState<
    Array<{ month: string; revenue: number; expense: number }>
  >([]);
  const [categoryData, setCategoryData] = useState<Array<{ name: string; value: number }>>([]);
  const [transactions, setTransactions] = useState<AdminFinancialTransaction[]>([]);
  const [properties, setProperties] = useState<AdminPropertyListItem[]>([]);
  const [units, setUnits] = useState<AdminPropertyUnitRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [notice, setNotice] = useState<Notice>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<number | null>(null);
  const [viewTransaction, setViewTransaction] =
    useState<AdminFinancialTransaction | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<TransactionFormMode>("create");
  const [editingTransactionId, setEditingTransactionId] = useState<number | null>(null);
  const [form, setForm] = useState<TransactionFormState>(getInitialForm());
  const [isLoadingUnits, setIsLoadingUnits] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isChartReady, setIsChartReady] = useState(false);

  useEffect(() => {
    setIsChartReady(true);
  }, []);

  useEffect(() => {
    let active = true;

    const loadFinancialData = async () => {
      setIsLoading(true);
      setError(null);

      const periodParams = buildPeriodParams(period);

      try {
        const [dashboardResponse, transactionResponse, propertiesResponse] =
          await Promise.all([
            getAdminFinancialDashboard(periodParams),
            getAdminFinancialTransactions({
              ...periodParams,
              page: 1,
              per_page: 100,
            }),
            getAdminProperties({
              page: 1,
              per_page: 100,
            }),
          ]);

        if (!active) {
          return;
        }

        setSummary(dashboardResponse.data.summary);
        setMonthlyData(dashboardResponse.data.charts.monthly_revenue_vs_expense);
        setCategoryData(
          dashboardResponse.data.charts.revenue_breakdown_by_category.map((item) => ({
            name: item.category,
            value: item.amount,
          }))
        );
        setTransactions(transactionResponse.data);
        setProperties(propertiesResponse.data);
      } catch (loadError) {
        if (!active) {
          return;
        }

        setError(
          getApiErrorMessage(
            loadError,
            "Laporan keuangan gagal dimuat. Silakan coba lagi."
          )
        );
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadFinancialData();

    return () => {
      active = false;
    };
  }, [period, refreshKey]);

  const categoryFilterOptions = useMemo(
    () =>
      uniqueFilterOptions(
        transactions,
        (transaction) => transaction.category,
        (value) => categoryLabelMap[value]
      ),
    [transactions]
  );

  const propertyFilterOptions = useMemo(
    () =>
      uniqueFilterOptions(
        transactions,
        (transaction) => transaction.property.id || null,
        (value, transaction) =>
          transaction.property_label || transaction.property.name || `Properti #${value}`
      ),
    [transactions]
  );

  const filteredTransactions = useMemo(() => {
    const filtered = transactions.filter((transaction) => {
      const searchable = `${transaction.property_label} ${transaction.description}`.toLowerCase();
      return (
        searchable.includes(search.toLowerCase()) &&
        (category ? transaction.category === category : true) &&
        (propertyFilter
          ? String(transaction.property.id || "") === propertyFilter
          : true)
      );
    });

    return filtered.sort((a, b) => {
      const dateA = new Date(a.transaction_date || a.created_at || 0).getTime();
      const dateB = new Date(b.transaction_date || b.created_at || 0).getTime();

      if (sortBy === "oldest") {
        return dateA - dateB;
      }

      return dateB - dateA;
    });
  }, [transactions, search, category, propertyFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / PAGE_SIZE));
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const pagedTransactions = filteredTransactions.slice(
    startIndex,
    startIndex + PAGE_SIZE
  );

  const editingTransaction = useMemo(
    () => transactions.find((item) => item.id === editingTransactionId) || null,
    [transactions, editingTransactionId]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search, category, propertyFilter, sortBy]);

  useEffect(() => {
    if (!hasFilterOption(categoryFilterOptions, category)) {
      setCategory("");
    }
  }, [category, categoryFilterOptions]);

  useEffect(() => {
    if (!hasFilterOption(propertyFilterOptions, propertyFilter)) {
      setPropertyFilter("");
    }
  }, [propertyFilter, propertyFilterOptions]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const loadUnitsByProperty = async (propertyId: string, selectedUnitId = "") => {
    if (!propertyId) {
      setUnits([]);
      setForm((prev) => ({ ...prev, unitId: "" }));
      return;
    }

    setIsLoadingUnits(true);
    try {
      const response = await getAdminPropertyUnits(propertyId, {
        page: 1,
        per_page: 100,
      });
      setUnits(response.data);
      setForm((prev) => ({
        ...prev,
        unitId: selectedUnitId || "",
      }));
    } catch {
      setUnits([]);
    } finally {
      setIsLoadingUnits(false);
    }
  };

  const openCreateModal = () => {
    setNotice(null);
    setFormMode("create");
    setEditingTransactionId(null);
    setFormError(null);
    const firstPropertyId = properties[0] ? String(properties[0].id) : "";
    setForm(getInitialForm(firstPropertyId));
    setUnits([]);
    setIsFormOpen(true);
    if (firstPropertyId) {
      void loadUnitsByProperty(firstPropertyId);
    }
  };

  const openEditModal = (transaction: AdminFinancialTransaction) => {
    setNotice(null);
    setFormMode("edit");
    setEditingTransactionId(transaction.id);
    setFormError(null);
    const propertyId = transaction.property.id
      ? String(transaction.property.id)
      : "";
    const unitId = transaction.unit.id ? String(transaction.unit.id) : "";
    setForm({
      propertyId,
      unitId,
      category: transaction.category,
      transactionDate: toDateInput(transaction.transaction_date),
      amount: String(transaction.amount ?? ""),
      description: transaction.description || "",
      notes: transaction.notes || "",
      receiptFile: null,
    });
    setUnits([]);
    setIsFormOpen(true);
    if (propertyId) {
      void loadUnitsByProperty(propertyId, unitId);
    }
  };

  const closeFormModal = () => {
    if (isSubmitting) {
      return;
    }
    setIsFormOpen(false);
  };

  const handleSaveTransaction = async () => {
    const propertyId = Number(form.propertyId);
    const amount = Number(form.amount);
    const description = form.description.trim();

    if (!propertyId) {
      setFormError("Pilih properti terlebih dahulu.");
      return;
    }

    if (!form.transactionDate) {
      setFormError("Tanggal transaksi wajib diisi.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError("Jumlah transaksi harus lebih dari 0.");
      return;
    }

    if (description.length < 10) {
      setFormError("Deskripsi minimal 10 karakter.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    setNotice(null);

    try {
      const payload = {
        property_id: propertyId,
        ...(form.unitId ? { unit_id: Number(form.unitId) } : {}),
        category: form.category,
        transaction_date: form.transactionDate,
        amount,
        description,
        notes: form.notes.trim() || undefined,
        receipt: form.receiptFile,
      };

      if (formMode === "create") {
        await createAdminFinancialTransaction(payload);
        setNotice({
          variant: "success",
          message: "Transaksi berhasil ditambahkan.",
        });
      } else {
        if (!editingTransactionId) {
          throw new Error("Data transaksi tidak ditemukan.");
        }

        await updateAdminFinancialTransaction(editingTransactionId, payload);
        setNotice({
          variant: "success",
          message: "Transaksi berhasil diperbarui.",
        });
      }

      setIsFormOpen(false);
      setRefreshKey((prev) => prev + 1);
    } catch (saveError) {
      setFormError(
        getApiErrorMessage(saveError, "Gagal menyimpan transaksi keuangan.")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTransaction = async (transaction: AdminFinancialTransaction) => {
    const agreed = window.confirm(
      `Hapus transaksi "${transaction.description}"? Tindakan ini tidak bisa dibatalkan.`
    );
    if (!agreed) {
      return;
    }

    setIsDeletingId(transaction.id);
    setNotice(null);

    try {
      await deleteAdminFinancialTransaction(transaction.id);
      setNotice({
        variant: "success",
        message: "Transaksi berhasil dihapus.",
      });
      setRefreshKey((prev) => prev + 1);
    } catch (deleteError) {
      setNotice({
        variant: "error",
        message: getApiErrorMessage(deleteError, "Gagal menghapus transaksi."),
      });
    } finally {
      setIsDeletingId(null);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    setNotice(null);

    try {
      const result = await exportAdminFinancialTransactions({
        ...buildPeriodParams(period),
        search,
        category,
      });

      const fileName = parseFilenameFromDisposition(result.contentDisposition);
      const blobUrl = URL.createObjectURL(result.blob);
      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(blobUrl);

      setNotice({
        variant: "success",
        message: "Data keuangan berhasil diekspor.",
      });
    } catch (exportError) {
      setNotice({
        variant: "error",
        message: getApiErrorMessage(exportError, "Gagal mengekspor data."),
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-7">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-[#1E2746] via-[#273965] to-[#2C62A5] p-6 text-white shadow-sm">
        <div className="pointer-events-none absolute -left-12 top-0 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -right-12 bottom-0 h-44 w-44 rounded-full bg-white/10 blur-3xl" />

        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="inline-flex rounded-full border border-white/35 bg-white/10 px-3 py-1 text-xs font-medium">
              Modul Keuangan
            </p>
            <h1 className="mt-3 text-2xl font-semibold md:text-3xl">
              Kelola Laporan Keuangan
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-white/85">
              Pantau arus kas, analisis pemasukan dan pengeluaran, serta kelola
              transaksi properti.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                void handleExport();
              }}
              disabled={isExporting}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-[#1E2746] hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Download size={16} />
              {isExporting ? "Mengekspor..." : "Ekspor CSV"}
            </button>
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/45 bg-white/10 px-4 text-sm font-semibold text-white hover:bg-white/20"
            >
              <Plus size={16} />
              Tambah Transaksi
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
          <div className="relative min-w-[240px] flex-1">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              placeholder="Cari properti atau deskripsi transaksi..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm focus:border-blue-400 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="relative min-w-[170px]">
            <Filter
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm focus:border-blue-400 focus:bg-white focus:outline-none"
            >
              <option value="">Semua Kategori</option>
              {categoryFilterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <select
            value={propertyFilter}
            onChange={(event) => setPropertyFilter(event.target.value)}
            className="h-11 min-w-[220px] rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm focus:border-blue-400 focus:bg-white focus:outline-none"
          >
            <option value="">Semua Properti</option>
            {propertyFilterOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
            className="h-11 min-w-[170px] rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm focus:border-blue-400 focus:bg-white focus:outline-none"
          >
            <option value="year">Tahun Ini</option>
            <option value="month">Bulan Ini</option>
            <option value="quarter">3 Bulan Terakhir</option>
            <option value="lastYear">Tahun Lalu</option>
          </select>

          <select
            value={sortBy}
            onChange={(event) =>
              setSortBy(event.target.value as "newest" | "oldest")
            }
            className="h-11 min-w-[150px] rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm focus:border-blue-400 focus:bg-white focus:outline-none"
          >
            <option value="newest">Terbaru</option>
            <option value="oldest">Terlama</option>
          </select>

          <button
            type="button"
            onClick={() => {
              setSearch("");
              setCategory("");
              setPropertyFilter("");
              setSortBy("newest");
              setCurrentPage(1);
            }}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <RotateCcw size={14} />
            Atur Ulang
          </button>

        </div>

        <p className="mt-3 text-xs text-slate-500">
          Menampilkan <span className="font-semibold">{filteredTransactions.length}</span>{" "}
          dari <span className="font-semibold">{transactions.length}</span> transaksi.
        </p>
      </section>

      {notice && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            notice.variant === "success"
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {notice.message}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Pemasukan"
          value={isLoading ? "..." : formatCurrency(summary.total_revenue)}
          icon={<Wallet size={20} />}
        />

        <StatCard
          title="Total Pengeluaran"
          value={isLoading ? "..." : formatCurrency(summary.total_expenses)}
          icon={<ArrowDownCircle size={20} />}
        />

        <StatCard
          title="Pendapatan Bersih"
          value={isLoading ? "..." : formatCurrency(summary.net_operating_income)}
          icon={<TrendingUp size={20} />}
        />

        <StatCard
          title="Tagihan Tertunggak"
          value={isLoading ? "..." : formatCurrency(summary.outstanding_balances)}
          icon={<FileText size={20} />}
        />
      </div>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="h-[380px] rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-1 font-semibold text-slate-800">
            Pemasukan vs Pengeluaran Bulanan
          </h2>
          <p className="mb-4 text-xs text-slate-500">
            Tren bulanan berdasarkan periode laporan yang dipilih.
          </p>

          {isChartReady ? (
            monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="84%">
                <LineChart data={monthlyData}>
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#16A34A"
                    strokeWidth={2}
                    name="Pemasukan"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="expense"
                    stroke="#DC2626"
                    strokeWidth={2}
                    name="Pengeluaran"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[84%] items-center justify-center rounded-xl border border-dashed border-slate-200 text-sm text-slate-500">
                Belum ada data grafik untuk periode ini.
              </div>
            )
          ) : (
            <div className="h-[84%] animate-pulse rounded-xl bg-slate-100" />
          )}
        </div>

        <div className="h-[380px] rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-1 font-semibold text-slate-800">Komposisi Pendapatan</h2>
          <p className="mb-4 text-xs text-slate-500">
            Distribusi pendapatan berdasarkan kategori transaksi.
          </p>

          {isChartReady ? (
            categoryData.length > 0 ? (
              <div className="grid h-[84%] grid-cols-1 gap-3 md:grid-cols-[1fr,180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={100}
                    >
                      {categoryData.map((item, index) => (
                        <Cell key={item.name} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>

                <div className="space-y-2 overflow-y-auto pr-1">
                  {categoryData.map((item, index) => (
                    <div
                      key={`${item.name}-${index}`}
                      className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                    >
                      <span className="inline-flex items-center gap-2 text-slate-600">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        {item.name}
                      </span>
                      <span className="font-semibold text-slate-700">
                        {formatCurrency(item.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex h-[84%] items-center justify-center rounded-xl border border-dashed border-slate-200 text-sm text-slate-500">
                Belum ada data komposisi pendapatan.
              </div>
            )
          ) : (
            <div className="h-[84%] animate-pulse rounded-xl bg-slate-100" />
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-800">Daftar Transaksi</h2>
          <p className="text-xs text-slate-500">Total: {filteredTransactions.length}</p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="p-3 text-left">Tanggal</th>
                <th className="p-3 text-left">Properti</th>
                <th className="p-3 text-left">Deskripsi</th>
                <th className="p-3 text-left">Jumlah</th>
                <th className="p-3 text-left">Kategori</th>
                <th className="p-3 text-left">Lampiran</th>
                <th className="p-3 text-left">Aksi</th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-500">
                    Memuat data transaksi...
                  </td>
                </tr>
              ) : pagedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-500">
                    Tidak ada transaksi.
                  </td>
                </tr>
              ) : (
                pagedTransactions.map((transaction) => (
                  <tr key={transaction.id} className="border-t border-slate-100">
                    <td className="p-3 text-slate-700">
                      {formatDate(transaction.transaction_date)}
                    </td>

                    <td className="p-3">
                      <p className="font-medium text-slate-700">
                        {transaction.property_label || "-"}
                      </p>
                      <p className="text-xs text-slate-500">
                        Unit: {transaction.unit.name || "-"}
                      </p>
                    </td>

                    <td className="p-3">
                      <p className="max-w-[300px] truncate text-slate-700">
                        {transaction.description}
                      </p>
                      {transaction.notes ? (
                        <p className="max-w-[300px] truncate text-xs text-slate-500">
                          Catatan: {transaction.notes}
                        </p>
                      ) : null}
                    </td>

                    <td className="p-3 font-semibold text-slate-800">
                      {formatCurrency(transaction.amount)}
                    </td>

                    <td className="p-3">
                      <CategoryBadge category={transaction.category} />
                    </td>

                    <td className="p-3">
                      {transaction.receipt_url ? (
                        <a
                          href={
                            toAbsoluteAssetUrl(transaction.receipt_url) ||
                            transaction.receipt_url
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          Lihat
                        </a>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setViewTransaction(transaction)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:border-green-200 hover:bg-green-50 hover:text-green-700"
                          title="Lihat detail"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(transaction)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                          title="Ubah transaksi"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            void handleDeleteTransaction(transaction);
                          }}
                          disabled={isDeletingId === transaction.id}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                          title="Hapus transaksi"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 p-4 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
          <p>
            Menampilkan{" "}
            <span className="font-semibold text-slate-700">
              {filteredTransactions.length === 0 ? 0 : startIndex + 1}
            </span>
            {" - "}
            <span className="font-semibold text-slate-700">
              {Math.min(startIndex + PAGE_SIZE, filteredTransactions.length)}
            </span>{" "}
            dari{" "}
            <span className="font-semibold text-slate-700">
              {filteredTransactions.length}
            </span>{" "}
            transaksi
          </p>

          <div className="inline-flex items-center gap-2 self-start">
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft size={14} />
              Sebelumnya
            </button>
            <span className="min-w-[88px] text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
              Hal. {currentPage}/{totalPages}
            </span>
            <button
              type="button"
              onClick={() =>
                setCurrentPage((prev) => Math.min(totalPages, prev + 1))
              }
              disabled={currentPage === totalPages}
              className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Selanjutnya
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </section>

      {viewTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-800">Detail Transaksi</h2>
              <button
                type="button"
                onClick={() => setViewTransaction(null)}
                className="rounded-lg p-2 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 px-6 py-5 text-sm">
              <div className="mb-1 rounded-xl border border-slate-100 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Transaksi #{viewTransaction.id}
                </p>
                <p className="mt-1 font-semibold text-slate-800">
                  {viewTransaction.description || "-"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {viewTransaction.property.name || "-"} • Unit{" "}
                  {viewTransaction.unit.name || "-"}
                </p>
              </div>
              <DetailRow label="Tanggal" value={formatDate(viewTransaction.transaction_date)} />
              <DetailRow
                label="Kategori"
                value={toCategoryLabel(viewTransaction.category)}
              />
              <DetailRow
                label="Properti"
                value={viewTransaction.property.name || "-"}
              />
              <DetailRow label="Unit" value={viewTransaction.unit.name || "-"} />
              <DetailRow
                label="Jumlah"
                value={formatCurrency(viewTransaction.amount)}
              />
              <DetailRow label="Deskripsi" value={viewTransaction.description || "-"} />
              <DetailRow label="Catatan" value={viewTransaction.notes || "-"} />
              <DetailRow
                label="Dibuat Oleh"
                value={viewTransaction.created_by.full_name || "-"}
              />

              {viewTransaction.receipt_url && (
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-2">
                  <span className="font-medium text-slate-600">Bukti Transaksi</span>
                  <a
                    href={
                      toAbsoluteAssetUrl(viewTransaction.receipt_url) ||
                      viewTransaction.receipt_url
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="text-right text-blue-600 hover:underline"
                  >
                    Lihat Lampiran
                  </a>
                </div>
              )}
            </div>

            <div className="flex justify-end border-t bg-slate-50 px-6 py-4">
              <button
                type="button"
                onClick={() => setViewTransaction(null)}
                className="h-11 rounded-xl bg-[#1E2746] px-6 font-medium text-white hover:bg-[#141B35]"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-800">
                {formMode === "create" ? "Tambah Transaksi" : "Ubah Transaksi"}
              </h2>
              <button
                type="button"
                onClick={closeFormModal}
                disabled={isSubmitting}
                className="rounded-lg p-2 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Properti
                </label>
                <select
                  value={form.propertyId}
                  onChange={(event) => {
                    const nextPropertyId = event.target.value;
                    setForm((prev) => ({
                      ...prev,
                      propertyId: nextPropertyId,
                      unitId: "",
                    }));
                    void loadUnitsByProperty(nextPropertyId);
                  }}
                  className="h-11 w-full rounded-xl border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E2746]"
                >
                  <option value="">Pilih properti</option>
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Unit (Opsional)
                </label>
                <select
                  value={form.unitId}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, unitId: event.target.value }))
                  }
                  disabled={!form.propertyId || isLoadingUnits}
                  className="h-11 w-full rounded-xl border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E2746] disabled:cursor-not-allowed disabled:bg-slate-100"
                >
                  <option value="">
                    {isLoadingUnits ? "Memuat unit..." : "Tanpa unit spesifik"}
                  </option>
                  {units.map((unit) => (
                    <option key={unit.unit_id} value={unit.unit_id}>
                      {unit.unit_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Kategori
                  </label>
                  <select
                    value={form.category}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        category: event.target.value as "income" | "expense",
                      }))
                    }
                    className="h-11 w-full rounded-xl border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E2746]"
                  >
                    <option value="income">Pemasukan</option>
                    <option value="expense">Pengeluaran</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Tanggal
                  </label>
                  <input
                    type="date"
                    value={form.transactionDate}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        transactionDate: event.target.value,
                      }))
                    }
                    className="h-11 w-full rounded-xl border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E2746]"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Jumlah
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.amount}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, amount: event.target.value }))
                  }
                  placeholder="Contoh: 1500000"
                  className="h-11 w-full rounded-xl border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E2746]"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Deskripsi
                </label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, description: event.target.value }))
                  }
                  placeholder="Tuliskan deskripsi transaksi (minimal 10 karakter)"
                  className="w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E2746]"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Catatan (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, notes: event.target.value }))
                  }
                  placeholder="Catatan tambahan"
                  className="w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E2746]"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Bukti Transaksi (Opsional)
                </label>
                <input
                  type="file"
                  accept="application/pdf,image/jpeg,image/jpg,image/png"
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      receiptFile: event.target.files?.[0] || null,
                    }))
                  }
                  className="text-sm"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Format: PDF, PNG, JPG, JPEG.
                </p>
                {formMode === "edit" && editingTransaction?.receipt_url ? (
                  <a
                    href={
                      toAbsoluteAssetUrl(editingTransaction.receipt_url) ||
                      editingTransaction.receipt_url
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex text-xs font-medium text-blue-600 hover:underline"
                  >
                    Lihat lampiran saat ini
                  </a>
                ) : null}
              </div>

              {formError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {formError}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t bg-slate-50 px-6 py-4">
              <button
                type="button"
                onClick={closeFormModal}
                disabled={isSubmitting}
                className="h-11 rounded-xl border px-5 font-medium hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleSaveTransaction();
                }}
                disabled={isSubmitting}
                className="h-11 rounded-xl bg-[#1E2746] px-6 font-medium text-white hover:bg-[#141B35] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function toCategoryLabel(category: "income" | "expense") {
  return categoryLabelMap[category] || category;
}

function CategoryBadge({ category }: { category: "income" | "expense" }) {
  const styles =
    category === "income"
      ? "border border-green-200 bg-green-50 text-green-700"
      : "border border-red-200 bg-red-50 text-red-700";

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${styles}`}>
      {toCategoryLabel(category)}
    </span>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-2">
      <span className="font-medium text-slate-600">{label}</span>
      <span className="max-w-[62%] break-words text-right text-slate-800">{value}</span>
    </div>
  );
}
