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
      className={`bg-white rounded-2xl p-6 shadow-sm border border-slate-200 ${className}`}
    >
      {children}
    </div>
  );
}
