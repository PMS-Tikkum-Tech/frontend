import { ReactNode } from "react";

export default function DashboardCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 ${className}`}
    >
      {children}
    </div>
  );
}
