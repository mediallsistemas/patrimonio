import type { NextConfig } from 'next'

const corsOrigins = (process.env.CORS_ORIGINS ?? '').split(',').filter(Boolean)

const nextConfig: NextConfig = {
  serverExternalPackages: ['@prisma/client', 'prisma'],
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
    // CORS dinâmico por origem é tratado no middleware.ts
    // next.config.ts não suporta header dinâmico por request
    return []
  },
}

export default nextConfig
