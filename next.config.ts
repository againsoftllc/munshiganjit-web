import type { NextConfig } from 'next';

// the API's photos (product pictures) are optimized too: its address is allowed as an image source
const apiUrl = (() => { try { return new URL((process.env.NEXT_PUBLIC_AGAINERP_API || '').trim()); } catch { return null; } })();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // browsers (and PageSpeed) can map the minified scripts back to the source
  productionBrowserSourceMaps: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    // a replaced picture shows within a day
    minimumCacheTTL: 86400,
    remotePatterns: apiUrl ? [{ protocol: apiUrl.protocol.replace(':', '') as 'http' | 'https', hostname: apiUrl.hostname, ...(apiUrl.port ? { port: apiUrl.port } : {}) }] : [],
  },
  devIndicators: false, // hide the Next.js "N" badge in dev mode
  // Every response on a Vercel address (pages, images, files) tells search engines not to index it: the shop's real address is the only one that should be found.
  async headers() {
    return [
      // the shop's own pictures (banners, logo, payment icons) change with a deploy: browsers may keep them for a month
      { source: '/img/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=2592000, stale-while-revalidate=86400' }] },
      { source: '/:path*', has: [{ type: 'host', value: '(.*)\\.vercel\\.app' }], headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
    ];
  },
  async redirects() {
    return [
      // (The redirect from munshiganjit-web.vercel.app to the real domain was removed: the Vercel address now serves the site itself.)
      { source: '/about', destination: '/about-us', permanent: true },
      { source: '/faq', destination: '/help-support', permanent: true },
      { source: '/pc-builder', destination: '/my-gadget-setup', permanent: true },
    ];
  },
};

export default nextConfig;
