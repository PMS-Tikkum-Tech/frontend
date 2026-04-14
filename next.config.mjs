import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";

/** @type {import('next').NextConfig | ((phase: string) => import('next').NextConfig)} */
const nextConfig = (phase) => {
  const isDevelopmentServer = phase === PHASE_DEVELOPMENT_SERVER;

  return {
    // Pisahkan artefak dev dari artefak build agar chunk tidak saling timpa.
    distDir: isDevelopmentServer ? ".next-dev" : ".next",
  };
};

export default nextConfig;
