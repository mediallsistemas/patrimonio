import type { NextConfig } from 'next'

const isDev = process.env.NODE_ENV === 'development'

const nextConfig: NextConfig = {
  serverExternalPackages: ['@prisma/client', 'prisma'],
  // SHA do deploy embutido em build time nos bundles (client e server) — o
  // watcher de versão compara o do bundle com GET /api/versao e recarrega a
  // página quando um deploy novo entra no ar. Fora da Vercel cai em 'dev'
  // (client e servidor iguais → nunca recarrega).
  env: {
    NEXT_PUBLIC_BUILD_SHA: process.env.VERCEL_GIT_COMMIT_SHA ?? 'dev',
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      encoding: false,
    }
    return config
  },
  async headers() {
    return [
      {
        // Apply to all routes
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            // camera=self permite uso da câmera na própria origem (necessário para capture="environment")
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(), geolocation=()',
          },
          {
            // Only sent over HTTPS — safe to include in all envs
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            // CSP: em dev permite inline scripts do HMR do Next.js; em prod mais restrito
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",  // Next.js RSC hydration requires unsafe-inline
              "style-src 'self' 'unsafe-inline'",  // Tailwind CSS
              "img-src 'self' data: blob: https://s3.amazonaws.com",  // face snapshots + Trílogo asset images
              "font-src 'self'",
              isDev
                ? "connect-src 'self' ws://localhost:* http://localhost:*"  // HMR websocket
                : "connect-src 'self'",
              "worker-src 'self' blob:",            // face-api.js web workers
              "frame-ancestors 'none'",             // no iframes (backup for X-Frame-Options)
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ]
  },
}

export default nextConfig
