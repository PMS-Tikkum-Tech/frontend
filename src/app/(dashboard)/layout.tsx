export default function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="kikost-dashboard-theme min-h-screen">{children}</div>;
}
