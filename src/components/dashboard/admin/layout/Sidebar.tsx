import Link from "next/link";

export default function Sidebar() {
  return (
    <aside className="w-64 bg-[#1F2747] text-white flex flex-col">
      {/* Logo */}
      <div className="h-20 flex items-center px-6 border-b border-white/10">
        <h1 className="text-xl font-semibold">kyrastay</h1>
      </div>

      {/* Menu */}
      <nav className="flex-1 px-4 py-6 space-y-2 text-sm">
        <Link
          href="/admin"
          className="block px-4 py-3 rounded-lg bg-[#C9A74E] text-black font-medium"
        >
          Dasbor
        </Link>

        <Link
          href="/admin/properties"
          className="block px-4 py-3 rounded-lg hover:bg-white/10 transition"
        >
          Properti
        </Link>

        <Link
          href="/admin/tenants"
          className="block px-4 py-3 rounded-lg hover:bg-white/10 transition"
        >
          Penyewa
        </Link>

        <Link
          href="/admin/maintenance"
          className="block px-4 py-3 rounded-lg hover:bg-white/10 transition"
        >
          Perawatan
        </Link>

        <Link
          href="/admin/financial"
          className="block px-4 py-3 rounded-lg hover:bg-white/10 transition"
        >
          Keuangan
        </Link>

        <Link
          href="/admin/billing"
          className="block px-4 py-3 rounded-lg hover:bg-white/10 transition"
        >
          Tagihan & Pembayaran
        </Link>

        <Link
          href="/admin/communication"
          className="block px-4 py-3 rounded-lg hover:bg-white/10 transition"
        >
          Komunikasi
        </Link>

        <Link
          href="/admin/account"
          className="block px-4 py-3 rounded-lg hover:bg-white/10 transition"
        >
          Akun
        </Link>

        <Link
          href="/admin/log-activity"
          className="block px-4 py-3 rounded-lg hover:bg-white/10 transition"
        >
          Catatan Aktivitas
        </Link>
      </nav>

      <div className="p-6 border-t border-white/10">
        <button className="text-sm text-red-400 hover:text-red-300">
          Keluar
        </button>
      </div>
    </aside>
  );
}
