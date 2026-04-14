import PublicHeader from "@/components/header/PublicHeader";
import { Plus_Jakarta_Sans } from "next/font/google";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
});

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${jakarta.className} overflow-x-hidden`}>
      <PublicHeader />
      <main className="bg-slate-50 min-h-screen">{children}</main>
    </div>
  );
}
