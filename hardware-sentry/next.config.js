/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  // Environment variables exposed to browser
  env: {
    APP_NAME: 'Hardware Sentry',
  },

  // API route timeout (90s to accommodate TinyFish scans)
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

module.exports = nextConfig;
