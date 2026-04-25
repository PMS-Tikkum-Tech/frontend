const isDevelopment = process.env.NODE_ENV === "development";

const nextConfig = {
  output: "standalone",
  distDir: isDevelopment ? ".next-dev" : ".next",
};

export default nextConfig;
