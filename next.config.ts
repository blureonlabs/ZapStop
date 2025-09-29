import type { NextConfig } from "next";

const isProd = process.env.VERCEL_ENV === 'production'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
let SUPABASE_ORIGIN = ''
try {
  if (SUPABASE_URL) {
    const u = new URL(SUPABASE_URL)
    SUPABASE_ORIGIN = `${u.protocol}//${u.host}`
  }
} catch {}

const cspParts = [
  "default-src 'self'",
  // Allow Vercel Live only on previews/non-production to avoid CSP blocks
  `script-src 'self' 'unsafe-inline' 'unsafe-eval'${isProd ? '' : ' https://vercel.live'}`,
  `script-src-elem 'self' 'unsafe-inline' 'unsafe-eval'${isProd ? '' : ' https://vercel.live'}`,
  `connect-src 'self'${isProd ? '' : ' https://vercel.live'}${SUPABASE_ORIGIN ? ` ${SUPABASE_ORIGIN}` : ''} https://*.supabase.co`,
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
