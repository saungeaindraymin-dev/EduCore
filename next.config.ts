import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the dev indicator from covering the sidebar's account card
  devIndicators: { position: "bottom-right" },
};

export default nextConfig;
