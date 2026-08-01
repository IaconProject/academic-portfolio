/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async redirects() {
    const productionVercelRedirects =
      process.env.VERCEL_ENV === 'production'
        ? [
            {
              source: '/:path*',
              has: [
                {
                  type: 'host',
                  value: '(?<vercelHost>.+\\.vercel\\.app)',
                },
              ],
              // Vercel invokes production cron routes on a *.vercel.app host
              // and does not follow redirects. Its documented user agent
              // bypasses only this canonical-host redirect; the route still
              // requires CRON_SECRET.
              missing: [
                {
                  type: 'header',
                  key: 'user-agent',
                  value: 'vercel-cron/1.0',
                },
              ],
              destination: 'https://www.muhammedakan.com/:path*',
              permanent: true,
            },
          ]
        : [];

    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'muhammedakan.com' }],
        destination: 'https://www.muhammedakan.com/:path*',
        permanent: true,
      },
      ...productionVercelRedirects,
    ];
  },
  async headers() {
    return [
      {
        source: '/admin/:path*',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow, noarchive',
          },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow',
          },
        ],
      },
      {
        source: '/:path*',
        headers: [
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Defense in depth: neither first-party code nor embedded content
          // may invoke the browser's device geolocation permission prompt.
          { key: 'Permissions-Policy', value: 'geolocation=()' },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
};

module.exports = nextConfig;
