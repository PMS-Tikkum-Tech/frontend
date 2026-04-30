"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  ClipboardList,
  Home,
  SendHorizonal,
  ShieldAlert,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  createTenantMaintenanceRequest,
  getApiErrorMessage,
  getTenantPayments,
  type TenantPayment,
} from "@/lib/dashboard/tenant.api";
import { getTenantUnitDisplayName } from "@/lib/dashboard/tenant-unit-display";

type UnitOption = {
  propertyId: number;
  propertyName: string;
  unitId: number;
  unitName: string;
};

const CATEGORY_OPTIONS = [
  { value: "electrical", label: "Kelistrikan" },
  { value: "plumbing", label: "Air / Plumbing" },
  { value: "appliance", label: "Peralatan" },
  { value: "cleaning", label: "Kebersihan" },
  { value: "pest_control", label: "Hama" },
  { value: "hvac", label: "AC / Ventilasi" },
  { value: "carpentry", label: "Pertukangan" },
  { value: "general", label: "Lainnya" },
];

const PRIORITY_OPTIONS = [
  { value: "high", label: "Mendesak" },
  { value: "medium", label: "Perlu Segera" },
  { value: "low", label: "Tidak Mendesak" },
] as const;

type PriorityValue = (typeof PRIORITY_OPTIONS)[number]["value"];

export default function ComplaintPage() {
  const { user } = useAuth();
  const [unitOptions, setUnitOptions] = useState<UnitOption[]>([]);
  const [isLoadingUnit, setIsLoadingUnit] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [selectedUnit, setSelectedUnit] = useState("");
  const [issue, setIssue] = useState("");
  const [category, setCategory] = useState("general");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<PriorityValue>("medium");

  const loadUnitOptions = async () => {
    setIsLoadingUnit(true);
    setError(null);

    try {
      const response = await getTenantPayments({ page: 1, per_page: 100 });

      const uniqueOptions = new Map<number, UnitOption>();
      response.data.forEach((payment: TenantPayment) => {
        if (!payment.property.id || !payment.unit.id) {
          return;
        }

        uniqueOptions.set(payment.unit.id, {
          propertyId: payment.property.id,
          propertyName: payment.property.name || "-",
          unitId: payment.unit.id,
          unitName: getTenantUnitDisplayName(payment.unit),
        });
      });

      setUnitOptions(Array.from(uniqueOptions.values()));
    } catch (loadError) {
      setError(
        getApiErrorMessage(
          loadError,
          "Gagal memuat daftar unit. Coba muat ulang halaman."
        )
      );
    } finally {
      setIsLoadingUnit(false);
    }
  };

  useEffect(() => {
    void loadUnitOptions();
  }, []);

  const selectedUnitOption = useMemo(() => {
    if (!selectedUnit) {
      return null;
    }

    return (
      unitOptions.find((option) => String(option.unitId) === selectedUnit) || null
    );
  }, [selectedUnit, unitOptions]);

  const resetForm = () => {
    setIssue("");
    setDescription("");
    setCategory("general");
    setPriority("medium");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!selectedUnitOption) {
      setError("Pilih unit terlebih dahulu.");
      return;
    }

    if (!issue.trim()) {
      setError("Judul keluhan wajib diisi.");
      return;
    }

    if (!description.trim()) {
      setError("Detail keluhan wajib diisi.");
      return;
    }

    setIsSubmitting(true);

    try {
      await createTenantMaintenanceRequest({
        property_id: selectedUnitOption.propertyId,
        unit_id: selectedUnitOption.unitId,
        issue: issue.trim(),
        category,
        description: description.trim(),
        priority,
        requested_date: new Date().toISOString().slice(0, 10),
      });

      resetForm();
      setSuccessMessage(
        "Keluhan berhasil dikirim. Tim kami akan segera menindaklanjuti."
      );
    } catch (submitError) {
      setError(
        getApiErrorMessage(submitError, "Gagal mengirim keluhan. Silakan coba lagi.")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-amber-600 via-orange-600 to-rose-600 p-6 text-white shadow-sm">
        <div className="pointer-events-none absolute -left-10 top-0 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -right-12 bottom-0 h-44 w-44 rounded-full bg-white/10 blur-3xl" />

        <div className="relative">
          <h1 className="text-3xl font-semibold">Ajukan Keluhan</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/90">
            Laporkan kendala unit dengan detail agar tim operasional bisa
            menindaklanjuti lebih cepat.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <StatCard
              icon={<Home size={15} />}
              label="Unit Tersedia"
              value={`${unitOptions.length}`}
            />
            <StatCard
              icon={<ClipboardList size={15} />}
              label="Kategori Keluhan"
              value={`${CATEGORY_OPTIONS.length}`}
            />
            <StatCard
              icon={<ShieldAlert size={15} />}
              label="Prioritas"
              value="Mendesak / Normal"
            />
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <InfoCard
          title="Isi Data dengan Jelas"
          desc="Tuliskan masalah utama, dampak yang dirasakan, dan sejak kapan terjadi."
        />
        <InfoCard
          title="Pilih Unit yang Benar"
          desc="Keluhan diproses berdasarkan unit yang kamu pilih pada formulir."
        />
        <InfoCard
          title="Pantau Statusnya"
          desc="Setelah terkirim, progres perbaikan bisa dipantau di menu Perawatan."
          href="/tenant/perawatan"
          cta="Lihat Perawatan"
        />
      </section>

      <section className="rounded-2xl border bg-white p-5 shadow-sm md:p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Nama Penyewa">
              <input
                type="text"
                value={user?.name || "-"}
                readOnly
                className="w-full rounded-xl border bg-slate-50 px-4 py-3 text-sm text-slate-700"
              />
            </Field>

            <Field label="Informasi Unit">
              <div className="flex items-center gap-2">
                <select
                  value={selectedUnit}
                  onChange={(event) => setSelectedUnit(event.target.value)}
                  className="w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none transition focus:border-orange-400"
                  disabled={isLoadingUnit}
                >
                  <option value="">
                    {isLoadingUnit ? "Memuat unit..." : "Pilih Unit"}
                  </option>
                  {unitOptions.map((option) => (
                    <option key={option.unitId} value={option.unitId}>
                      {option.propertyName} - {option.unitName}
                    </option>
                  ))}
                </select>
              </div>
            </Field>
          </div>

          <Field label="Judul Keluhan">
            <input
              type="text"
              value={issue}
              onChange={(event) => setIssue(event.target.value)}
              placeholder="Contoh: AC tidak dingin"
              className="w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none transition focus:border-orange-400"
            />
          </Field>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Kategori">
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none transition focus:border-orange-400"
              >
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Prioritas">
              <select
                value={priority}
                onChange={(event) => setPriority(event.target.value as PriorityValue)}
                className="w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none transition focus:border-orange-400"
              >
                {PRIORITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Detail Keluhan">
            <textarea
              rows={5}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Jelaskan kronologi masalah, area yang terdampak, dan kondisi saat ini."
              className="w-full resize-none rounded-xl border bg-white px-4 py-3 text-sm outline-none transition focus:border-orange-400"
            />
          </Field>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {successMessage}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl border border-slate-200 bg-white px-5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              disabled={isSubmitting}
            >
              Atur Ulang Formulir
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting}
            >
              <SendHorizonal size={14} />
              {isSubmitting ? "Mengirim..." : "Kirim Keluhan"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function StatCard({
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
      <p className="mt-1 text-base font-semibold text-white">{value}</p>
    </div>
  );
}

function InfoCard({
  title,
  desc,
  href,
  cta,
}: {
  title: string;
  desc: string;
  href?: string;
  cta?: string;
}) {
  return (
    <article className="rounded-2xl border bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
      <p className="mt-1 text-sm text-slate-600">{desc}</p>
      {href && cta ? (
        <Link
          href={href}
          className="mt-3 inline-flex rounded-lg border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-medium text-orange-700 transition hover:bg-orange-100"
        >
          {cta}
        </Link>
      ) : null}
    </article>
  );
}
