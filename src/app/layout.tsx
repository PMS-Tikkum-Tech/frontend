import type { Metadata } from "next";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import Providers from "./providers";

const SITE_BASE_URL = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://kikost.com";

// Nonce-based CSP requires request-time rendering so Next.js can attach the
// per-request nonce to its framework scripts and inline styles.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_BASE_URL),
  icons: {
    icon: [
      { url: "/favicon.ico?v=20260424", type: "image/x-icon" },
      { url: "/favicon-kikost.png?v=20260424", type: "image/png" },
    ],
    shortcut: "/favicon.ico?v=20260424",
    apple: "/favicon-kikost.png?v=20260424",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
