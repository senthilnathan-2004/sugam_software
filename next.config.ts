import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: undefined, // Let standard static optimization handle SPA routers
  images: {
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
