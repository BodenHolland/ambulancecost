import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Prevent native Node.js addons from being bundled into the edge runtime
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : []),
        'better-sqlite3',
        'node-gyp',
      ];
    }
    return config;
  },
};

export default nextConfig;
