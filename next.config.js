/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'i.ytimg.com' },
      { protocol: 'https', hostname: 'img.youtube.com' },
    ],
  },
  async headers() {
    return [
      {
        // Apple-App-Site-Association — must be served as JSON with no extension.
        source: '/.well-known/apple-app-site-association',
        headers: [
          { key: 'Content-Type', value: 'application/json' },
          { key: 'Cache-Control', value: 'public, max-age=3600' },
        ],
      },
      {
        // Android App Links verification file
        source: '/.well-known/assetlinks.json',
        headers: [
          { key: 'Content-Type', value: 'application/json' },
          { key: 'Cache-Control', value: 'public, max-age=3600' },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // unsafe-eval is required by Next.js hydration inside WKWebView
              // (the native Capacitor shell).  For the web-only build the eval
              // path is never reached, so this is safe to include globally.
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.youtube-nocookie.com https://www.youtube.com https://s.ytimg.com https://cdn.onesignal.com https://onesignal.com",
              "frame-src 'self' https://www.youtube-nocookie.com https://www.youtube.com https://onesignal.com",
              "img-src 'self' data: blob: https: http:",
              "style-src 'self' 'unsafe-inline'",
              "connect-src 'self' https: wss:",
              "font-src 'self' data:",
              "media-src 'self' https:",
              "worker-src 'self' blob: https://cdn.onesignal.com",
            ].join('; '),
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
