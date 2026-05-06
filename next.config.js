/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    domains: ['i.ytimg.com', 'img.youtube.com'],
  },
  async headers() {
    return [
      {
        // Apply to all routes
        source: '/(.*)',
        headers: [
          {
            // Explicitly allow YouTube iframes so no browser/proxy blocks them
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.youtube-nocookie.com https://www.youtube.com https://s.ytimg.com",
              "frame-src 'self' https://www.youtube-nocookie.com https://www.youtube.com",
              "img-src 'self' data: blob: https: http:",
              "style-src 'self' 'unsafe-inline'",
              "connect-src 'self' https: wss:",
              "font-src 'self' data:",
              "media-src 'self' https:",
              "worker-src 'self' blob:",
            ].join('; '),
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
