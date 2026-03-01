import type { NextConfig } from 'next'

const isTauriStaticBuild = process.env.npm_lifecycle_event === 'build:static'

const nextConfig: NextConfig = {
  ...(isTauriStaticBuild ? { output: 'export' } : {}),
}

export default nextConfig
