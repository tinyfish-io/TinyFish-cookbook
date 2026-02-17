/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        serverActions: { bodySizeLimit: '10mb' },
        // Back-compat for some Next/Vercel environments
        serverComponentsExternalPackages: ['pdf-parse', 'pdfjs-dist']
    },
    // Avoid bundling PDF parsers into Next's server runtime (fixes pdfjs-dist webpack issues)
    serverExternalPackages: ['pdf-parse', 'pdfjs-dist']
};
module.exports = nextConfig;
