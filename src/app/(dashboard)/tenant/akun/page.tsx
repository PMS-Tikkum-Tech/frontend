"use client";

import {
  Suspense,
  useEffect,
  useMemo,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  BriefcaseBusiness,
  Building2,
  Calendar,
  Camera,
  CheckCircle2,
  FileText,
  Home,
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
import { resolveApiBaseUrl } from "@/lib/api-base-url";
import ProfileImageCropDialog from "@/components/ui/ProfileImageCropDialog";
import SafeImage from "@/components/ui/SafeImage";
import {
  getApiErrorMessage,
  getIncompleteTenantProfileFields,
  getTenantProfile,
  updateTenantProfile,
} from "@/lib/dashboard/tenant.api";
import {
  NIK_LENGTH,
  PHONE_INPUT_MAX_LENGTH,
  getEmailValidationMessage,
  getNikValidationMessage,
  getPhoneValidationMessage,
  getTextValidationMessage,
  normalizePhoneNumber,
  normalizeTextInput,
  sanitizeEmailInput,
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

  const baseUrl = resolveApiBaseUrl();

  return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
};

const toFormValue = (value?: string | number | null) => {
  return value?.toString().trim() || "";
};

const toDisplayValue = (value?: string | number | null) => {
  const trimmed = value?.toString().trim();
  return trimmed ? trimmed : "-";
};

const OPTIONAL_DOCUMENT_ACCEPT =
  ".png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf";
const SELFIE_ACCEPT = PROFILE_PICTURE_ACCEPT;
const OPTIONAL_UPLOAD_MAX_SIZE = 5 * 1024 * 1024;

const isSafeTenantNextPath = (value?: string | null) =>
  Boolean(value?.startsWith("/tenant/") && !value.startsWith("//"));

const getDateValidationMessage = (value: string, label: string) => {
  if (!value.trim()) {
    return `${label} wajib diisi.`;
  }

  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return `${label} tidak valid.`;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (parsed > today) {
    return `${label} tidak boleh melebihi hari ini.`;
  }

  return null;
};

const getUploadValidationError = (
  file: File,
  options: {
    label: string;
    allowPdf?: boolean;
  }
) => {
  const allowedTypes = options.allowPdf
    ? ["application/pdf", "image/jpeg", "image/jpg", "image/png"]
    : ["image/jpeg", "image/jpg", "image/png"];

  if (!allowedTypes.includes(file.type)) {
    return options.allowPdf
      ? `${options.label} harus PDF, PNG, JPG, atau JPEG.`
      : `${options.label} harus PNG, JPG, atau JPEG.`;
  }

  if (file.size > OPTIONAL_UPLOAD_MAX_SIZE) {
    return `${options.label} maksimal 5 MB.`;
  }

  return null;
};

type ProfileFormState = {
  fullName: string;
  email: string;
  phoneNumber: string;
  nik: string;
  dateOfBirth: string;
  domicileAddress: string;
  occupation: string;
  institutionName: string;
  emergencyContactName: string;
  emergencyContactNumber: string;
  relationship: string;
};

type ProfileFormErrors = Partial<Record<keyof ProfileFormState, string>>;

const getInitialFormState = (): ProfileFormState => ({
  fullName: "",
  email: "",
  phoneNumber: "",
  nik: "",
  dateOfBirth: "",
  domicileAddress: "",
  occupation: "",
  institutionName: "",
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

  const emailError = getEmailValidationMessage(form.email, {
    label: "Email",
    required: true,
  });
  if (emailError) {
    errors.email = emailError;
  }

  const phoneError = getPhoneValidationMessage(form.phoneNumber, {
    label: "Nomor Telepon",
    required: true,
  });
  if (phoneError) {
    errors.phoneNumber = phoneError;
  }

  const nikError = getNikValidationMessage(form.nik, {
    label: "NIK / Nomor Identitas",
    required: true,
  });
  if (nikError) {
    errors.nik = nikError;
  }

  const dateOfBirthError = getDateValidationMessage(
    form.dateOfBirth,
    "Tanggal lahir"
  );
  if (dateOfBirthError) {
    errors.dateOfBirth = dateOfBirthError;
  }

  const domicileAddressError = getTextValidationMessage(
    form.domicileAddress,
    {
      label: "Alamat domisili",
      required: true,
      maxLength: 300,
    }
  );
  if (domicileAddressError) {
    errors.domicileAddress = domicileAddressError;
  }

  const occupationError = getTextValidationMessage(form.occupation, {
    label: "Pekerjaan / status",
    required: false,
  });
  if (occupationError) {
    errors.occupation = occupationError;
  }

  const institutionError = getTextValidationMessage(form.institutionName, {
    label: "Kampus / perusahaan",
    required: false,
  });
  if (institutionError) {
    errors.institutionName = institutionError;
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
  return (
    <Suspense
      fallback={
        <div className="rounded-2xl border bg-white p-8 text-sm text-slate-500">
          Memuat profil akun...
        </div>
      }
    >
      <TenantAccountPageContent />
    </Suspense>
  );
}

function TenantAccountPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
  const [identityDocument, setIdentityDocument] = useState<File | null>(null);
  const [selfiePhoto, setSelfiePhoto] = useState<File | null>(null);
  const [identityDocumentInputKey, setIdentityDocumentInputKey] = useState(0);
  const [selfiePhotoInputKey, setSelfiePhotoInputKey] = useState(0);
  const isBookingProfileRequired = searchParams.get("required") === "booking";
  const nextPath = searchParams.get("next");

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
          email: toFormValue(response.data.email),
          phoneNumber: sanitizePhoneInput(toFormValue(response.data.phone_number)),
          nik: toFormValue(response.data.nik),
          dateOfBirth: toFormValue(response.data.date_of_birth),
          domicileAddress: toFormValue(response.data.domicile_address),
          occupation: toFormValue(response.data.occupation),
          institutionName: toFormValue(response.data.institution_name),
          emergencyContactName: toFormValue(response.data.emergency_contact_name),
          emergencyContactNumber: sanitizePhoneInput(
            toFormValue(response.data.emergency_contact_number)
          ),
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
        setIdentityDocument(null);
        setSelfiePhoto(null);
        setIdentityDocumentInputKey((prev) => prev + 1);
        setSelfiePhotoInputKey((prev) => prev + 1);
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
      date_of_birth: "",
      domicile_address: "",
      occupation: "",
      institution_name: "",
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

  const handleIdentityDocumentChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0] || null;
    event.currentTarget.value = "";
    if (!file) {
      return;
    }

    const validationError = getUploadValidationError(file, {
      label: "Dokumen KTP",
      allowPdf: true,
    });
    if (validationError) {
      setError(validationError);
      setIdentityDocument(null);
      setIdentityDocumentInputKey((prev) => prev + 1);
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setIdentityDocument(file);
  };

  const handleSelfiePhotoChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0] || null;
    event.currentTarget.value = "";
    if (!file) {
      return;
    }

    const validationError = getUploadValidationError(file, {
      label: "Foto selfie",
    });
    if (validationError) {
      setError(validationError);
      setSelfiePhoto(null);
      setSelfiePhotoInputKey((prev) => prev + 1);
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setSelfiePhoto(file);
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
        email: sanitizeEmailInput(form.email),
        phone_number: normalizePhoneNumber(form.phoneNumber),
        nik: sanitizeNikInput(form.nik),
        date_of_birth: form.dateOfBirth,
        domicile_address: normalizeTextInput(form.domicileAddress),
        occupation: normalizeTextInput(form.occupation),
        institution_name: normalizeTextInput(form.institutionName),
        emergency_contact_name: normalizeTextInput(form.emergencyContactName),
        emergency_contact_number: sanitizePhoneInput(form.emergencyContactNumber),
        relationship: normalizeTextInput(form.relationship),
        profile_picture: profilePicture,
        identity_document: identityDocument,
        selfie_photo: selfiePhoto,
      });

      setProfile(response.data);
      setForm({
        fullName: toFormValue(response.data.full_name),
        email: toFormValue(response.data.email),
        phoneNumber: sanitizePhoneInput(toFormValue(response.data.phone_number)),
        nik: toFormValue(response.data.nik),
        dateOfBirth: toFormValue(response.data.date_of_birth),
        domicileAddress: toFormValue(response.data.domicile_address),
        occupation: toFormValue(response.data.occupation),
        institutionName: toFormValue(response.data.institution_name),
        emergencyContactName: toFormValue(response.data.emergency_contact_name),
        emergencyContactNumber: sanitizePhoneInput(
          toFormValue(response.data.emergency_contact_number)
        ),
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
      setIdentityDocument(null);
      setSelfiePhoto(null);
      setIdentityDocumentInputKey((prev) => prev + 1);
      setSelfiePhotoInputKey((prev) => prev + 1);
      setPendingProfilePictureFile(null);
      setIsProfilePictureCropOpen(false);
      setFieldErrors({});
      setSuccessMessage(response.message || "Profil berhasil diperbarui.");

      if (
        isBookingProfileRequired &&
        getIncompleteTenantProfileFields(response.data).length === 0 &&
        isSafeTenantNextPath(nextPath)
      ) {
        router.push(nextPath as string);
        router.refresh();
      }
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
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-blue-700 via-indigo-700 to-cyan-700 p-4 text-white shadow-sm sm:p-6">
        <div className="pointer-events-none absolute -left-10 top-0 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -right-12 bottom-0 h-44 w-44 rounded-full bg-white/10 blur-3xl" />

        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold sm:text-3xl">Profil</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/90">
              Lengkapi data dasar hanya saat diperlukan untuk booking atau sewa.
              Data lanjutan tetap opsional dan bisa disusulkan.
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
            value={toDisplayValue(savedProfile.email || user?.email)}
          />
          <StatChip
            icon={savedCompleteness.isComplete ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
            label="Status Profil"
            value={savedCompleteness.isComplete ? "Lengkap" : "Belum Lengkap"}
          />
        </div>
      </section>

      {isBookingProfileRequired ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 sm:px-5 sm:py-4">
          Lengkapi data dasar terlebih dahulu untuk melanjutkan proses booking
          unit. Setelah tersimpan, kamu akan diarahkan kembali ke halaman booking.
        </section>
      ) : null}

      {isLoading ? (
        <div className="rounded-2xl border bg-white p-4 text-sm text-slate-500 sm:p-8">
          Memuat profil akun...
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <section className="rounded-2xl border bg-white p-4 text-center shadow-sm sm:p-5">
            <SafeImage
              src={avatarUrl}
              alt="Foto Profil"
              width={180}
              height={180}
              className="mx-auto h-36 w-36 rounded-full border object-cover sm:h-[180px] sm:w-[180px]"
            />
            <p className="mt-4 text-base font-semibold text-slate-800">
              {toDisplayValue(savedProfile.full_name)}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {toDisplayValue(savedProfile.email || user?.email)}
            </p>

            <div className="mt-4 space-y-2">
              <label className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100">
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
                <p>Data dasar sudah lengkap. Kamu bisa melanjutkan booking.</p>
              ) : (
                <p>
                  Data dasar belum lengkap.
                  <br />
                  Lengkapi: {savedCompleteness.missingFields.join(", ")}.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border bg-white p-4 shadow-sm lg:col-span-2 sm:p-5">
            <h2 className="text-lg font-semibold text-slate-800">
              Formulir Data Diri Penyewa
            </h2>

            <form onSubmit={handleSaveProfile} className="mt-4 space-y-4">
              <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs leading-relaxed text-blue-800">
                Data dasar wajib untuk booking: nama, email, nomor telepon,
                NIK, tanggal lahir, dan alamat domisili. Kontak darurat,
                pekerjaan, dan dokumen bisa dilengkapi kapan saja.
              </div>

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
                  value={form.email}
                  onChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      email: sanitizeEmailInput(value),
                    }))
                  }
                  placeholder="nama@email.com"
                  type="email"
                  inputMode="email"
                  error={fieldErrors.email}
                />
                <InputField
                  label="Nomor Telepon"
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
                  maxLength={PHONE_INPUT_MAX_LENGTH}
                  error={fieldErrors.phoneNumber}
                />
                <InputField
                  label="NIK / Nomor Identitas"
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
                  label="Tanggal Lahir"
                  icon={<Calendar size={14} />}
                  value={form.dateOfBirth}
                  onChange={(value) =>
                    setForm((prev) => ({ ...prev, dateOfBirth: value }))
                  }
                  placeholder="YYYY-MM-DD"
                  type="date"
                  error={fieldErrors.dateOfBirth}
                />
                <InputField
                  label="Pekerjaan / Status"
                  icon={<BriefcaseBusiness size={14} />}
                  value={form.occupation}
                  onChange={(value) =>
                    setForm((prev) => ({ ...prev, occupation: value }))
                  }
                  placeholder="Opsional: karyawan, mahasiswa, freelancer"
                  error={fieldErrors.occupation}
                />
              </div>

              <TextAreaField
                label="Alamat Domisili"
                icon={<Home size={14} />}
                value={form.domicileAddress}
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, domicileAddress: value }))
                }
                placeholder="Alamat tempat tinggal saat ini"
                error={fieldErrors.domicileAddress}
              />

              <div className="border-t border-slate-100 pt-4">
                <h3 className="text-sm font-semibold text-slate-800">
                  Data Lanjutan Opsional
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Bagian ini tidak menghambat booking, tetapi bisa diminta admin
                  saat verifikasi lanjutan.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <InputField
                  label="Kampus / Perusahaan"
                  icon={<Building2 size={14} />}
                  value={form.institutionName}
                  onChange={(value) =>
                    setForm((prev) => ({ ...prev, institutionName: value }))
                  }
                  placeholder="Opsional"
                  error={fieldErrors.institutionName}
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
                  maxLength={PHONE_INPUT_MAX_LENGTH}
                  error={fieldErrors.emergencyContactNumber}
                />
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
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <UploadField
                  label="Upload KTP"
                  icon={<FileText size={14} />}
                  accept={OPTIONAL_DOCUMENT_ACCEPT}
                  inputKey={identityDocumentInputKey}
                  selectedFile={identityDocument}
                  savedUrl={profile?.identity_document_url}
                  onChange={handleIdentityDocumentChange}
                  onClear={() => {
                    setIdentityDocument(null);
                    setIdentityDocumentInputKey((prev) => prev + 1);
                  }}
                  note="Opsional. PDF/PNG/JPG/JPEG, maksimal 5 MB."
                />
                <UploadField
                  label="Upload Selfie"
                  icon={<Camera size={14} />}
                  accept={SELFIE_ACCEPT}
                  inputKey={selfiePhotoInputKey}
                  selectedFile={selfiePhoto}
                  savedUrl={profile?.selfie_photo_url}
                  onChange={handleSelfiePhotoChange}
                  onClear={() => {
                    setSelfiePhoto(null);
                    setSelfiePhotoInputKey((prev) => prev + 1);
                  }}
                  note="Opsional. PNG/JPG/JPEG, maksimal 5 MB."
                />
              </div>

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

              <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
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
    <div className="rounded-xl border border-white/30 bg-white/10 px-3 py-3 backdrop-blur-sm sm:px-4">
      <p className="inline-flex items-center gap-2 text-xs text-white/85">
        {icon}
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-semibold text-white sm:text-base">{value}</p>
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

function TextAreaField({
  label,
  value,
  placeholder,
  icon,
  onChange,
  error,
}: {
  label: string;
  value: string;
  placeholder: string;
  icon: ReactNode;
  onChange: (value: string) => void;
  error?: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
        <span className="text-blue-700">{icon}</span>
        {label}
      </span>
      <textarea
        value={value}
        rows={3}
        maxLength={300}
        aria-invalid={Boolean(error)}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition ${
          error
            ? "border-red-300 bg-white focus:border-red-500 focus:ring-2 focus:ring-red-500"
            : "bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
        }`}
      />
      {error ? <p className="text-xs text-red-500">{error}</p> : null}
    </label>
  );
}

function UploadField({
  label,
  icon,
  accept,
  inputKey,
  selectedFile,
  savedUrl,
  onChange,
  onClear,
  note,
}: {
  label: string;
  icon: ReactNode;
  accept: string;
  inputKey: number;
  selectedFile: File | null;
  savedUrl?: string | null;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
  note: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
        <span className="text-blue-700">{icon}</span>
        {label}
      </p>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100 sm:w-auto">
          <Upload size={13} className="text-blue-700" />
          Pilih File
          <input
            key={inputKey}
            type="file"
            accept={accept}
            className="hidden"
            onChange={onChange}
          />
        </label>
        {savedUrl ? (
          <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs text-emerald-700">
            Sudah tersimpan
          </span>
        ) : null}
      </div>
      {selectedFile ? (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          <span className="max-w-full truncate rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-blue-700">
            {selectedFile.name}
          </span>
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-slate-600 transition hover:bg-slate-100"
          >
            <XCircle size={12} />
            Batalkan
          </button>
        </div>
      ) : null}
      <p className="mt-2 text-xs text-slate-500">{note}</p>
    </div>
  );
}
