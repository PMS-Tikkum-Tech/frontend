import PublicHeader from "@/components/header/PublicHeader";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="font-plus-jakarta overflow-x-hidden">
      <PublicHeader />
      <main className="bg-slate-50 min-h-screen">{children}</main>
    </div>
  );
}
