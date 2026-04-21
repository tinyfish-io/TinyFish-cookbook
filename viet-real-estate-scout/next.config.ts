import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow images from common Vietnamese real-estate listing sites
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.batdongsan.com.vn" },
      { protocol: "https", hostname: "**.nhadat247.com.vn" },
      { protocol: "https", hostname: "**.alonhadat.com.vn" },
    ],
  },
};

export default nextConfig;
