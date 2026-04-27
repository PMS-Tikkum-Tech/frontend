"use client";

import Image from "next/image";
import {
  useEffect,
  useMemo,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import {
  AlertCircle,
  CheckCircle2,
  IdCard,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  Upload,
  UserRound,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import ProfileImageCropDialog from "@/components/ui/ProfileImageCropDialog";
import {
  getApiErrorMessage,
  getIncompleteTenantProfileFields,
  getTenantProfile,
  updateTenantProfile,
} from "@/lib/dashboard/tenant.api";
import {
  NIK_LENGTH,
  getNikValidationMessage,
  getPhoneValidationMessage,
  getTextValidationMessage,
  normalizeTextInput,
  sanitizeNikInput,
  sanitizePhoneInput,
} from "@/lib/form-validation";
import {
  PROFILE_PICTURE_ACCEPT,
  getProfilePictureValidationError,
} from "@/lib/profile-picture";
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

type ProfileFormState = {
  fullName: string;
  phoneNumber: string;
  nik: string;
  emergencyContactName: string;
  emergencyContactNumber: string;
  relationship: string;
};

type ProfileFormErrors = Partial<Record<keyof ProfileFormState, string>>;

const getInitialFormState = (): ProfileFormState => ({
  fullName: "",
  phoneNumber: "",
  nik: "",
  emergencyContactName: "",
  emergencyContactNumber: "",
  relationship: "",
});

const getProfileFormErrors = (
  form: ProfileFormState
): ProfileFormErrors => {
  const errors: ProfileFormErrors = {};

  const fullNameError = getTextValidationMessage(form.fullName, {
    label: "Nama lengkap",
    required: true,
  });
  if (fullNameError) {
    errors.fullName = fullNameError;
  }

  const phoneError = getPhoneValidationMessage(form.phoneNumber, {
    label: "Nomor HP",
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

  const emergencyContactName = normalizeTextInput(form.emergencyContactName);
  const emergencyContactNumber = sanitizePhoneInput(form.emergencyContactNumber);
  const relationship = normalizeTextInput(form.relationship);
  const hasEmergencySection =
    Boolean(emergencyContactName) ||
    Boolean(emergencyContactNumber) ||
    Boolean(relationship);

  if (hasEmergencySection) {
    const emergencyNameError = getTextValidationMessage(
      emergencyContactName,
      {
        label: "Nama kontak darurat",
        required: true,
      }
    );
    if (emergencyNameError) {
      errors.emergencyContactName = emergencyNameError;
    }

    const emergencyPhoneError = getPhoneValidationMessage(
      emergencyContactNumber,
      {
        label: "Nomor kontak darurat",
        required: true,
      }
    );
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

  return errors;
};

export default function TenantAccountPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<BackendUser | null>(null);
  const [form, setForm] = useState<ProfileFormState>(getInitialFormState());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<ProfileFormErrors>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(
    null
  );
  const [profilePictureInputKey, setProfilePictureInputKey] = useState(0);
  const [pendingProfilePictureFile, setPendingProfilePictureFile] =
    useState<File | null>(null);
  const [isProfilePictureCropOpen, setIsProfilePictureCropOpen] =
    useState(false);

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
        setPendingProfilePictureFile(null);
        setIsProfilePictureCropOpen(false);
        setFieldErrors({});
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
  }, []);

  const savedProfile = useMemo<BackendUser>(() => {
    if (profile) {
      return profile;
    }

    return {
      id: user?.id || 0,
      full_name: user?.name || "",
      email: user?.email || "",
      role: "tenant",
      phone_number: "",
      nik: "",
      emergency_contact_name: "",
      emergency_contact_number: "",
      relationship: "",
    };
  }, [profile, user?.email, user?.id, user?.name]);

  const savedCompleteness = useMemo(() => {
    const missingFields = getIncompleteTenantProfileFields(savedProfile);

    return {
      isComplete: missingFields.length === 0,
      missingFields,
    };
  }, [savedProfile]);

  const avatarUrl =
    profilePicturePreview ||
    resolveAvatarUrl(profile?.profile_picture_url || user?.avatar || null);

  const handleProfilePictureChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.currentTarget.value = "";
    if (!file) {
      return;
    }

    const validationError = getProfilePictureValidationError(file);
    if (validationError) {
      setError(validationError);
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

    setError(null);
    setSuccessMessage(null);
    setPendingProfilePictureFile(file);
    setIsProfilePictureCropOpen(true);
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

  const handleCloseProfilePictureCrop = () => {
    setPendingProfilePictureFile(null);
    setIsProfilePictureCropOpen(false);
    setProfilePictureInputKey((prev) => prev + 1);
  };

  const handleApplyProfilePictureCrop = (result: {
    file: File;
    previewUrl: string;
  }) => {
    setProfilePicture(result.file);
    setProfilePicturePreview((previous) => {
      if (previous?.startsWith("blob:")) {
        URL.revokeObjectURL(previous);
      }

      return result.previewUrl;
    });
    setPendingProfilePictureFile(null);
    setIsProfilePictureCropOpen(false);
    setProfilePictureInputKey((prev) => prev + 1);
    setError(null);
    setSuccessMessage(null);
  };

  const handleSaveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);
    const nextFieldErrors = getProfileFormErrors(form);
    setFieldErrors(nextFieldErrors);

    const firstFieldError = Object.values(nextFieldErrors)[0];
    if (firstFieldError) {
      setError(firstFieldError);
      return;
    }

    const userId = profile?.id ?? user?.id;
    if (!userId) {
      setError("ID pengguna tidak ditemukan. Silakan muat ulang halaman ini.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await updateTenantProfile({
        user_id: userId,
        full_name: normalizeTextInput(form.fullName),
        phone_number: sanitizePhoneInput(form.phoneNumber),
        nik: sanitizeNikInput(form.nik),
        emergency_contact_name: normalizeTextInput(form.emergencyContactName),
        emergency_contact_number: sanitizePhoneInput(form.emergencyContactNumber),
        relationship: normalizeTextInput(form.relationship),
        profile_picture: profilePicture,
      });

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
      setPendingProfilePictureFile(null);
      setIsProfilePictureCropOpen(false);
      setFieldErrors({});
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
            <h1 className="text-3xl font-semibold">Profil</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/90">
              Lengkapi data diri untuk bisa mengajukan jadwal kunjungan properti.
            </p>
          </div>

        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <StatChip
            icon={<UserRound size={15} />}
            label="Nama Akun"
            value={toDisplayValue(savedProfile.full_name)}
          />
          <StatChip
            icon={<Mail size={15} />}
            label="Email"
            value={toDisplayValue(profile?.email || user?.email)}
          />
          <StatChip
            icon={savedCompleteness.isComplete ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
            label="Status Profil"
            value={savedCompleteness.isComplete ? "Lengkap" : "Belum Lengkap"}
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
              {toDisplayValue(savedProfile.full_name)}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {toDisplayValue(profile?.email || user?.email)}
            </p>

            <div className="mt-4 space-y-2">
              <label
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
              >
                <Upload size={13} className="text-blue-700" />
                Ganti Foto Profil
                <input
                  key={profilePictureInputKey}
                  type="file"
                  accept={PROFILE_PICTURE_ACCEPT}
                  className="hidden"
                  onChange={handleProfilePictureChange}
                />
              </label>

              <p className="text-xs text-slate-500">
                Format PNG/JPG/JPEG, maksimal 5 MB.
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
                savedCompleteness.isComplete
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-amber-200 bg-amber-50 text-amber-700"
              }`}
            >
              {savedCompleteness.isComplete ? (
                <p>Profil sudah lengkap. Kamu bisa mengajukan jadwal kunjungan.</p>
              ) : (
                <p>
                  Profil belum lengkap.
                  <br />
                  Lengkapi: {savedCompleteness.missingFields.join(", ")}.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border bg-white p-5 shadow-sm lg:col-span-2">
            <h2 className="text-lg font-semibold text-slate-800">
              Formulir Data Diri Penyewa
            </h2>

            <form onSubmit={handleSaveProfile} className="mt-4 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <InputField
                  label="Nama Lengkap"
                  icon={<UserRound size={14} />}
                  value={form.fullName}
                  onChange={(value) =>
                    setForm((prev) => ({ ...prev, fullName: value }))
                  }
                  placeholder="Masukkan nama lengkap"
                  error={fieldErrors.fullName}
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
                    setForm((prev) => ({
                      ...prev,
                      phoneNumber: sanitizePhoneInput(value),
                    }))
                  }
                  placeholder="Contoh: 081234567890"
                  type="tel"
                  inputMode="numeric"
                  maxLength={16}
                  error={fieldErrors.phoneNumber}
                />
                <InputField
                  label="NIK"
                  icon={<IdCard size={14} />}
                  value={form.nik}
                  onChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      nik: sanitizeNikInput(value),
                    }))
                  }
                  placeholder={`${NIK_LENGTH} digit NIK`}
                  inputMode="numeric"
                  maxLength={NIK_LENGTH}
                  error={fieldErrors.nik}
                />
                <InputField
                  label="Nama Kontak Darurat"
                  icon={<ShieldCheck size={14} />}
                  value={form.emergencyContactName}
                  onChange={(value) =>
                    setForm((prev) => ({ ...prev, emergencyContactName: value }))
                  }
                  placeholder="Nama keluarga terdekat"
                  error={fieldErrors.emergencyContactName}
                />
                <InputField
                  label="No. Kontak Darurat"
                  icon={<Phone size={14} />}
                  value={form.emergencyContactNumber}
                  onChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      emergencyContactNumber: sanitizePhoneInput(value),
                    }))
                  }
                  placeholder="Nomor yang bisa dihubungi"
                  type="tel"
                  inputMode="numeric"
                  maxLength={16}
                  error={fieldErrors.emergencyContactNumber}
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
                error={fieldErrors.relationship}
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
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save size={14} />
                  {isSaving ? "Menyimpan..." : "Simpan Profil"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      <ProfileImageCropDialog
        open={isProfilePictureCropOpen}
        file={pendingProfilePictureFile}
        title="Crop Foto Profil Penyewa"
        confirmLabel="Gunakan untuk Profil"
        onClose={handleCloseProfilePictureCrop}
        onApply={handleApplyProfilePictureCrop}
      />
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
  error,
  type = "text",
  inputMode,
  maxLength,
}: {
  label: string;
  value: string;
  placeholder: string;
  icon: ReactNode;
  readOnly?: boolean;
  disabled?: boolean;
  onChange?: (value: string) => void;
  error?: string;
  type?: string;
  inputMode?: InputHTMLAttributes<HTMLInputElement>["inputMode"];
  maxLength?: number;
}) {
  const isLocked = readOnly || disabled;

  return (
    <label className="block space-y-1.5">
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
        <span className="text-blue-700">{icon}</span>
        {label}
      </span>
      <input
        type={type}
        value={value}
        readOnly={readOnly}
        disabled={disabled}
        inputMode={inputMode}
        maxLength={maxLength}
        aria-invalid={Boolean(error)}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={placeholder}
        className={`h-11 w-full rounded-xl border px-3 text-sm outline-none transition ${
          isLocked
            ? "cursor-not-allowed bg-slate-50 text-slate-500"
            : error
              ? "border-red-300 bg-white focus:border-red-500 focus:ring-2 focus:ring-red-500"
              : "bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
        }`}
      />
      {error ? <p className="text-xs text-red-500">{error}</p> : null}
    </label>
  );
}
