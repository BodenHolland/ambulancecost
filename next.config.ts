import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      'async_hooks': 'node:async_hooks',
    };
    return config;
  },
  turbopack: {}, // Silence turbopack warning
};

export default nextConfig;



