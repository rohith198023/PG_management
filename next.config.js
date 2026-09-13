/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Remove "X-Powered-By: Next.js" fingerprint header from responses
  poweredByHeader: false,

  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'bcryptjs'],
  },

  // ── Phase 12: Production Security Headers ──────────────────────────────
  
  // These headers complement the edge middleware layer and apply at the
  // Next.js response level (useful for static assets not passing middleware).
  async headers() {
    return [
      {
        // Apply to all routes
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      {
        // Strict cache control for API routes — never cache financial data
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
