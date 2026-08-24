import Link from "next/link";

export default function Sidebar() {
  return (
    <aside className="flex w-full flex-col bg-[#1F2747] text-white sm:w-72 lg:w-64">
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-white/10 px-4 sm:h-20 sm:px-6">
        <h1 className="text-lg font-semibold sm:text-xl">kyrastay</h1>
      </div>

      {/* Menu */}
      <nav className="flex-1 space-y-2 px-3 py-4 text-sm sm:px-4 sm:py-6">
        <Link
          href="/admin"
          className="block rounded-lg bg-[#C9A74E] px-4 py-3 font-medium text-black"
        >
          Dasbor
        </Link>

        <Link
          href="/admin/properties"
          className="block rounded-lg px-4 py-3 transition hover:bg-white/10"
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
          Task Management
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
          className="block rounded-lg px-4 py-3 transition hover:bg-white/10"
        >
          Catatan Aktivitas
        </Link>
      </nav>

      <div className="border-t border-white/10 p-4 sm:p-6">
        <button className="text-sm text-red-400 hover:text-red-300">
          Keluar
        </button>
      </div>
    </aside>
  );
}
