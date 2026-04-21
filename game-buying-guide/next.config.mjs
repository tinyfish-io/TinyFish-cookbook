/** @type {import('next').NextConfig} */
const nextConfig = {
  // Prevent Next.js from inferring a workspace root outside this project
  // when multiple lockfiles exist on the machine.
  // See: https://nextjs.org/docs/app/api-reference/config/next-config-js/output#caveats
  outputFileTracingRoot: new URL('.', import.meta.url).pathname,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
