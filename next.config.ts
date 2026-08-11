import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static output keeps the deployed product independent of an application
  // server. All persisted state remains in the visitor's browser.
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
  assetPrefix: process.env.NEXT_PUBLIC_BASE_PATH || undefined,
};

export default nextConfig;
