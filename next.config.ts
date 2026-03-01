import type { NextConfig } from 'next'

const isTauriStaticBuild = process.env.npm_lifecycle_event === 'build:static'

const nextConfig: NextConfig = {
  // Static export for Tauri desktop builds
  ...(isTauriStaticBuild ? { output: 'export' } : {}),
}

export default nextConfig
