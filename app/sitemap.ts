/* /sitemap.xml, the same way excellent-web does it (a Next sitemap.ts): home, the main pages, every category, product, brand and article,
   the offers and the policy pages, all from the live data the pages show. Which groups go in is chosen in the admin
   (Website > SEO > Config > Sitemap). The addresses are the shop's real address (SITE_URL), never a Vercel address:
   a Vercel address is a copy of the shop and gets an empty sitemap. */
import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { loadFresh } from '@/lib/live';
import { blog, brands, categories, deals, offers, visibleProducts } from '@/lib/data';
import { slugify } from '@/lib/format';
import { getSitemapConfig, isVercelHost, SITE_URL } from '@/lib/seo';

export const dynamic = 'force-dynamic';

const API = (process.env.NEXT_PUBLIC_AGAINERP_API || '').replace(/\/$/, '');
/** the pages that are always there and have nothing private on them */
const STATIC = ['/about-us', '/contact', '/help-support', '/service-center', '/reseller', '/corporate', '/my-gadget-setup', '/reviews', '/policy'];

/** every photo of every product that has a gallery (one bulk call); a product without one uses its main photo */
async function galleries(): Promise<Record<string, string[]>> {
  if (!API) return {};
  try {
    const r = await fetch(`${API}/api/v1/storefront/sitemap/product-images`, { next: { revalidate: 600 }, signal: AbortSignal.timeout(15000) });
    return r.ok ? ((await r.json())?.data ?? {}) : {};
  } catch {
    return {};
  }
}
const full = (u: string) => (/^https?:/i.test(u) ? u : API + u);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const h = await headers();
  if (isVercelHost(h.get('x-forwarded-host') || h.get('host'))) return [];
  const cfg = await getSitemapConfig();
  if (!cfg.enabled) return [];
  await loadFresh(); // the live catalog + content, applied to this server's copy of the data

  const now = new Date();
  const out: MetadataRoute.Sitemap = [];
  const seen = new Set<string>();
  const add = (path: string, priority: number, images?: string[]) => {
    if (seen.has(path)) return;
    seen.add(path);
    out.push({ url: `${SITE_URL}${path === '/' ? '' : path}`, lastModified: now, priority, ...(images?.length ? { images: images.slice(0, 10).map(full) } : {}) });
  };

  add('/', 1);
  if (cfg.include_pages) STATIC.forEach(p => add(p, p === '/policy' ? 0.3 : 0.6));
  if (cfg.include_categories) {
    add('/categories', 0.6);
    add('/offers', 0.6);
    if (deals.length) add('/deals', 0.6); // with no deal running the page only says so
    for (const c of categories) {
      if (c.count > 0) add('/' + c.slug, 0.8);
      for (const s of c.subs) {
        if (s[1] > 0) add('/' + (s[2] || slugify(s[0])), 0.8);
        for (const k of s[3] ?? []) if (k[1] > 0) add('/' + (k[2] || slugify(k[0])), 0.8);
      }
    }
    for (const o of offers) if (o.showInList !== false) add('/offers/' + o.id, 0.5);
  }
  if (cfg.include_brands) {
    add('/brands', 0.6);
    for (const [name, count] of brands) if (count > 0) add('/' + slugify(name), 0.6); // no empty brand pages
  }
  if (cfg.include_blog) {
    add('/blog', 0.5);
    for (const p of blog) add('/blog/' + p.id, 0.5);
  }
  if (cfg.include_products) {
    const gallery = cfg.include_images ? await galleries() : {};
    for (const p of visibleProducts) add('/' + p.id, 0.7, cfg.include_images ? (gallery[p.id]?.length ? gallery[p.id] : p.image ? [p.image] : []) : undefined);
  }
  return out;
}
