/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'difusion.naperu.cloud',
      },
    ],
  },
};

export default nextConfig;
