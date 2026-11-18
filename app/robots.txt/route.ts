/* /robots.txt.
   - On the shop's real domain: the text the admin keeps in Website > SEO > Config > Robots. While "Block all" is on (the default)
     every crawler is told to stay away; the admin switches it off when the shop goes live.
   - On a Vercel address (munshiganjit-web.vercel.app): never the shop's robots. Every page there says noindex (layout.tsx, next.config.ts),
     and crawlers may come in so Google can see that and drop the pages it indexed before (VERCEL_ROBOTS in lib/seo.ts). */
import { headers } from 'next/headers';
import { getRobotsConfig, getSitemapConfig, isVercelHost, SITE_URL, VERCEL_ROBOTS } from '@/lib/seo';

export const dynamic = 'force-dynamic';

/** The rules of an open shop: crawlers may read everything except the cart, checkout, account, admin and API addresses. */
const OPEN_RULES = 'User-agent: *\nAllow: /\nDisallow: /cart\nDisallow: /checkout\nDisallow: /account\nDisallow: /website/\nDisallow: /api/';

/** An OPEN shop whose saved rules close the whole site (a bare "Disallow: /", or nothing at all) would still be invisible to Google
 *  with the switch off, which is never what "open" means: the standard rules are used instead. */
const openRules = (text: string) => (!text.trim() || /^\s*disallow:\s*\/\s*$/im.test(text) ? OPEN_RULES : text.trim());

export async function GET() {
  const h = await headers();
  const host = h.get('x-forwarded-host') || h.get('host');
  let body: string;
  if (isVercelHost(host)) {
    body = VERCEL_ROBOTS === 'closed' ? 'User-agent: *\nDisallow: /\n' : 'User-agent: *\nAllow: /\n';
  } else {
    const cfg = await getRobotsConfig(true);
    body = cfg.block_all ? 'User-agent: *\nDisallow: /\n' : openRules(cfg.text) + '\n';
    // an open shop tells crawlers where the sitemap is (unless the admin's text already says so, or the sitemap is switched off)
    if (!cfg.block_all && !/^\s*sitemap:/im.test(body) && (await getSitemapConfig()).enabled) body += `\nSitemap: ${SITE_URL}/sitemap.xml\n`;
  }
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=0, s-maxage=30' } });
}
