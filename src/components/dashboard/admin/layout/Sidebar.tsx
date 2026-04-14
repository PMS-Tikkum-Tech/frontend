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
          Dashboard
        </Link>

        <Link
          href="/admin/properties"
          className="block px-4 py-3 rounded-lg hover:bg-white/10 transition"
        >
          Properties
        </Link>

        <Link
          href="/admin/tenants"
          className="block px-4 py-3 rounded-lg hover:bg-white/10 transition"
        >
          Tenants
        </Link>

        <Link
          href="/admin/maintenance"
          className="block px-4 py-3 rounded-lg hover:bg-white/10 transition"
        >
          Maintenance
        </Link>

        <Link
          href="/admin/financial"
          className="block px-4 py-3 rounded-lg hover:bg-white/10 transition"
        >
          Financial
        </Link>

        <Link
          href="/admin/billing"
          className="block px-4 py-3 rounded-lg hover:bg-white/10 transition"
        >
          Billing & Payment
        </Link>

        <Link
          href="/admin/communication"
          className="block px-4 py-3 rounded-lg hover:bg-white/10 transition"
        >
          Communication
        </Link>

        <Link
          href="/admin/account"
          className="block px-4 py-3 rounded-lg hover:bg-white/10 transition"
        >
          Account
        </Link>

        <Link
          href="/admin/log-activity"
          className="block px-4 py-3 rounded-lg hover:bg-white/10 transition"
        >
          Log Activity
        </Link>
      </nav>

      <div className="p-6 border-t border-white/10">
        <button className="text-sm text-red-400 hover:text-red-300">
          Logout
        </button>
      </div>
    </aside>
  );
}
