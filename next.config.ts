import type { NextConfig } from "next";
import path from "path";

// Pin the workspace root to this project. A stray package-lock.json in the
// Windows home dir made Next infer the wrong root and warn on every run.
const projectRoot = path.resolve(process.cwd());

const nextConfig: NextConfig = {
  output: "export", // Static export for offline Electron packaging (served via app:// scheme)
  outputFileTracingRoot: projectRoot,
  // Lowers peak memory during `next build` — this app's production build can
  // spike hard on low-RAM machines; this trims webpack's retained heap and
  // serialises route compilation to 1 worker so the native SWC allocator
  // doesn't demand ~8 GB contiguous at once (which OOMs a loaded machine).
  experimental: {
    webpackMemoryOptimizations: true,
    cpus: 1,
    workerThreads: false,
  },
  turbopack: {
    root: projectRoot,
  },
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
