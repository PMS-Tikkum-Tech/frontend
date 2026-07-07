"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type MenuItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
};

export default function Sidebar({
  title,
  menu,
}: {
  title: string;
  menu: MenuItem[];
}) {
  const pathname = usePathname();

  return (
    <aside className="flex w-full flex-col bg-[#1E2746] text-white sm:w-72 lg:w-64">
      {/* Header */}
      <div className="border-b border-white/10 px-4 py-4 sm:px-6 sm:py-5">
        <h1 className="text-lg font-semibold tracking-wide sm:text-xl">{title}</h1>
      </div>

      {/* Menu */}
      <nav className="flex-1 space-y-2 p-3 sm:p-4">
        {menu.map((item) => {
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium
                transition
                ${
                  active
                    ? "bg-[#C9A95C] text-[#1E2746]"
                    : "text-white hover:bg-white/10"
                }
              `}
            >
              <span className="w-5 h-5">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/10 p-3 sm:p-4">
        <button className="flex h-11 w-full items-center gap-3 rounded-xl px-4 text-sm hover:bg-white/10">
          Keluar
        </button>
      </div>
    </aside>
  );
}
