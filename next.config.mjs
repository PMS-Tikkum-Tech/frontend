const isDevelopment = process.env.NODE_ENV === "development";

const nextConfig = {
  output: "standalone",
  distDir: isDevelopment ? ".next-dev" : ".next",
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  async headers() {
    const securityHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      { key: "X-Frame-Options", value: "DENY" },
    ];
    const noStore = [{ key: "Cache-Control", value: "private, no-store" }];
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/auth/:path*", headers: noStore },
      { source: "/admin/:path*", headers: noStore },
      { source: "/owner/:path*", headers: noStore },
      { source: "/tenant/:path*", headers: noStore },
    ];
  },
};

export default nextConfig;
