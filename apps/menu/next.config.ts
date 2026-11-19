import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@repo/database", "@repo/pricing"],
};

export default nextConfig;
