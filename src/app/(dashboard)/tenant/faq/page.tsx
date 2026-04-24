"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronDown, LifeBuoy, MessageSquareText, Search } from "lucide-react";

type FaqItem = { q: string; a: string };

const categories = [
  "Umum",
  "Pemesanan Kost",
  "Pembayaran & Tagihan",
  "Tinggal di Kost",
  "Perawatan",
  "Akun & Keamanan",
];

const faqs: Record<string, FaqItem[]> = {
  Umum: [
    {
      q: "Apa itu Kyra Stay?",
      a: "Kyra Stay adalah layanan manajemen dan pencarian kost khusus mahasiswa IPB dengan fasilitas lengkap dan harga transparan.",
    },
    {
      q: "Bagaimana cara mencari kost?",
      a: "Gunakan fitur pencarian di halaman Sewa untuk menemukan kost sesuai lokasi, harga, dan kebutuhan kamu.",
    },
  ],
  "Pemesanan Kost": [
    {
      q: "Bagaimana cara memesan kamar?",
      a: "Pilih kost, lalu klik Pesan Kamar. Isi data penyewa dan lanjutkan proses pembayaran sesuai instruksi.",
    },
    {
      q: "Apakah saya bisa menjadwalkan kunjungan dulu?",
      a: "Bisa. Kamu dapat mengajukan jadwal kunjungan sebelum memutuskan untuk melanjutkan pemesanan.",
    },
  ],
  "Pembayaran & Tagihan": [
    {
      q: "Metode pembayaran apa saja yang tersedia?",
      a: "Pembayaran mendukung transfer bank, dompet digital, dan metode lain yang tersedia di faktur.",
    },
    {
      q: "Di mana saya melihat status tagihan?",
      a: "Buka menu Tagihan & Pembayaran untuk melihat tagihan aktif, jatuh tempo, dan riwayat pembayaran.",
    },
  ],
  "Tinggal di Kost": [
    {
      q: "Apakah tamu diperbolehkan?",
      a: "Tamu diperbolehkan sesuai aturan masing-masing properti. Selalu cek peraturan kost pada detail properti.",
    },
    {
      q: "Bagaimana jika ingin memperpanjang sewa?",
      a: "Silakan hubungi administrator melalui Pusat Bantuan agar proses perpanjangan dapat dibantu lebih lanjut.",
    },
  ],
  Perawatan: [
    {
      q: "Bagaimana melaporkan kerusakan?",
      a: "Masuk ke menu Ajukan Keluhan, pilih unit, lalu isi detail masalah dan prioritasnya.",
    },
    {
      q: "Di mana saya memantau progres perbaikan?",
      a: "Progres dapat dipantau di menu Perawatan.",
    },
  ],
  "Akun & Keamanan": [
    {
      q: "Bagaimana mengubah kata sandi?",
      a: "Buka menu Kata Sandi, isi kata sandi saat ini, lalu masukkan kata sandi baru.",
    },
    {
      q: "Bagaimana jika lupa akun masuk?",
      a: "Hubungi administrator melalui Pusat Bantuan agar tim dapat membantu verifikasi akun kamu.",
    },
  ],
};

export default function FAQPage() {
  const [activeCategory, setActiveCategory] = useState("Umum");
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const visibleFaq = useMemo(() => {
    const currentFaq = faqs[activeCategory] || [];
    const keyword = search.trim().toLowerCase();
    if (!keyword) {
      return currentFaq;
    }

    return currentFaq.filter((item) => {
      return (
        item.q.toLowerCase().includes(keyword) ||
        item.a.toLowerCase().includes(keyword)
      );
    });
  }, [activeCategory, search]);

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-emerald-700 via-green-700 to-teal-700 p-6 text-white shadow-sm">
        <div className="pointer-events-none absolute -left-12 top-0 h-44 w-44 rounded-full bg-white/15 blur-2xl" />
        <div className="pointer-events-none absolute -right-12 bottom-0 h-44 w-44 rounded-full bg-white/10 blur-3xl" />

        <div className="relative space-y-3">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/10 px-3 py-1 text-xs font-medium">
            <LifeBuoy size={14} />
            Pusat Bantuan Penyewa
          </p>
          <h1 className="text-3xl font-semibold">Pertanyaan Umum (FAQ)</h1>
          <p className="max-w-2xl text-sm text-white/90">
            Cari jawaban cepat terkait penyewaan, pembayaran, perawatan, dan akun.
          </p>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
          <Search size={16} className="text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari pertanyaan..."
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => {
                setActiveCategory(category);
                setOpenIndex(null);
              }}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                activeCategory === category
                  ? "bg-green-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </section>

      {visibleFaq.length === 0 ? (
        <div className="rounded-2xl border bg-white p-8 text-center">
          <p className="text-sm text-slate-600">
            Tidak ada FAQ yang cocok dengan kata kunci kamu.
          </p>
        </div>
      ) : (
        <section className="space-y-3">
          {visibleFaq.map((faq, index) => {
            const isOpen = openIndex === index;

            return (
              <article
                key={`${faq.q}-${index}`}
                className="overflow-hidden rounded-2xl border bg-white shadow-sm"
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
                >
                  <span className="inline-flex items-start gap-2 text-sm font-medium text-slate-800">
                    <MessageSquareText size={16} className="mt-0.5 text-green-700" />
                    {faq.q}
                  </span>
                  <ChevronDown
                    size={18}
                    className={`shrink-0 text-slate-500 transition ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="border-t border-slate-100 px-5 py-4 text-sm leading-relaxed text-slate-600">
                    {faq.a}
                  </div>
                )}
              </article>
            );
          })}
        </section>
      )}

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-600">
          Pertanyaan kamu belum terjawab?
        </p>
        <Link
          href="/tenant/bantuan"
          className="mt-3 inline-flex rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700"
        >
          Hubungi Pusat Bantuan
        </Link>
      </section>
    </div>
  );
}
