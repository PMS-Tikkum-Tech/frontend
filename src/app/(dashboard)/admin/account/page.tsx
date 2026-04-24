"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Filter,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  createAdminUser,
  deleteAdminUser,
  getAdminUsers,
  getApiErrorMessage,
  toAbsoluteAssetUrl,
  updateAdminUser,
  type AdminUser,
} from "@/lib/dashboard/admin.api";
import { hasFilterOption, uniqueFilterOptions } from "@/lib/filter-options";

const PAGE_SIZE = 10;

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

const roleLabelMap: Record<string, string> = {
  admin: "Administrator",
  owner: "Pemilik",
  tenant: "Penyewa",
  housekeeper: "Petugas Kebersihan",
  technician: "Teknisi",
};

const roleStyleMap: Record<string, string> = {
  admin: "bg-emerald-100 text-emerald-700",
  owner: "bg-blue-100 text-blue-700",
  tenant: "bg-amber-100 text-amber-700",
  housekeeper: "bg-cyan-100 text-cyan-700",
  technician: "bg-sky-100 text-sky-700",
};

const statusLabelMap: Record<string, string> = {
  active: "Aktif",
  inactive: "Nonaktif",
};

const statusStyleMap: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  inactive: "bg-red-100 text-red-700",
};

type Notice = {
  variant: "success" | "error";
  message: string;
} | null;

type FormMode = "create" | "edit";

type SortValue = "newest" | "oldest" | "name_asc" | "name_desc";

type UserRole = "admin" | "owner" | "tenant" | "housekeeper" | "technician";

type UserFormState = {
  fullName: string;
  email: string;
  phoneNumber: string;
  role: UserRole;
  accountStatus: "active" | "inactive";
  password: string;
};

const getInitialForm = (): UserFormState => ({
  fullName: "",
  email: "",
  phoneNumber: "",
  role: "tenant",
  accountStatus: "active",
  password: "",
});

const normalizeOptional = (value: string) => {
  const trimmed = value.trim();
  return trimmed || undefined;
};

const isOperationalRole = (role: string) =>
  role === "housekeeper" || role === "technician";

const getUserEmailDisplay = (user: AdminUser) =>
  isOperationalRole(user.role)
    ? "Data petugas - tanpa akses masuk"
    : user.email || "-";

const getCreatedTime = (user: AdminUser) => {
  const date = new Date(user.created_at || "");
  if (Number.isNaN(date.getTime())) {
    return user.id;
  }
  return date.getTime();
};

export default function AdminAccountPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [role, setRole] = useState("");
  const [sortBy, setSortBy] = useState<SortValue>("newest");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [notice, setNotice] = useState<Notice>(null);
  const [viewUser, setViewUser] = useState<AdminUser | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>("create");
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [form, setForm] = useState<UserFormState>(getInitialForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    let active = true;

    const loadUsers = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await getAdminUsers({
          page: 1,
          per_page: 100,
        });

        if (!active) {
          return;
        }

        setUsers(response.data);
      } catch (loadError) {
        if (!active) {
          return;
        }

        setError(
          getApiErrorMessage(loadError, "Data akun gagal dimuat. Coba lagi.")
        );
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadUsers();

    return () => {
      active = false;
    };
  }, [refreshKey]);

  const openCreateModal = () => {
    setNotice(null);
    setFormMode("create");
    setEditingUserId(null);
    setForm(getInitialForm());
    setFormError(null);
    setIsFormOpen(true);
  };

  const openEditModal = (user: AdminUser) => {
    setNotice(null);
    setFormMode("edit");
    setEditingUserId(user.id);
    setForm({
      fullName: user.full_name,
      email: isOperationalRole(user.role) ? "" : user.email,
      phoneNumber: user.phone_number || "",
      role: user.role,
      accountStatus: user.account_status,
      password: "",
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  const closeFormModal = () => {
    if (isSubmitting) {
      return;
    }

    setIsFormOpen(false);
    setFormError(null);
  };

  const handleSubmitForm = async () => {
    const fullName = form.fullName.trim();
    const email = form.email.trim();
    const password = form.password.trim();
    const operationalRole = isOperationalRole(form.role);

    if (!fullName) {
      setFormError("Nama wajib diisi.");
      return;
    }

    if (!operationalRole && !email) {
      setFormError("Nama dan email wajib diisi.");
      return;
    }

    if (formMode === "create" && !operationalRole && password.length < 8) {
      setFormError("Kata sandi minimal 8 karakter.");
      return;
    }

    if (formMode === "edit" && !operationalRole && password && password.length < 8) {
      setFormError("Kata sandi baru minimal 8 karakter.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    setNotice(null);

    try {
      if (formMode === "create") {
        await createAdminUser({
          full_name: fullName,
          phone_number: normalizeOptional(form.phoneNumber),
          role: form.role,
          account_status: form.accountStatus,
          ...(operationalRole ? {} : { email, password }),
        });

        setNotice({
          variant: "success",
          message: operationalRole
            ? "Data petugas berhasil ditambahkan."
            : "Akun berhasil ditambahkan.",
        });
      } else {
        if (!editingUserId) {
          throw new Error("Data akun tidak ditemukan.");
        }

        await updateAdminUser(editingUserId, {
          full_name: fullName,
          phone_number: normalizeOptional(form.phoneNumber),
          role: form.role,
          account_status: form.accountStatus,
          ...(operationalRole ? {} : { email }),
          ...(!operationalRole && password ? { password } : {}),
        });

        setNotice({
          variant: "success",
          message: operationalRole
            ? "Data petugas berhasil diperbarui."
            : "Data akun berhasil diperbarui.",
        });
      }

      setIsFormOpen(false);
      setRefreshKey((prev) => prev + 1);
    } catch (saveError) {
      setFormError(getApiErrorMessage(saveError, "Gagal menyimpan data akun."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (user: AdminUser) => {
    const agreed = window.confirm(
      `Hapus akun ${user.full_name}? Tindakan ini tidak bisa dibatalkan.`
    );

    if (!agreed) {
      return;
    }

    setIsDeletingId(user.id);
    setNotice(null);

    try {
      await deleteAdminUser(user.id);
      setNotice({
        variant: "success",
        message: "Akun berhasil dihapus.",
      });
      setRefreshKey((prev) => prev + 1);
    } catch (deleteError) {
      setNotice({
        variant: "error",
        message: getApiErrorMessage(deleteError, "Gagal menghapus akun."),
      });
    } finally {
      setIsDeletingId(null);
    }
  };

  const statusFilterOptions = useMemo(
    () =>
      uniqueFilterOptions(
        users,
        (user) => user.account_status,
        (value) => statusLabelMap[value]
      ),
    [users]
  );

  const roleFilterOptions = useMemo(
    () =>
      uniqueFilterOptions(
        users,
        (user) => user.role,
        (value) => roleLabelMap[value]
      ),
    [users]
  );

  const filteredUsers = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const nextUsers = users.filter((user) => {
      const searchable = `${user.full_name} ${user.email} ${
        roleLabelMap[user.role] || user.role
      } ${user.phone_number || ""}`.toLowerCase();
      return (
        searchable.includes(keyword) &&
        (status ? user.account_status === status : true) &&
        (role ? user.role === role : true)
      );
    });

    nextUsers.sort((a, b) => {
      if (sortBy === "name_asc") {
        return a.full_name.localeCompare(b.full_name, "id", { sensitivity: "base" });
      }

      if (sortBy === "name_desc") {
        return b.full_name.localeCompare(a.full_name, "id", { sensitivity: "base" });
      }

      if (sortBy === "oldest") {
        return getCreatedTime(a) - getCreatedTime(b);
      }

      return getCreatedTime(b) - getCreatedTime(a);
    });

    return nextUsers;
  }, [role, search, sortBy, status, users]);

  const summary = useMemo(() => {
    const activeCount = users.filter((user) => user.account_status === "active").length;
    const inactiveCount = users.length - activeCount;
    const adminOwnerCount = users.filter(
      (user) => user.role === "admin" || user.role === "owner"
    ).length;
    const tenantCount = users.filter((user) => user.role === "tenant").length;
    const operationalCount = users.filter((user) =>
      isOperationalRole(user.role)
    ).length;

    return {
      total: users.length,
      activeCount,
      inactiveCount,
      adminOwnerCount,
      tenantCount,
      operationalCount,
    };
  }, [users]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const pagedUsers = filteredUsers.slice(startIndex, startIndex + PAGE_SIZE);
  const showingFrom = filteredUsers.length > 0 ? startIndex + 1 : 0;
  const showingTo =
    filteredUsers.length > 0
      ? Math.min(startIndex + PAGE_SIZE, filteredUsers.length)
      : 0;
  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  useEffect(() => {
    setCurrentPage(1);
  }, [search, status, role, sortBy]);

  useEffect(() => {
    if (!hasFilterOption(statusFilterOptions, status)) {
      setStatus("");
    }
  }, [status, statusFilterOptions]);

  useEffect(() => {
    if (!hasFilterOption(roleFilterOptions, role)) {
      setRole("");
    }
  }, [role, roleFilterOptions]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const resetFilters = () => {
    setSearch("");
    setStatus("");
    setRole("");
    setSortBy("newest");
    setCurrentPage(1);
  };

  const formIsOperationalRole = isOperationalRole(form.role);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-r from-[#1E2746] to-[#2A3B78] p-5 text-white shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">Manajemen Akun</h1>
            <p className="text-sm text-blue-100">
              Kelola akses administrator, pemilik, penyewa, dan data petugas operasional.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            disabled={isSubmitting}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-[#1E2746] hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus size={17} />
            Tambah Akun
          </button>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          title="Total Akun"
          value={summary.total}
          caption="Seluruh akun terdaftar"
        />
        <SummaryCard
          title="Akun Aktif"
          value={summary.activeCount}
          caption={`${summary.inactiveCount} akun nonaktif`}
          tone="success"
        />
        <SummaryCard
          title="Administrator & Pemilik"
          value={summary.adminOwnerCount}
          caption="Akun pengelola sistem"
          tone="info"
        />
        <SummaryCard
          title="Penyewa"
          value={summary.tenantCount}
          caption="Akun penyewa aktif"
          tone="warning"
        />
        <SummaryCard
          title="Petugas"
          value={summary.operationalCount}
          caption="Petugas kebersihan & teknisi"
          tone="cyan"
        />
      </section>

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <Filter size={16} />
          Filter Akun
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="relative min-w-[240px] flex-1">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              placeholder="Cari nama, email, peran, atau nomor telepon"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-4 text-sm focus:border-[#1E2746] focus:outline-none focus:ring-2 focus:ring-[#1E2746]/20"
            />
          </label>

          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="h-11 rounded-xl border border-slate-200 px-4 text-sm focus:border-[#1E2746] focus:outline-none focus:ring-2 focus:ring-[#1E2746]/20"
          >
            <option value="">Semua Status</option>
            {statusFilterOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={role}
            onChange={(event) => setRole(event.target.value)}
            className="h-11 rounded-xl border border-slate-200 px-4 text-sm focus:border-[#1E2746] focus:outline-none focus:ring-2 focus:ring-[#1E2746]/20"
          >
            <option value="">Semua Peran</option>
            {roleFilterOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as SortValue)}
            className="h-11 rounded-xl border border-slate-200 px-4 text-sm focus:border-[#1E2746] focus:outline-none focus:ring-2 focus:ring-[#1E2746]/20"
          >
            <option value="newest">Urutkan: Terbaru</option>
            <option value="oldest">Urutkan: Terlama</option>
            <option value="name_asc">Urutkan: Nama A-Z</option>
            <option value="name_desc">Urutkan: Nama Z-A</option>
          </select>

          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Atur Ulang
          </button>

        </div>
      </section>

      {notice && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            notice.variant === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
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

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[960px] w-full text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="p-4 text-left font-semibold">Nama</th>
                <th className="p-4 text-left font-semibold">Peran</th>
                <th className="p-4 text-left font-semibold">Telepon</th>
                <th className="p-4 text-left font-semibold">Tanggal Dibuat</th>
                <th className="p-4 text-left font-semibold">Status</th>
                <th className="p-4 text-center font-semibold">Aksi</th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-500">
                    Memuat data akun...
                  </td>
                </tr>
              ) : pagedUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-500">
                    Tidak ada data akun yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                pagedUsers.map((user) => (
                  <tr key={user.id} className="border-t border-slate-100 align-top hover:bg-slate-50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Image
                          src={toAbsoluteAssetUrl(user.profile_picture_url) || "/bg.jpg"}
                          alt={user.full_name}
                          width={40}
                          height={40}
                          unoptimized
                          className="rounded-xl object-cover"
                        />
                        <div className="space-y-0.5">
                          <div className="font-medium text-slate-800">{user.full_name}</div>
                          <div className="text-xs text-slate-500">
                            {getUserEmailDisplay(user)}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="p-4">
                      <RoleBadge role={user.role} />
                    </td>

                    <td className="p-4 text-slate-700">{user.phone_number || "-"}</td>
                    <td className="p-4 text-slate-700">{formatDate(user.created_at)}</td>
                    <td className="p-4">
                      <StatusBadge status={user.account_status} />
                    </td>

                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            void handleDeleteUser(user);
                          }}
                          disabled={isDeletingId === user.id}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                          title="Hapus akun"
                        >
                          <Trash2 size={17} />
                        </button>

                        <button
                          type="button"
                          onClick={() => openEditModal(user)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-blue-50 hover:text-blue-600"
                          title="Ubah akun"
                        >
                          <Pencil size={17} />
                        </button>

                        <button
                          type="button"
                          onClick={() => setViewUser(user)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-emerald-50 hover:text-emerald-600"
                          title="Lihat detail akun"
                        >
                          <Eye size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-600">
          <p>
            Menampilkan {showingFrom}-{showingTo} dari {filteredUsers.length} akun
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={!canGoPrevious || isLoading}
              className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft size={15} />
              Sebelumnya
            </button>

            <span className="min-w-[110px] text-center text-xs text-slate-600 sm:text-sm">
              Halaman {Math.min(currentPage, totalPages)}/{totalPages}
            </span>

            <button
              type="button"
              onClick={() =>
                setCurrentPage((prev) => Math.min(totalPages, prev + 1))
              }
              disabled={!canGoNext || isLoading}
              className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              Berikutnya
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </section>

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-800">
                {formMode === "create" ? "Tambah Akun" : "Ubah Akun"}
              </h2>

              <button
                type="button"
                onClick={closeFormModal}
                disabled={isSubmitting}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto px-6 py-5">
              <FormField
                label="Nama Lengkap"
                value={form.fullName}
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, fullName: value }))
                }
                placeholder="Masukkan nama pengguna"
              />

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Peran
                </label>
                <select
                  value={form.role}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      role: event.target.value as UserRole,
                    }))
                  }
                  className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm focus:border-[#1E2746] focus:outline-none focus:ring-2 focus:ring-[#1E2746]/20"
                >
                  <option value="admin">Administrator</option>
                  <option value="owner">Pemilik</option>
                  <option value="tenant">Penyewa</option>
                  <option value="housekeeper">Petugas Kebersihan</option>
                  <option value="technician">Teknisi</option>
                </select>
              </div>

              {formIsOperationalRole ? (
                <div className="rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm leading-6 text-cyan-800">
                  Peran {roleLabelMap[form.role]} dibuat sebagai data petugas untuk
                  modul operasional, jadi tidak membutuhkan email dan kata sandi.
                </div>
              ) : (
                <FormField
                  label="Email"
                  type="email"
                  value={form.email}
                  onChange={(value) =>
                    setForm((prev) => ({ ...prev, email: value }))
                  }
                  placeholder="Masukkan email pengguna"
                />
              )}

              <FormField
                label="Nomor Telepon"
                value={form.phoneNumber}
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, phoneNumber: value }))
                }
                placeholder="Contoh: 081234567890"
              />

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Status Akun
                </label>
                <select
                  value={form.accountStatus}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      accountStatus: event.target.value as "active" | "inactive",
                    }))
                  }
                  className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm focus:border-[#1E2746] focus:outline-none focus:ring-2 focus:ring-[#1E2746]/20"
                >
                  <option value="active">Aktif</option>
                  <option value="inactive">Nonaktif</option>
                </select>
              </div>

              {!formIsOperationalRole && (
                <FormField
                  label={
                    formMode === "create"
                      ? "Kata Sandi"
                      : "Kata Sandi Baru (Opsional)"
                  }
                  type="password"
                  value={form.password}
                  onChange={(value) =>
                    setForm((prev) => ({ ...prev, password: value }))
                  }
                  placeholder={
                    formMode === "create"
                      ? "Minimal 8 karakter"
                      : "Kosongkan jika tidak diubah"
                  }
                />
              )}

              {formError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {formError}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
              <button
                type="button"
                onClick={closeFormModal}
                disabled={isSubmitting}
                className="h-11 rounded-xl border border-slate-200 px-5 font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={() => {
                  void handleSubmitForm();
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

      {viewUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-800">Detail Akun</h2>

              <button
                type="button"
                onClick={() => setViewUser(null)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto px-6 py-5 text-sm">
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <Image
                  src={toAbsoluteAssetUrl(viewUser.profile_picture_url) || "/bg.jpg"}
                  alt={viewUser.full_name}
                  width={44}
                  height={44}
                  unoptimized
                  className="rounded-xl object-cover"
                />
                <div>
                  <p className="font-semibold text-slate-800">{viewUser.full_name}</p>
                  <p className="text-xs text-slate-500">
                    {getUserEmailDisplay(viewUser)}
                  </p>
                </div>
              </div>

              <DetailRow label="Nama" value={viewUser.full_name} />
              <DetailRow label="Email" value={getUserEmailDisplay(viewUser)} />
              <DetailRow label="Peran" value={roleLabelMap[viewUser.role] || "-"} />
              <DetailRow label="Telepon" value={viewUser.phone_number || "-"} />
              <DetailRow
                label="Status"
                value={statusLabelMap[viewUser.account_status] || "-"}
              />
              <DetailRow label="Tanggal Dibuat" value={formatDate(viewUser.created_at)} />
              <DetailRow label="Terakhir Diperbarui" value={formatDate(viewUser.updated_at)} />
            </div>

            <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-6 py-4">
              <button
                type="button"
                onClick={() => setViewUser(null)}
                className="h-11 rounded-xl bg-[#1E2746] px-6 font-medium text-white hover:bg-[#141B35]"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  title,
  value,
  caption,
  tone = "default",
}: {
  title: string;
  value: number;
  caption: string;
  tone?: "default" | "success" | "warning" | "info" | "cyan";
}) {
  const toneClass =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50/70"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50/70"
        : tone === "info"
          ? "border-blue-200 bg-blue-50/70"
          : tone === "cyan"
            ? "border-cyan-200 bg-cyan-50/70"
          : "border-slate-200 bg-slate-50/70";

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {title}
      </p>
      <p className="mt-2 text-2xl font-semibold text-slate-800">{value}</p>
      <p className="mt-1 text-xs text-slate-600">{caption}</p>
    </div>
  );
}

function RoleBadge({ role }: { role: UserRole }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
        roleStyleMap[role] || "bg-slate-100 text-slate-700"
      }`}
    >
      {roleLabelMap[role] || role}
    </span>
  );
}

function StatusBadge({ status }: { status: "active" | "inactive" }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
        statusStyleMap[status] || "bg-slate-100 text-slate-700"
      }`}
    >
      {statusLabelMap[status] || status}
    </span>
  );
}

function FormField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm focus:border-[#1E2746] focus:outline-none focus:ring-2 focus:ring-[#1E2746]/20"
      />
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-slate-200 px-3 py-2">
      <span className="text-sm font-medium text-slate-600">{label}</span>
      <span className="max-w-[65%] break-words text-right text-sm text-slate-800">
        {value}
      </span>
    </div>
  );
}
