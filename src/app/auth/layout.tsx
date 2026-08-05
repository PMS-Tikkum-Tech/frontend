import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "KIKOST",
  description: "Sistem Manajemen Properti - KIKOST",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
