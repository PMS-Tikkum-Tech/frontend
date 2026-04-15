"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertCircle,
  CheckCircle2,
  IdCard,
  Mail,
  Phone,
  RefreshCw,
  Save,
  ShieldCheck,
  Upload,
  UserRound,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  getApiErrorMessage,
  getIncompleteTenantProfileFields,
  getTenantProfile,
  TENANT_PROFILE_UPDATE_UNAVAILABLE_MESSAGE,
  updateTenantProfile,
} from "@/lib/dashboard/tenant.api";
import type { BackendUser } from "@/types/auth";

const resolveAvatarUrl = (path?: string | null) => {
  if (!path) {
    return "/bg.jpg";
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
    "http://127.0.0.1:3001";

  return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
};

const toFormValue = (value?: string | number | null) => {
  return value?.toString().trim() || "";
};

const toDisplayValue = (value?: string | number | null) => {
  const trimmed = value?.toString().trim();
  return trimmed ? trimmed : "-";
};

const PROFILE_PICTURE_ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png"];
const PROFILE_PICTURE_MAX_SIZE_BYTES = 5 * 1024 * 1024;
const TENANT_PROFILE_MANAGED_BY_BACKEND = true;

type ProfileFormState = {
  fullName: string;
  phoneNumber: string;
  nik: string;
  emergencyContactName: string;
  emergencyContactNumber: string;
  relationship: string;
};

const getInitialFormState = (): ProfileFormState => ({
  fullName: "",
  phoneNumber: "",
  nik: "",
  emergencyContactName: "",
  emergencyContactNumber: "",
  relationship: "",
});

export default function TenantAccountPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<BackendUser | null>(null);
  const [form, setForm] = useState<ProfileFormState>(getInitialFormState());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(
    null
  );
  const [profilePictureInputKey, setProfilePictureInputKey] = useState(0);

  useEffect(() => {
    return () => {
      if (profilePicturePreview?.startsWith("blob:")) {
        URL.revokeObjectURL(profilePicturePreview);
      }
    };
  }, [profilePicturePreview]);

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await getTenantProfile();
        if (!active) {
          return;
        }

        setProfile(response.data);
        setForm({
          fullName: toFormValue(response.data.full_name),
          phoneNumber: toFormValue(response.data.phone_number),
          nik: toFormValue(response.data.nik),
          emergencyContactName: toFormValue(response.data.emergency_contact_name),
          emergencyContactNumber: toFormValue(response.data.emergency_contact_number),
          relationship: toFormValue(response.data.relationship),
        });
        setProfilePicture(null);
        setProfilePicturePreview((previous) => {
          if (previous?.startsWith("blob:")) {
            URL.revokeObjectURL(previous);
          }

          return null;
        });
        setProfilePictureInputKey((prev) => prev + 1);
      } catch (loadError) {
        if (!active) {
          return;
        }

        setError(
          getApiErrorMessage(
            loadError,
            "Gagal memuat profil akun. Silakan coba lagi."
          )
        );
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadProfile();

    return () => {
      active = false;
    };
  }, [refreshKey]);

  const completeness = useMemo(() => {
    const source: BackendUser = profile
      ? {
          ...profile,
          full_name: form.fullName,
          phone_number: form.phoneNumber,
          nik: form.nik,
          emergency_contact_name: form.emergencyContactName,
          emergency_contact_number: form.emergencyContactNumber,
          relationship: form.relationship,
        }
      : {
          id: 0,
          full_name: form.fullName,
          email: user?.email || "",
          role: "tenant",
          phone_number: form.phoneNumber,
          nik: form.nik,
          emergency_contact_name: form.emergencyContactName,
          emergency_contact_number: form.emergencyContactNumber,
          relationship: form.relationship,
        };

    const missingFields = getIncompleteTenantProfileFields(source);
    return {
      isComplete: missingFields.length === 0,
      missingFields,
    };
  }, [form, profile, user?.email]);

  const avatarUrl =
    profilePicturePreview ||
    resolveAvatarUrl(profile?.profile_picture_url || user?.avatar || null);

  const handleProfilePictureChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (TENANT_PROFILE_MANAGED_BY_BACKEND) {
      setError(TENANT_PROFILE_UPDATE_UNAVAILABLE_MESSAGE);
      setSuccessMessage(null);
      return;
    }

    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!PROFILE_PICTURE_ALLOWED_TYPES.includes(file.type)) {
      setError("Format foto profil harus PNG, JPG, atau JPEG.");
      setSuccessMessage(null);
      setProfilePicture(null);
      setProfilePicturePreview((previous) => {
        if (previous?.startsWith("blob:")) {
          URL.revokeObjectURL(previous);
        }

        return null;
      });
      setProfilePictureInputKey((prev) => prev + 1);
      return;
    }

    if (file.size > PROFILE_PICTURE_MAX_SIZE_BYTES) {
      setError("Ukuran foto profil maksimal 5 MB.");
      setSuccessMessage(null);
      setProfilePicture(null);
      setProfilePicturePreview((previous) => {
        if (previous?.startsWith("blob:")) {
          URL.revokeObjectURL(previous);
        }

        return null;
      });
      setProfilePictureInputKey((prev) => prev + 1);
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setProfilePicture(file);
    setProfilePicturePreview((previous) => {
      if (previous?.startsWith("blob:")) {
        URL.revokeObjectURL(previous);
      }

      return previewUrl;
    });
    setError(null);
    setSuccessMessage(null);
  };

  const handleClearSelectedProfilePicture = () => {
    setProfilePicture(null);
    setProfilePicturePreview((previous) => {
      if (previous?.startsWith("blob:")) {
        URL.revokeObjectURL(previous);
      }

      return null;
    });
    setProfilePictureInputKey((prev) => prev + 1);
  };

  const handleSaveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (TENANT_PROFILE_MANAGED_BY_BACKEND) {
      setError(TENANT_PROFILE_UPDATE_UNAVAILABLE_MESSAGE);
      return;
    }

    if (!form.fullName.trim()) {
      setError("Nama lengkap wajib diisi.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await updateTenantProfile({
        full_name: form.fullName.trim(),
        phone_number: form.phoneNumber.trim(),
        nik: form.nik.trim(),
        emergency_contact_name: form.emergencyContactName.trim(),
        emergency_contact_number: form.emergencyContactNumber.trim(),
        relationship: form.relationship.trim(),
        profile_picture: profilePicture,
      });

      setProfile(response.data);
      setProfilePicture(null);
      setProfilePicturePreview((previous) => {
        if (previous?.startsWith("blob:")) {
          URL.revokeObjectURL(previous);
        }

        return null;
      });
      setProfilePictureInputKey((prev) => prev + 1);
      setSuccessMessage(response.message || "Profil berhasil diperbarui.");
    } catch (saveError) {
      setError(
        getApiErrorMessage(saveError, "Gagal memperbarui profil. Silakan coba lagi.")
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-blue-700 via-indigo-700 to-cyan-700 p-6 text-white shadow-sm">
        <div className="pointer-events-none absolute -left-10 top-0 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -right-12 bottom-0 h-44 w-44 rounded-full bg-white/10 blur-3xl" />

        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold">Ubah Profil</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/90">
              Lengkapi data diri untuk bisa mengajukan jadwal visit properti.
            </p>
          </div>

          <button
            onClick={() => setRefreshKey((value) => value + 1)}
            className="inline-flex items-center gap-2 rounded-xl border border-white/40 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20"
          >
            <RefreshCw size={14} />
            Muat Ulang
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <StatChip
            icon={<UserRound size={15} />}
            label="Nama Akun"
            value={toDisplayValue(form.fullName)}
          />
          <StatChip
            icon={<Mail size={15} />}
            label="Email"
            value={toDisplayValue(profile?.email || user?.email)}
          />
          <StatChip
            icon={completeness.isComplete ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
            label="Status Profil"
            value={completeness.isComplete ? "Lengkap" : "Belum Lengkap"}
          />
        </div>
      </section>

      {isLoading ? (
        <div className="rounded-2xl border bg-white p-8 text-sm text-slate-500">
          Memuat profil akun...
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <section className="rounded-2xl border bg-white p-5 text-center shadow-sm">
            <Image
              src={avatarUrl}
              alt="Foto Profil"
              width={180}
              height={180}
              unoptimized
              className="mx-auto rounded-full border object-cover"
            />
            <p className="mt-4 text-base font-semibold text-slate-800">
              {toDisplayValue(form.fullName)}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {toDisplayValue(profile?.email || user?.email)}
            </p>

            <div className="mt-4 space-y-2">
              <label
                className={`inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium transition ${
                  TENANT_PROFILE_MANAGED_BY_BACKEND
                    ? "cursor-not-allowed bg-slate-100 text-slate-400"
                    : "cursor-pointer bg-slate-50 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <Upload size={13} className="text-blue-700" />
                Ganti Foto Profil
                <input
                  key={profilePictureInputKey}
                  type="file"
                  accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                  className="hidden"
                  onChange={handleProfilePictureChange}
                  disabled={TENANT_PROFILE_MANAGED_BY_BACKEND}
                />
              </label>

              <p className="text-xs text-slate-500">
                {TENANT_PROFILE_MANAGED_BY_BACKEND
                  ? "Profil tenant masih mengikuti data backend dan belum bisa diubah mandiri."
                  : "Format PNG/JPG/JPEG, maksimal 5 MB."}
              </p>

              {profilePicture ? (
                <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
                  <span className="max-w-full truncate rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-blue-700">
                    {profilePicture.name}
                  </span>
                  <button
                    type="button"
                    onClick={handleClearSelectedProfilePicture}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-slate-600 transition hover:bg-slate-100"
                  >
                    <XCircle size={12} />
                    Batalkan
                  </button>
                </div>
              ) : null}
            </div>

            <div
              className={`mt-5 rounded-xl border p-3 text-left text-xs ${
                completeness.isComplete
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-amber-200 bg-amber-50 text-amber-700"
              }`}
            >
              {completeness.isComplete ? (
                <p>Profil sudah lengkap. Kamu bisa ajukan jadwal visit.</p>
              ) : (
                <p>
                  Profil belum lengkap.
                  <br />
                  Lengkapi: {completeness.missingFields.join(", ")}.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border bg-white p-5 shadow-sm lg:col-span-2">
            <h2 className="text-lg font-semibold text-slate-800">
              Form Data Diri Tenant
            </h2>

            <form onSubmit={handleSaveProfile} className="mt-4 space-y-4">
              {TENANT_PROFILE_MANAGED_BY_BACKEND ? (
                <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                  {TENANT_PROFILE_UPDATE_UNAVAILABLE_MESSAGE} Data profil tetap dibaca dari
                  endpoint backend `GET /api/v1/auth/me`.
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                <InputField
                  label="Nama Lengkap"
                  icon={<UserRound size={14} />}
                  value={form.fullName}
                  onChange={(value) =>
                    setForm((prev) => ({ ...prev, fullName: value }))
                  }
                  placeholder="Masukkan nama lengkap"
                  disabled={TENANT_PROFILE_MANAGED_BY_BACKEND}
                />
                <InputField
                  label="Email"
                  icon={<Mail size={14} />}
                  value={toDisplayValue(profile?.email || user?.email)}
                  readOnly
                  placeholder="-"
                />
                <InputField
                  label="No. HP"
                  icon={<Phone size={14} />}
                  value={form.phoneNumber}
                  onChange={(value) =>
                    setForm((prev) => ({ ...prev, phoneNumber: value }))
                  }
                  placeholder="Contoh: 081234567890"
                  disabled={TENANT_PROFILE_MANAGED_BY_BACKEND}
                />
                <InputField
                  label="NIK"
                  icon={<IdCard size={14} />}
                  value={form.nik}
                  onChange={(value) => setForm((prev) => ({ ...prev, nik: value }))}
                  placeholder="16 digit NIK"
                  disabled={TENANT_PROFILE_MANAGED_BY_BACKEND}
                />
                <InputField
                  label="Nama Kontak Darurat"
                  icon={<ShieldCheck size={14} />}
                  value={form.emergencyContactName}
                  onChange={(value) =>
                    setForm((prev) => ({ ...prev, emergencyContactName: value }))
                  }
                  placeholder="Nama keluarga terdekat"
                  disabled={TENANT_PROFILE_MANAGED_BY_BACKEND}
                />
                <InputField
                  label="No. Kontak Darurat"
                  icon={<Phone size={14} />}
                  value={form.emergencyContactNumber}
                  onChange={(value) =>
                    setForm((prev) => ({ ...prev, emergencyContactNumber: value }))
                  }
                  placeholder="Nomor yang bisa dihubungi"
                  disabled={TENANT_PROFILE_MANAGED_BY_BACKEND}
                />
              </div>

              <InputField
                label="Hubungan Kontak Darurat"
                icon={<ShieldCheck size={14} />}
                value={form.relationship}
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, relationship: value }))
                }
                placeholder="Contoh: Orang Tua, Kakak, Wali"
                disabled={TENANT_PROFILE_MANAGED_BY_BACKEND}
              />

              {error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              {successMessage ? (
                <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                  {successMessage}
                </div>
              ) : null}

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={isSaving || TENANT_PROFILE_MANAGED_BY_BACKEND}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save size={14} />
                  {TENANT_PROFILE_MANAGED_BY_BACKEND
                    ? "Menunggu Dukungan Backend"
                    : isSaving
                      ? "Menyimpan..."
                      : "Simpan Profil"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

function StatChip({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/30 bg-white/10 px-4 py-3 backdrop-blur-sm">
      <p className="inline-flex items-center gap-2 text-xs text-white/85">
        {icon}
        {label}
      </p>
      <p className="mt-1 truncate text-base font-semibold text-white">{value}</p>
    </div>
  );
}

function InputField({
  label,
  value,
  placeholder,
  icon,
  readOnly = false,
  disabled = false,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  icon: ReactNode;
  readOnly?: boolean;
  disabled?: boolean;
  onChange?: (value: string) => void;
}) {
  const isLocked = readOnly || disabled;

  return (
    <label className="block space-y-1.5">
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
        <span className="text-blue-700">{icon}</span>
        {label}
      </span>
      <input
        type="text"
        value={value}
        readOnly={readOnly}
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={placeholder}
        className={`h-11 w-full rounded-xl border px-3 text-sm outline-none transition ${
          isLocked
            ? "cursor-not-allowed bg-slate-50 text-slate-500"
            : "bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
        }`}
      />
    </label>
  );
}
