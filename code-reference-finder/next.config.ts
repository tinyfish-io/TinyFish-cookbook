import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Allow Chrome extension to embed this app in an iframe
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' chrome-extension://*",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
