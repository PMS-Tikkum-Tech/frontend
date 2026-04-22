"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import {
  toAbsoluteAssetUrl,
  type AdminPropertyUpsertPayload,
  type AdminUser,
} from "@/lib/dashboard/admin.api";
import {
  geocodePropertyAddressWithGoogle,
  geocodePropertyAddress,
} from "@/lib/maps/property-coordinate";

interface AddPropertyModalProps {
  open: boolean;
  owners: AdminUser[];
  onClose: () => void;
  onSave: (payload: AdminPropertyUpsertPayload) => Promise<void>;
  title?: string;
  submitLabel?: string;
  initialValue?: {
    owner_id?: number;
    name?: string;
    address?: string;
    latitude?: number | null;
    longitude?: number | null;
    property_type?: string;
    condition?: string;
    description?: string;
    rules?: string;
    facilities?: string[];
    video_360_url?: string | null;
  };
}

interface PropertyFormState {
  ownerId: string;
  name: string;
  address: string;
  latitude: string;
  longitude: string;
  propertyType: string;
  condition: string;
  description: string;
  rules: string;
}

const FACILITY_OPTIONS = [
  { value: "wifi", label: "WiFi" },
  { value: "parking_area", label: "Area Parkir" },
  { value: "kitchen", label: "Dapur" },
  { value: "pet_friendly", label: "Ramah Hewan" },
  { value: "cctv", label: "CCTV" },
  { value: "ac", label: "AC" },
  { value: "laundry", label: "Laundry" },
  { value: "swimming_pool", label: "Kolam Renang" },
  { value: "gym", label: "Pusat Kebugaran" },
  { value: "security_24h", label: "Keamanan 24 Jam" },
  { value: "elevator", label: "Lift" },
  { value: "generator_backup", label: "Genset" },
  { value: "balcony", label: "Balkon" },
  { value: "furnished", label: "Berperabot" },
  { value: "garden", label: "Taman" },
  { value: "rooftop_access", label: "Akses Rooftop" },
];

const PROPERTY_TYPE_OPTIONS = [
  { value: "kost", label: "Kost" },
  { value: "apartment", label: "Apartemen" },
  { value: "house", label: "Rumah" },
  { value: "villa", label: "Vila" },
  { value: "studio_apartment", label: "Apartemen Studio" },
  { value: "townhouse", label: "Rumah Deret" },
];

const CONDITION_OPTIONS = [
  { value: "excellent", label: "Sangat Baik" },
  { value: "good", label: "Baik" },
  { value: "fair", label: "Cukup" },
  { value: "maintenance", label: "Butuh Perawatan" },
];

const getInitialFormState = (
  owners: AdminUser[],
  initialValue?: AddPropertyModalProps["initialValue"]
): PropertyFormState => ({
  ownerId: initialValue?.owner_id
    ? String(initialValue.owner_id)
    : owners[0]?.id
      ? String(owners[0].id)
      : "",
  name: initialValue?.name || "",
  address: initialValue?.address || "",
  latitude:
    typeof initialValue?.latitude === "number" &&
    Number.isFinite(initialValue.latitude)
      ? String(initialValue.latitude)
      : "",
  longitude:
    typeof initialValue?.longitude === "number" &&
    Number.isFinite(initialValue.longitude)
      ? String(initialValue.longitude)
      : "",
  propertyType: initialValue?.property_type || "kost",
  condition: initialValue?.condition || "good",
  description: initialValue?.description || "",
  rules: initialValue?.rules || "",
});

const parseOptionalCoordinate = (
  value: string,
  range: { min: number; max: number },
  label: string
) => {
  const normalized = value.trim().replace(",", ".");

  if (!normalized) {
    return { value: undefined as number | undefined, error: null as string | null };
  }

  const numeric = Number.parseFloat(normalized);
  if (!Number.isFinite(numeric)) {
    return { value: undefined, error: `${label} harus berupa angka yang valid.` };
  }

  if (numeric < range.min || numeric > range.max) {
    return {
      value: undefined,
      error: `${label} harus berada di rentang ${range.min} sampai ${range.max}.`,
    };
  }

  return { value: numeric, error: null as string | null };
};

const normalizeAddressSyncKey = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, " ");

const formatCoordinateInputValue = (value: number) =>
  value
    .toFixed(7)
    .replace(/0+$/, "")
    .replace(/\.$/, "");

export default function AddPropertyModal({
  open,
  owners,
  onClose,
  onSave,
  title = "Tambah Properti",
  submitLabel = "Simpan Properti",
  initialValue,
}: AddPropertyModalProps) {
  const [form, setForm] = useState<PropertyFormState>(() =>
    getInitialFormState(owners, initialValue)
  );
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>([]);
  const [photos, setPhotos] = useState<File[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [video360File, setVideo360File] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const existingVideo360Url = initialValue?.video_360_url
    ? toAbsoluteAssetUrl(initialValue.video_360_url) ||
      initialValue.video_360_url
    : null;

  useEffect(() => {
    if (!open) {
      return;
    }

    setForm(getInitialFormState(owners, initialValue));
    setSelectedFacilities(initialValue?.facilities || []);
    setPhotos([]);
    setVideoFile(null);
    setVideo360File(null);
    setErrorMessage(null);
  }, [open, owners, initialValue]);

  if (!open) {
    return null;
  }

  const updateFormField = (field: keyof PropertyFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const syncCoordinatesFromGoogle = async (
    addressInput: string
  ) => {
    const addressKey = normalizeAddressSyncKey(addressInput);
    if (!addressKey) {
      return null;
    }

    try {
      const googleGeocoded = await geocodePropertyAddressWithGoogle(
        addressInput,
        form.name
      );
      const resolvedCoordinate =
        googleGeocoded?.coordinate ??
        (await geocodePropertyAddress(addressInput, form.name));

      if (!resolvedCoordinate) {
        return null;
      }

      setForm((prev) => ({
        ...prev,
        latitude: formatCoordinateInputValue(resolvedCoordinate.lat),
        longitude: formatCoordinateInputValue(resolvedCoordinate.lng),
      }));

      if (googleGeocoded) {
        return googleGeocoded;
      }

      return {
        coordinate: resolvedCoordinate,
        formattedAddress: addressInput,
        placeId: null,
        locationType: null,
        partialMatch: false,
      };
    } catch {
      return null;
    }
  };

  const toggleFacility = (value: string) => {
    setSelectedFacilities((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value]
    );
  };

  const handleSubmit = async () => {
    if (!form.ownerId) {
      setErrorMessage("Pilih pemilik properti terlebih dahulu.");
      return;
    }

    if (!form.name || !form.address) {
      setErrorMessage("Nama dan alamat properti wajib diisi.");
      return;
    }

    let resolvedLatitudeValue: number | undefined;
    let resolvedLongitudeValue: number | undefined;

    const geocoded = await syncCoordinatesFromGoogle(form.address);

    if (geocoded) {
      resolvedLatitudeValue = geocoded.coordinate.lat;
      resolvedLongitudeValue = geocoded.coordinate.lng;
    } else {
      const latitudeParsed = parseOptionalCoordinate(
        form.latitude,
        { min: -90, max: 90 },
        "Latitude"
      );
      const longitudeParsed = parseOptionalCoordinate(
        form.longitude,
        { min: -180, max: 180 },
        "Longitude"
      );

      if (latitudeParsed.value !== undefined && longitudeParsed.value !== undefined) {
        resolvedLatitudeValue = latitudeParsed.value;
        resolvedLongitudeValue = longitudeParsed.value;
      }
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      await onSave({
        owner_id: Number(form.ownerId),
        name: form.name,
        address: form.address,
        latitude: resolvedLatitudeValue,
        longitude: resolvedLongitudeValue,
        property_type: form.propertyType,
        condition: form.condition,
        description: form.description,
        rules: form.rules,
        facilities: selectedFacilities,
        photos,
        video: videoFile,
        video_360: video360File,
      });

      onClose();
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Gagal menyimpan properti.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-800">{title}</h2>

          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-slate-100"
            disabled={isSaving}
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5 p-6">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Pemilik Properti
            </label>
            <select
              value={form.ownerId}
              onChange={(event) => updateFormField("ownerId", event.target.value)}
              className="h-11 w-full rounded-xl border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E2746]"
            >
              <option value="">Pilih pemilik</option>
              {owners.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {owner.full_name} ({owner.email})
                </option>
              ))}
            </select>
          </div>

          <FormInput
            label="Nama Properti"
            value={form.name}
            onChange={(value) => updateFormField("name", value)}
          />

          <FormInput
            label="Alamat"
            value={form.address}
            onChange={(value) => updateFormField("address", value)}
            placeholder="Masukkan alamat lengkap properti"
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Tipe Properti
              </label>
              <select
                value={form.propertyType}
                onChange={(event) =>
                  updateFormField("propertyType", event.target.value)
                }
                className="h-11 w-full rounded-xl border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E2746]"
              >
                {PROPERTY_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Kondisi
              </label>
              <select
                value={form.condition}
                onChange={(event) =>
                  updateFormField("condition", event.target.value)
                }
                className="h-11 w-full rounded-xl border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E2746]"
              >
                {CONDITION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <FormTextarea
            label="Deskripsi"
            value={form.description}
            onChange={(value) => updateFormField("description", value)}
          />

          <FormTextarea
            label="Aturan Properti"
            value={form.rules}
            onChange={(value) => updateFormField("rules", value)}
          />

          <div>
            <p className="mb-2 block text-sm font-medium text-slate-700">
              Fasilitas
            </p>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
              {FACILITY_OPTIONS.map((facility) => (
                <label
                  key={facility.value}
                  className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={selectedFacilities.includes(facility.value)}
                    onChange={() => toggleFacility(facility.value)}
                  />
                  {facility.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Foto Properti
            </label>

            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              multiple
              onChange={(event) =>
                setPhotos(Array.from(event.target.files || []))
              }
              className="text-sm"
            />
            <p className="mt-1 text-xs text-slate-500">
              Maksimal 10 file. Format: PNG, JPG, JPEG, WEBP.
            </p>

            {photos.length > 0 && (
              <p className="mt-2 text-xs text-slate-600">
                {photos.length} file dipilih.
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Video Properti
            </label>

            <input
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              onChange={(event) => setVideoFile(event.target.files?.[0] || null)}
              className="text-sm"
            />
            <p className="mt-1 text-xs text-slate-500">
              Unggah 1 file. Format: MP4, WEBM, MOV.
            </p>

            {videoFile && (
              <p className="mt-2 text-xs text-slate-600">
                Video dipilih: {videoFile.name}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Video 360 Derajat
            </label>

            <input
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              onChange={(event) => setVideo360File(event.target.files?.[0] || null)}
              className="text-sm"
            />
            <p className="mt-1 text-xs text-slate-500">
              Unggah 1 file. Format: MP4, WEBM, MOV.
            </p>

            {video360File && (
              <p className="mt-2 text-xs text-slate-600">
                Video 360 dipilih: {video360File.name}
              </p>
            )}

            {!video360File && existingVideo360Url && (
              <div className="mt-3">
                <p className="mb-2 text-xs text-slate-500">
                  Video 360 saat ini:
                </p>
                <div className="relative h-40 w-full overflow-hidden rounded-xl border border-slate-200 bg-black">
                  <video
                    src={existingVideo360Url}
                    controls
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
            )}
          </div>

          {errorMessage && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 rounded-b-2xl border-t bg-slate-50 px-6 py-4">
          <button
            onClick={onClose}
            className="h-11 rounded-xl border px-5 font-medium hover:bg-slate-100"
            disabled={isSaving}
          >
            Batal
          </button>

          <button
            onClick={() => {
              void handleSubmit();
            }}
            className="h-11 rounded-xl bg-[#1E2746] px-6 font-medium text-white shadow-sm hover:bg-[#141B35] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSaving}
          >
            {isSaving ? "Menyimpan..." : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

interface FormInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  step?: string;
  placeholder?: string;
}

function FormInput({
  label,
  value,
  onChange,
  type = "text",
  step,
  placeholder,
}: FormInputProps) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>

      <input
        type={type}
        step={step}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E2746]"
      />
    </div>
  );
}

interface FormTextareaProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function FormTextarea({ label, value, onChange }: FormTextareaProps) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>

      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        className="w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E2746]"
      />
    </div>
  );
}
