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
      // PL/FPL API — added per Antigravity deployment notes; unreachable as of 2026-08-26
      // (verified: 72.62.35.32/api/v1/pl/* and /api/v1/fpl/* both 404 direct on the VPS).
      // Rewrites are wired ahead of time so no frontend redeploy is needed once the
      // backend actually comes up — just re-run the verification curls.
      {
        source: '/api/pl/:path*',
        destination: 'http://72.62.35.32/api/v1/pl/:path*',
      },
      {
        source: '/api/fpl/:path*',
        destination: 'http://72.62.35.32/api/v1/fpl/:path*',
      },
    ]
  },
};

export default nextConfig;
