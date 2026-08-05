const isDevelopment = process.env.NODE_ENV === "development";

const nextConfig = {
  output: "standalone",
  distDir: isDevelopment ? ".next-dev" : ".next",
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  async headers() {
    const connectSources = ["'self'", "https://api.kikost.com"];
    if (isDevelopment) {
      connectSources.push("http://localhost:3002", "http://127.0.0.1:3002");
    }

    const securityHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      { key: "X-Frame-Options", value: "DENY" },
      {
        key: "Content-Security-Policy-Report-Only",
        value: [
          "default-src 'self'",
          "base-uri 'self'",
          "object-src 'none'",
          "frame-ancestors 'none'",
          "form-action 'self'",
          "script-src 'self'",
          `connect-src ${connectSources.join(" ")}`,
          "upgrade-insecure-requests",
        ].join("; "),
      },
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
