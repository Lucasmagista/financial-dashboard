/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Fail the build on TS errors to avoid shipping broken code
    ignoreBuildErrors: false,
  },
  images: {
    // Use Next.js optimization; allow remote logos from known hosts
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'logodownload.org',
      },
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
      },
    ],
  },
};

export default nextConfig
