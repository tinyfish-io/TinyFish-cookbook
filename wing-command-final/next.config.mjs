/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // output: 'standalone', // Only needed for Docker-based deploys without node_modules
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.doordash.com',
      },
      {
        protocol: 'https',
        hostname: '**.ubereats.com',
      },
      {
        protocol: 'https',
        hostname: '**.grubhub.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

export default nextConfig;
