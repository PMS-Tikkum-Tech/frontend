import type { Metadata } from "next";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import Providers from "./providers";

export const metadata: Metadata = {
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
