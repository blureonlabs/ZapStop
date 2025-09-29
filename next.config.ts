import type { NextConfig } from "next";

const isProd = process.env.VERCEL_ENV === 'production'

const cspParts = [
  "default-src 'self'",
  // Allow Vercel Live only on previews/non-production to avoid CSP blocks
  `script-src 'self' 'unsafe-inline' 'unsafe-eval'${isProd ? '' : ' https://vercel.live'}`,
  `script-src-elem 'self' 'unsafe-inline' 'unsafe-eval'${isProd ? '' : ' https://vercel.live'}`,
  `connect-src 'self'${isProd ? '' : ' https://vercel.live'}`,
  "img-src 'self' data: blob:",
  "style-src 'self' 'unsafe-inline'",
  "frame-ancestors 'self'",
  "base-uri 'self'",
]

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: cspParts.join('; '),
  },
]

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
};

export default nextConfig;
