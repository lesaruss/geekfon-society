import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return { beforeFiles: [], afterFiles: [], fallback: [] };
  },
};
export default nextConfig;
