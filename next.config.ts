import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent native Node.js addons from being bundled into the edge runtime.
  // This works with both Turbopack (Next.js 16 default) and webpack.
  serverExternalPackages: ['better-sqlite3'],
  // Silence the "webpack config but no turbopack config" warning in Next.js 16
  turbopack: {},
};

export default nextConfig;
