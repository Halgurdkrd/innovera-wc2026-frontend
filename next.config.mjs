/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  async rewrites() {
    return [
      {
        source: '/api/vps/:path*',
        destination: 'http://72.62.35.32/:path*',
      },
    ]
  },
};

export default nextConfig;
