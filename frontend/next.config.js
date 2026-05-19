/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  distDir: '.next-app',
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8001'
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ]
  },
  webpack(config, { dev }) {
    if (!dev) {
      config.cache = false
    }
    return config
  },
}

module.exports = nextConfig
