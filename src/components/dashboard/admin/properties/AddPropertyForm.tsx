"use client";

import { useState } from "react";

export default function AddPropertyForm({
  onSubmit,
}: {
  onSubmit?: (data: any) => void;
}) {
  const [form, setForm] = useState({
    nama: "",
    alamat: "",
    deskripsi: "",
    totalUnit: "",
    status: "Aktif",
    fasilitas: "",
    catatan: "",
    foto: [] as File[],
  });

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setForm({ ...form, foto: Array.from(e.target.files) });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.nama || !form.alamat || !form.totalUnit) {
      alert("Mohon lengkapi data wajib.");
      return;
    }

    const payload = {
      ...form,
      fasilitas: form.fasilitas
        ? form.fasilitas.split(",").map((f) => f.trim())
        : [],
    };

    onSubmit?.(payload);

    alert("Properti berhasil ditambahkan (simulasi).");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* ================= NAMA ================= */}
      <Input
        label="Nama Properti"
        name="nama"
        value={form.nama}
        onChange={handleChange}
        required
      />

      {/* ================= ALAMAT ================= */}
      <Input
        label="Alamat"
        name="alamat"
        value={form.alamat}
        onChange={handleChange}
        required
      />

      {/* ================= TOTAL UNIT ================= */}
      <Input
        label="Total Unit"
        name="totalUnit"
        type="number"
        value={form.totalUnit}
        onChange={handleChange}
        required
      />

      {/* ================= STATUS ================= */}
      <Select
        label="Status Properti"
        name="status"
        value={form.status}
        onChange={handleChange}
      >
        <option value="Aktif">Aktif</option>
        <option value="Renovasi">Renovasi</option>
        <option value="Ditutup">Ditutup Sementara</option>
      </Select>

      {/* ================= DESKRIPSI ================= */}
      <Textarea
        label="Deskripsi"
        name="deskripsi"
        value={form.deskripsi}
        onChange={handleChange}
        placeholder="Masukkan deskripsi singkat properti"
      />

      {/* ================= FASILITAS ================= */}
      <Input
        label="Fasilitas (pisahkan dengan koma)"
        name="fasilitas"
        value={form.fasilitas}
        onChange={handleChange}
        placeholder="Contoh: CCTV, Laundry, Parkir"
      />

      {/* ================= FOTO ================= */}
      <div>
        <label className="text-sm font-medium text-slate-700">
          Foto Properti
        </label>

        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleFile}
          className="mt-1 block text-sm"
        />
      </div>

      {/* ================= CATATAN ================= */}
      <Textarea
        label="Catatan Internal (Opsional)"
        name="catatan"
        value={form.catatan}
        onChange={handleChange}
        placeholder="Hanya terlihat oleh admin"
      />

      {/* ================= SUBMIT ================= */}
      <div className="flex justify-end pt-2">
        <button
          type="submit"
          className="bg-[#1E2746] hover:bg-[#141B35] text-white px-6 h-11 rounded-xl font-medium"
        >
          Simpan Properti
        </button>
      </div>
    </form>
  );
}

/* ======================================================
   KOMPONEN INPUT GENERIK
====================================================== */

function Input({ label, ...props }: any) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-700">{label}</label>

      <input
        {...props}
        className="w-full mt-1 px-4 h-11 rounded-xl border text-sm"
      />
    </div>
  );
}

function Textarea({ label, ...props }: any) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-700">{label}</label>

      <textarea
        {...props}
        rows={4}
        className="w-full mt-1 px-4 py-2 rounded-xl border text-sm"
      />
    </div>
  );
}

function Select({ label, children, ...props }: any) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-700">{label}</label>

      <select
        {...props}
        className="w-full mt-1 px-4 h-11 rounded-xl border text-sm"
      >
        {children}
      </select>
    </div>
  );
}
