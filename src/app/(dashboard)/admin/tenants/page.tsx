"use client";

import {
  type InputHTMLAttributes,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import Image from "next/image";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Filter,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  UserCheck,
  UserX,
  Users,
  X,
} from "lucide-react";
import {
  createAdminUser,
  deleteAdminUser,
  getAdminTenants,
  getApiErrorMessage,
  toAbsoluteAssetUrl,
  updateAdminUser,
  type AdminUser,
} from "@/lib/dashboard/admin.api";
import {
  EMAIL_MAX_LENGTH,
  NIK_LENGTH,
  PASSWORD_MIN_LENGTH,
  PHONE_INPUT_MAX_LENGTH,
  getEmailValidationMessage,
  getNikValidationMessage,
  getPasswordValidationMessage,
  getPhoneValidationMessage,
  getTextValidationMessage,
  normalizeTextInput,
  sanitizeEmailInput,
  sanitizeNikInput,
  sanitizePhoneInput,
} from "@/lib/form-validation";
import { hasFilterOption, uniqueFilterOptions } from "@/lib/filter-options";

const formatDate = (value?: string | null) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("id-ID");
};

type TenantFormState = {
  fullName: string;
  email: string;
  phoneNumber: string;
  accountStatus: "active" | "inactive" | "pending_verification";
  password: string;
  nik: string;
  emergencyContactName: string;
  emergencyContactNumber: string;
  relationship: string;
};

type Notice = {
  variant: "success" | "error";
  message: string;
} | null;

type TenantFormErrors = Partial<Record<keyof TenantFormState, string>>;

const PAGE_SIZE = 10;

const statusLabelMap: Record<string, string> = {
  active: "Aktif",
  inactive: "Nonaktif",
  pending_verification: "Menunggu Verifikasi",
};

const getInitialTenantForm = (): TenantFormState => ({
  fullName: "",
  email: "",
  phoneNumber: "",
  accountStatus: "active",
  password: "",
  nik: "",
  emergencyContactName: "",
  emergencyContactNumber: "",
  relationship: "",
});

const getTenantFormErrors = (
  form: TenantFormState,
  formMode: "create" | "edit"
): TenantFormErrors => {
  const errors: TenantFormErrors = {};

  const fullNameError = getTextValidationMessage(form.fullName, {
    label: "Nama lengkap",
    required: true,
  });
  if (fullNameError) {
    errors.fullName = fullNameError;
  }

  const emailError = getEmailValidationMessage(form.email, {
    label: "Email",
    required: true,
  });
  if (emailError) {
    errors.email = emailError;
  }

  const phoneError = getPhoneValidationMessage(form.phoneNumber, {
    label: "Nomor telepon",
  });
  if (phoneError) {
    errors.phoneNumber = phoneError;
  }

  const nikError = getNikValidationMessage(form.nik, {
    label: "NIK",
  });
  if (nikError) {
    errors.nik = nikError;
  }

  const emergencyName = normalizeTextInput(form.emergencyContactName);
  const emergencyPhone = sanitizePhoneInput(form.emergencyContactNumber);
  const relationship = normalizeTextInput(form.relationship);
  const hasEmergencySection =
    Boolean(emergencyName) || Boolean(emergencyPhone) || Boolean(relationship);

  if (hasEmergencySection) {
    const emergencyNameError = getTextValidationMessage(emergencyName, {
      label: "Nama kontak darurat",
      required: true,
    });
    if (emergencyNameError) {
      errors.emergencyContactName = emergencyNameError;
    }

    const emergencyPhoneError = getPhoneValidationMessage(emergencyPhone, {
      label: "Nomor kontak darurat",
      required: true,
    });
    if (emergencyPhoneError) {
      errors.emergencyContactNumber = emergencyPhoneError;
    }

    const relationshipError = getTextValidationMessage(relationship, {
      label: "Hubungan kontak darurat",
      required: true,
    });
    if (relationshipError) {
      errors.relationship = relationshipError;
    }
  }

  const passwordRequired = formMode === "create";
  const passwordError = getPasswordValidationMessage(form.password, {
    label: formMode === "create" ? "Kata sandi" : "Kata sandi baru",
    required: passwordRequired,
  });
  if (passwordError && (passwordRequired || form.password)) {
    errors.password = passwordError;
  }

  return errors;
};

const normalizeOptional = (value: string) => {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

export default function AdminTenantsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [tenants, setTenants] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [notice, setNotice] = useState<Notice>(null);
  const [viewTenant, setViewTenant] = useState<AdminUser | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingTenantId, setEditingTenantId] = useState<number | null>(null);
  const [form, setForm] = useState<TenantFormState>(getInitialTenantForm());
  const [fieldErrors, setFieldErrors] = useState<TenantFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    let active = true;

    const loadTenants = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await getAdminTenants({
          page: 1,
          per_page: 100,
        });

        if (!active) {
          return;
        }

        setTenants(response.data);
      } catch (loadError) {
        if (!active) {
          return;
        }

        setError(
          getApiErrorMessage(
            loadError,
            "Data penyewa gagal dimuat. Silakan coba lagi."
          )
        );
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadTenants();

    return () => {
      active = false;
    };
  }, [refreshKey]);

  const statusFilterOptions = useMemo(
    () =>
      uniqueFilterOptions(
        tenants,
        (tenant) => tenant.account_status,
        (value) => statusLabelMap[value]
      ),
    [tenants]
  );

  const filtered = useMemo(() => {
    return tenants.filter((tenant) => {
      const searchable = `${tenant.full_name || ""} ${tenant.email} ${
        tenant.phone_number || ""
      }`.toLowerCase();
      return (
        searchable.includes(search.toLowerCase()) &&
        (status ? tenant.account_status === status : true)
      );
    });
  }, [search, status, tenants]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const pagedTenants = filtered.slice(startIndex, startIndex + PAGE_SIZE);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, status]);

  useEffect(() => {
    if (!hasFilterOption(statusFilterOptions, status)) {
      setStatus("");
    }
  }, [status, statusFilterOptions]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const stats = useMemo(() => {
    const activeCount = tenants.filter(
      (tenant) => tenant.account_status === "active"
    ).length;
    const pendingCount = tenants.filter(
      (tenant) => tenant.account_status === "pending_verification"
    ).length;
    const inactiveCount = tenants.filter(
      (tenant) => tenant.account_status === "inactive"
    ).length;

    return {
      total: tenants.length,
      active: activeCount,
      pending: pendingCount,
      inactive: inactiveCount,
    };
  }, [tenants]);

  const openCreateModal = () => {
    setNotice(null);
    setFormMode("create");
    setEditingTenantId(null);
    setForm(getInitialTenantForm());
    setFormError(null);
    setFieldErrors({});
    setIsFormOpen(true);
  };

  const openEditModal = (tenant: AdminUser) => {
    setNotice(null);
    setFormMode("edit");
    setEditingTenantId(tenant.id);
    setForm({
      fullName: tenant.full_name,
      email: tenant.email,
      phoneNumber: sanitizePhoneInput(tenant.phone_number || ""),
      accountStatus: tenant.account_status,
      password: "",
      nik: tenant.nik || "",
      emergencyContactName: tenant.emergency_contact_name || "",
      emergencyContactNumber: sanitizePhoneInput(
        tenant.emergency_contact_number?.toString() || ""
      ),
      relationship: tenant.relationship || "",
    });
    setFormError(null);
    setFieldErrors({});
    setIsFormOpen(true);
  };

  const closeFormModal = () => {
    if (isSubmitting) {
      return;
    }

    setIsFormOpen(false);
    setFieldErrors({});
  };

  const handleSubmitForm = async () => {
    const fullName = normalizeTextInput(form.fullName);
    const email = sanitizeEmailInput(form.email);
    const password = form.password.trim();
    const nextFieldErrors = getTenantFormErrors(form, formMode);
    const firstFieldError = Object.values(nextFieldErrors)[0];

    setFieldErrors(nextFieldErrors);
    if (firstFieldError) {
      setFormError(firstFieldError);
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    setNotice(null);

    try {
      if (formMode === "create") {
        await createAdminUser({
          full_name: fullName,
          email,
          password,
          phone_number: normalizeOptional(sanitizePhoneInput(form.phoneNumber)),
          nik: normalizeOptional(sanitizeNikInput(form.nik)),
          emergency_contact_name: normalizeOptional(
            normalizeTextInput(form.emergencyContactName)
          ),
          emergency_contact_number: normalizeOptional(
            sanitizePhoneInput(form.emergencyContactNumber)
          ),
          relationship: normalizeOptional(normalizeTextInput(form.relationship)),
          role: "tenant",
          account_status: form.accountStatus,
        });

        setNotice({
          variant: "success",
          message: "Penyewa berhasil ditambahkan.",
        });
      } else {
        if (!editingTenantId) {
          throw new Error("Data penyewa tidak ditemukan.");
        }

        await updateAdminUser(editingTenantId, {
          full_name: fullName,
          email,
          phone_number: normalizeOptional(sanitizePhoneInput(form.phoneNumber)),
          nik: normalizeOptional(sanitizeNikInput(form.nik)),
          emergency_contact_name: normalizeOptional(
            normalizeTextInput(form.emergencyContactName)
          ),
          emergency_contact_number: normalizeOptional(
            sanitizePhoneInput(form.emergencyContactNumber)
          ),
          relationship: normalizeOptional(normalizeTextInput(form.relationship)),
          role: "tenant",
          account_status: form.accountStatus,
          ...(password ? { password } : {}),
        });

        setNotice({
          variant: "success",
          message: "Data penyewa berhasil diperbarui.",
        });
      }

      setIsFormOpen(false);
      setFieldErrors({});
      setRefreshKey((prev) => prev + 1);
    } catch (saveError) {
      setFormError(
        getApiErrorMessage(saveError, "Gagal menyimpan data penyewa.")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTenant = async (tenant: AdminUser) => {
    const agreed = window.confirm(
      `Hapus penyewa ${tenant.full_name || tenant.email}? Tindakan ini tidak bisa dibatalkan.`
    );

    if (!agreed) {
      return;
    }

    setIsDeletingId(tenant.id);
    setNotice(null);

    try {
      await deleteAdminUser(tenant.id);
      setNotice({
        variant: "success",
        message: "Penyewa berhasil dihapus.",
      });
      setRefreshKey((prev) => prev + 1);
    } catch (deleteError) {
      setNotice({
        variant: "error",
        message: getApiErrorMessage(deleteError, "Gagal menghapus penyewa."),
      });
    } finally {
      setIsDeletingId(null);
    }
  };

  return (
    <div className="space-y-7">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-[#1E2746] via-[#273965] to-[#2C62A5] p-4 text-white shadow-sm sm:p-6">
        <div className="pointer-events-none absolute -left-12 top-0 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -right-12 bottom-0 h-44 w-44 rounded-full bg-white/10 blur-3xl" />

        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="inline-flex rounded-full border border-white/35 bg-white/10 px-3 py-1 text-xs font-medium">
              Modul Penyewa
            </p>
            <h1 className="mt-3 text-2xl font-semibold md:text-3xl">
              Kelola Data Penyewa
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-white/85">
              Tambah, ubah, dan pantau status akun penyewa untuk semua properti.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            disabled={isSubmitting}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-[#1E2746] hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus size={16} />
            Tambah Penyewa
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={<Users size={18} />}
          label="Total Penyewa"
          value={String(stats.total)}
        />
        <SummaryCard
          icon={<UserCheck size={18} />}
          label="Akun Aktif"
          value={String(stats.active)}
          tone="success"
        />
        <SummaryCard
          icon={<UserCheck size={18} />}
          label="Menunggu Verifikasi"
          value={String(stats.pending)}
          tone="warning"
        />
        <SummaryCard
          icon={<UserX size={18} />}
          label="Akun Nonaktif"
          value={String(stats.inactive)}
        />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
          <div className="relative w-full min-w-0 flex-1">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              placeholder="Cari nama, email, atau nomor penyewa..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm focus:border-blue-400 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="relative w-full md:min-w-[220px]">
            <Filter
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm focus:border-blue-400 focus:bg-white focus:outline-none"
            >
              <option value="">Semua Status</option>
              {statusFilterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => {
              setSearch("");
              setStatus("");
              setCurrentPage(1);
            }}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 md:w-auto"
          >
            <RotateCcw size={14} />
            Atur Ulang
          </button>
        </div>

        <p className="mt-3 text-xs text-slate-500">
          Menampilkan <span className="font-semibold">{filtered.length}</span> dari{" "}
          <span className="font-semibold">{tenants.length}</span> data penyewa.
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

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[920px] w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="p-3 text-left sm:p-4">Penyewa</th>
                <th className="p-3 text-left sm:p-4">Telepon</th>
                <th className="p-3 text-left sm:p-4">Status Akun</th>
                <th className="p-3 text-left sm:p-4">Tanggal Daftar</th>
                <th className="p-3 text-left sm:p-4">Aksi</th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-500">
                    Memuat data penyewa...
                  </td>
                </tr>
              ) : pagedTenants.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-500">
                    Tidak ada data penyewa.
                  </td>
                </tr>
              ) : (
                pagedTenants.map((tenant) => (
                  <tr
                    key={tenant.id}
                    className="border-t border-slate-100 transition hover:bg-slate-50"
                  >
                    <td className="p-3 sm:p-4">
                      <div className="flex items-center gap-3">
                        <TenantAvatar
                          src={tenant.profile_picture_url}
                          name={tenant.full_name || tenant.email || ""}
                        />

                        <div>
                          <p className="font-semibold text-slate-800">
                            {tenant.full_name || <span className="italic text-slate-400">Belum diisi</span>}
                          </p>
                          <p className="text-xs text-slate-500">{tenant.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="p-3 text-slate-700 sm:p-4">
                      {tenant.phone_number || "-"}
                    </td>

                    <td className="p-3 sm:p-4">
                      <StatusBadge status={tenant.account_status} />
                    </td>

                    <td className="p-3 text-slate-700 sm:p-4">
                      {formatDate(tenant.created_at)}
                    </td>

                    <td className="p-3 sm:p-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setViewTenant(tenant)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:border-green-200 hover:bg-green-50 hover:text-green-700"
                          title="Lihat detail penyewa"
                        >
                          <Eye size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={() => openEditModal(tenant)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                          title="Ubah penyewa"
                        >
                          <Pencil size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            void handleDeleteTenant(tenant);
                          }}
                          disabled={isDeletingId === tenant.id}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                          title="Hapus penyewa"
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
              {filtered.length === 0 ? 0 : startIndex + 1}
            </span>
            {" - "}
            <span className="font-semibold text-slate-700">
              {Math.min(startIndex + PAGE_SIZE, filtered.length)}
            </span>{" "}
            dari{" "}
            <span className="font-semibold text-slate-700">{filtered.length}</span>{" "}
            data penyewa
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

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-4 py-4 sm:px-6">
              <h2 className="text-lg font-semibold text-slate-800">
                {formMode === "create" ? "Tambah Penyewa" : "Ubah Penyewa"}
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

            <div className="space-y-4 px-4 py-4 sm:px-6 sm:py-5">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  label="Nama Lengkap"
                  value={form.fullName}
                  onChange={(value) =>
                    setForm((prev) => ({ ...prev, fullName: value }))
                  }
                  placeholder="Masukkan nama penyewa"
                  error={fieldErrors.fullName}
                />

                <FormField
                  label="Email"
                  type="email"
                  value={form.email}
                  onChange={(value) =>
                    setForm((prev) => ({ ...prev, email: sanitizeEmailInput(value) }))
                  }
                  placeholder="Masukkan email penyewa"
                  inputMode="email"
                  maxLength={EMAIL_MAX_LENGTH}
                  error={fieldErrors.email}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  label="Nomor Telepon"
                  value={form.phoneNumber}
                  onChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      phoneNumber: sanitizePhoneInput(value),
                    }))
                  }
                  placeholder="Contoh: 081234567890"
                  type="tel"
                  inputMode="numeric"
                  maxLength={PHONE_INPUT_MAX_LENGTH}
                  error={fieldErrors.phoneNumber}
                />

                <FormField
                  label="NIK (Opsional)"
                  value={form.nik}
                  onChange={(value) =>
                    setForm((prev) => ({ ...prev, nik: sanitizeNikInput(value) }))
                  }
                  placeholder="Masukkan NIK penyewa"
                  inputMode="numeric"
                  maxLength={NIK_LENGTH}
                  error={fieldErrors.nik}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  label="Nama Kontak Darurat (Opsional)"
                  value={form.emergencyContactName}
                  onChange={(value) =>
                    setForm((prev) => ({ ...prev, emergencyContactName: value }))
                  }
                  placeholder="Masukkan nama kontak darurat"
                  error={fieldErrors.emergencyContactName}
                />

                <FormField
                  label="Nomor Kontak Darurat (Opsional)"
                  value={form.emergencyContactNumber}
                  onChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      emergencyContactNumber: sanitizePhoneInput(value),
                    }))
                  }
                  placeholder="Masukkan nomor kontak darurat"
                  type="tel"
                  inputMode="numeric"
                  maxLength={PHONE_INPUT_MAX_LENGTH}
                  error={fieldErrors.emergencyContactNumber}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  label="Hubungan Kontak Darurat (Opsional)"
                  value={form.relationship}
                  onChange={(value) =>
                    setForm((prev) => ({ ...prev, relationship: value }))
                  }
                  placeholder="Contoh: Orang Tua"
                  error={fieldErrors.relationship}
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
                        accountStatus: event.target.value as
                          | "active"
                          | "inactive"
                          | "pending_verification",
                      }))
                    }
                    className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E2746]"
                  >
                    <option value="active">Aktif</option>
                    <option value="pending_verification">Menunggu Verifikasi</option>
                    <option value="inactive">Nonaktif</option>
                  </select>
                </div>
              </div>

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
                    ? "Minimal 8 karakter, huruf besar, huruf kecil, dan angka"
                    : "Kosongkan jika tidak diubah"
                }
                minLength={PASSWORD_MIN_LENGTH}
                maxLength={100}
                error={fieldErrors.password}
              />

              {formError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {formError}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 rounded-b-2xl border-t bg-slate-50 px-6 py-4">
              <button
                type="button"
                onClick={closeFormModal}
                disabled={isSubmitting}
                className="h-11 rounded-xl border border-slate-200 px-5 font-medium hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
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

      {viewTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-800">
                Detail Penyewa
              </h2>

              <button
                type="button"
                onClick={() => setViewTenant(null)}
                className="rounded-lg p-2 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 px-6 py-5 text-sm">
              <div className="mb-1 flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                <TenantAvatar
                  src={viewTenant.profile_picture_url}
                  name={viewTenant.full_name || viewTenant.email || ""}
                  size={48}
                />
                <div>
                  <p className="font-semibold text-slate-800">{viewTenant.full_name || <span className="italic text-slate-400">Belum diisi</span>}</p>
                  <p className="text-xs text-slate-500">{viewTenant.email}</p>
                </div>
              </div>
              <DetailRow label="Nama" value={viewTenant.full_name || "-"} />
              <DetailRow label="Email" value={viewTenant.email} />
              <DetailRow label="Telepon" value={viewTenant.phone_number || "-"} />
              <DetailRow label="NIK" value={viewTenant.nik || "-"} />
              <DetailRow
                label="Nama Kontak Darurat"
                value={viewTenant.emergency_contact_name || "-"}
              />
              <DetailRow
                label="Nomor Kontak Darurat"
                value={viewTenant.emergency_contact_number || "-"}
              />
              <DetailRow
                label="Hubungan Kontak Darurat"
                value={viewTenant.relationship || "-"}
              />
              <DetailRow
                label="Status"
                value={statusLabelMap[viewTenant.account_status] || "-"}
              />
              <DetailRow
                label="Tanggal Daftar"
                value={formatDate(viewTenant.created_at)}
              />
            </div>

            <div className="flex justify-end rounded-b-2xl border-t bg-slate-50 px-6 py-4">
              <button
                type="button"
                onClick={() => setViewTenant(null)}
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

function TenantAvatar({
  src,
  name,
  size = 42,
}: {
  src?: string | null;
  name: string;
  size?: number;
}) {
  const [hasError, setHasError] = useState(false);
  const imageUrl = toAbsoluteAssetUrl(src);
  const initials = (name || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  if (!imageUrl || hasError) {
    return (
      <div
        style={{ width: size, height: size }}
        className="inline-flex items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700"
      >
        {initials || "U"}
      </div>
    );
  }

  return (
    <Image
      src={imageUrl}
      alt={name}
      width={size}
      height={size}
      unoptimized
      onError={() => setHasError(true)}
      className="rounded-full object-cover"
    />
  );
}

function SummaryCard({
  icon,
  label,
  value,
  tone = "default",
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone?: "default" | "success" | "warning";
}) {
  const styles =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-slate-200 bg-white text-[#1E2746]";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-slate-800">{value}</p>
        </div>
        <div
          className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border ${styles}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: "active" | "inactive" | "pending_verification";
}) {
  const styles =
    status === "active"
      ? "border border-green-200 bg-green-50 text-green-700"
      : status === "pending_verification"
        ? "border border-amber-200 bg-amber-50 text-amber-700"
        : "border border-red-200 bg-red-50 text-red-600";

  const label = statusLabelMap[status] || status;

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${styles}`}>
      {label}
    </span>
  );
}

function FormField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  error,
  inputMode,
  maxLength,
  minLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  error?: string;
  inputMode?: InputHTMLAttributes<HTMLInputElement>["inputMode"];
  maxLength?: number;
  minLength?: number;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        maxLength={maxLength}
        minLength={minLength}
        aria-invalid={Boolean(error)}
        className={`h-11 w-full rounded-xl border px-4 text-sm focus:outline-none focus:ring-2 ${
          error
            ? "border-red-300 focus:ring-red-500"
            : "border-slate-200 focus:ring-[#1E2746]"
        }`}
      />
      {error ? <p className="mt-1 text-xs text-red-500">{error}</p> : null}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-2">
      <span className="font-medium text-slate-600">{label}</span>
      <span className="text-right text-slate-800">{value}</span>
    </div>
  );
}
