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
    <aside className="w-64 bg-[#1E2746] text-white flex flex-col">
      {/* Header */}
      <div className="px-6 py-5 border-b border-white/10">
        <h1 className="text-xl font-semibold tracking-wide">{title}</h1>
      </div>

      {/* Menu */}
      <nav className="flex-1 p-4 space-y-2">
        {menu.map((item) => {
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 px-4 h-11 rounded-xl text-sm font-medium
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
      <div className="p-4 border-t border-white/10">
        <button className="w-full flex items-center gap-3 px-4 h-11 rounded-xl text-sm hover:bg-white/10">
          Keluar
        </button>
      </div>
    </aside>
  );
}
