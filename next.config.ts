import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      // GeekFon Plus (ambassador application program) renamed to GeekFon Pro,
      // 2026-07-27 per Sean. Old bookmarks/links to /plus keep working.
      { source: "/plus", destination: "/pro", permanent: true },
    ];
  },
  async rewrites() {
    return { beforeFiles: [], afterFiles: [], fallback: [] };
  },
};
export default nextConfig;
