/* schema.org JSON-LD and Open Graph cards for every page, the way excellent-web does it: built from the admin's SEO settings
   (Admin > SEO > Config, GET /storefront/seo-config) plus each page's real data (prices, ratings, stock, address). Nothing is
   invented: a field with no value is left out, never filled with a guess. Server side only. */
import { cache } from 'react';
import type { Metadata } from 'next';
import { homeRaw, site } from './data';
import type { Product } from './data';
import { toHome } from './home';

/** The one public address of the shop; every address in the data is made absolute against it. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://www.munshiganjit.com.bd').replace(/\/$/, '');
const API = (process.env.NEXT_PUBLIC_AGAINERP_API || '').replace(/\/$/, '');
const SHOP_LOGO = '/img/mit-logo.png';

export type SeoConfig = {
  enabled: boolean;
  business: {
    name: string; legal_name: string; logo_url: string; phones: string[]; email: string; store_type: string; price_range: string;
    address: { street: string; locality: string; region: string; postal_code: string; country: string };
    social: Record<string, string>;
  };
  pages: { home: boolean; category: boolean; brand: boolean; product: boolean; branches: boolean; offers: boolean; info: boolean };
  product: { item_condition: string; price_valid_days: number; return_days: number; return_policy_url: string };
  meta: Record<string, string>;
};

export const DEFAULT_SEO_CONFIG: SeoConfig = {
  enabled: true,
  business: { name: '', legal_name: '', logo_url: '', phones: [], email: '', store_type: 'OnlineStore', price_range: '', address: { street: '', locality: 'Dhaka', region: '', postal_code: '', country: 'BD' }, social: {} },
  pages: { home: true, category: true, brand: true, product: true, branches: true, offers: true, info: true },
  product: { item_condition: 'NewCondition', price_valid_days: 30, return_days: 0, return_policy_url: '' },
  meta: {},
};

function merge(raw: Partial<SeoConfig> | null): SeoConfig {
  const d = DEFAULT_SEO_CONFIG;
  if (!raw) return d;
  return {
    enabled: raw.enabled !== false,
    business: { ...d.business, ...raw.business, address: { ...d.business.address, ...raw.business?.address }, social: { ...raw.business?.social } },
    pages: { ...d.pages, ...raw.pages },
    product: { ...d.product, ...raw.product },
    meta: { ...raw.meta },
  };
}

/** The saved settings (or the defaults when the API cannot be reached: the page must still render). */
export const getSeoConfig = cache(async (): Promise<SeoConfig> => {
  if (!API) return DEFAULT_SEO_CONFIG;
  try {
    const r = await fetch(`${API}/api/v1/storefront/seo-config`, { next: { tags: ['storefront-data'], revalidate: 60 }, signal: AbortSignal.timeout(8000) });
    if (!r.ok) return DEFAULT_SEO_CONFIG;
    return merge((await r.json())?.data ?? null);
  } catch {
    return DEFAULT_SEO_CONFIG;
  }
});

/** A title / description pattern with {name} {brand} {category} {site} {sku} {price} filled in; "" when the pattern is empty. */
export function applyMetaTemplate(template: string | undefined, vars: Record<string, string | number | undefined>): string {
  const t = (template ?? '').trim();
  if (!t) return '';
  return t
    .replace(/\{(\w+)\}/g, (_m, key: string) => String(vars[key] ?? ''))
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([|,.-])\s*(?=$)/g, '')
    .trim();
}

type Json = Record<string, unknown>;
export const abs = (u?: string | null) => (!u ? '' : /^https?:\/\//i.test(u) ? u : `${SITE_URL}${u.startsWith('/') ? '' : '/'}${u}`);
const clean = <T extends Json>(o: T): T => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0))) as T;
const availability = (s: string) => `https://schema.org/${s === 'in' ? 'InStock' : s === 'pre' || s === 'preorder' ? 'PreOrder' : 'OutOfStock'}`;
/** the plain text of some HTML, cut to n characters */
const plain = (html: string | undefined, n = 300) => (html || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);

/** a Bangladesh number as schema.org wants it: "0134-7561290" -> "+88013..." (a number already with a country code is kept) */
const telephone = (n: string) => { const d = n.replace(/[^\d+]/g, ""); return d.startsWith("+") ? d : d.startsWith("01") && d.length === 11 ? "+88" + d : d; };

/** The shop's identity: the schema settings win, the shop's own settings (Settings > Site, the footer's social links) fill the blanks. */
function identity(cfg: SeoConfig) {
  const b = cfg.business;
  const footerSocial = Object.entries(toHome(homeRaw).footer.social).filter(([k, v]) => k !== 'whatsapp' && /^https?:\/\//i.test(v)).map(([, v]) => v);
  const social = [b.social.facebook, b.social.instagram, b.social.youtube, b.social.tiktok, b.social.x, b.social.linkedin].filter(x => x && x.trim());
  return {
    name: b.name.trim() || site.name,
    legalName: b.legal_name.trim() || undefined,
    logo: abs(b.logo_url.trim() || SHOP_LOGO),
    phones: (b.phones.length ? b.phones : (site.phones?.length ? site.phones : [site.hotline].filter(Boolean))).map(telephone),
    email: b.email.trim() || site.email,
    sameAs: social.length ? social : footerSocial,
  };
}

function postalAddress(cfg: SeoConfig, street: string): Json {
  const a = cfg.business.address;
  return clean({ '@type': 'PostalAddress', streetAddress: street, addressLocality: a.locality, addressRegion: a.region, postalCode: a.postal_code, addressCountry: a.country || 'BD' });
}

/** Home page: the organisation, the store and the site (with its search box). */
export function homeSchema(cfg: SeoConfig): (Json | undefined)[] {
  const id = identity(cfg);
  const storeType = cfg.business.store_type && cfg.business.store_type !== 'Organization' ? cfg.business.store_type : '';
  const street = cfg.business.address.street.trim() || site.address || '';
  const address = street ? postalAddress(cfg, street) : undefined;
  return [
    clean({
      '@context': 'https://schema.org', '@type': 'Organization', '@id': `${SITE_URL}/#organization`, name: id.name, legalName: id.legalName, url: `${SITE_URL}/`,
      logo: id.logo, image: id.logo, email: id.email, telephone: id.phones[0], priceRange: cfg.business.price_range.trim() || undefined, address,
      contactPoint: id.phones.map(tel => ({ '@type': 'ContactPoint', telephone: tel, contactType: 'customer service', areaServed: cfg.business.address.country || 'BD' })),
      sameAs: id.sameAs,
    }),
    // the shop itself as its own item, not a second type on the organisation
    storeType
      ? clean({ '@context': 'https://schema.org', '@type': storeType, '@id': `${SITE_URL}/#store`, name: id.name, url: `${SITE_URL}/`, image: id.logo, telephone: id.phones[0], priceRange: cfg.business.price_range.trim() || undefined, address })
      : undefined,
    {
      '@context': 'https://schema.org', '@type': 'WebSite', '@id': `${SITE_URL}/#website`, name: id.name, url: `${SITE_URL}/`,
      potentialAction: { '@type': 'SearchAction', target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/search?q={search_term_string}` }, 'query-input': 'required name=search_term_string' },
    },
  ];
}

export function breadcrumbSchema(items: { name: string; href: string }[]): Json {
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: abs(c.href) })) };
}

/** A category / sub-category / brand page: a collection with its (first) products listed, and the breadcrumb. */
export function collectionSchema(opts: { name: string; path: string; description?: string; products: Pick<Product, 'id' | 'name' | 'image'>[]; limit?: number; crumbs?: { name: string; href: string }[] }): Json[] {
  const products = opts.products.slice(0, opts.limit ?? 24);
  const out: Json[] = [
    clean({
      '@context': 'https://schema.org', '@type': 'CollectionPage', name: opts.name, url: abs(opts.path), description: opts.description, isPartOf: { '@id': `${SITE_URL}/#website` },
      mainEntity: products.length
        ? { '@type': 'ItemList', numberOfItems: products.length, itemListElement: products.map((p, i) => clean({ '@type': 'ListItem', position: i + 1, url: `${SITE_URL}/${p.id}`, name: p.name, image: abs(p.image) })) }
        : undefined,
    }),
  ];
  if (opts.crumbs?.length) out.push(breadcrumbSchema(opts.crumbs));
  return out;
}

/** category = the category chain of the product ("Power Bank > Baseus") */
export function productSchema(p: Product, description: string, cfg: SeoConfig, sellerName: string, category?: string): Json {
  const url = `${SITE_URL}/${p.id}`;
  const validUntil = cfg.product.price_valid_days > 0 ? new Date(Date.now() + cfg.product.price_valid_days * 86_400_000).toISOString().slice(0, 10) : undefined;
  const returns =
    cfg.product.return_days > 0
      ? clean({
          '@type': 'MerchantReturnPolicy', applicableCountry: cfg.business.address.country || 'BD', returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
          merchantReturnDays: cfg.product.return_days, merchantReturnLink: cfg.product.return_policy_url.trim() ? abs(cfg.product.return_policy_url.trim()) : undefined,
        })
      : undefined;
  return clean({
    '@context': 'https://schema.org', '@type': 'Product', name: p.name, image: p.image ? [abs(p.image)] : undefined, description: plain(description) || p.specs.join(' · ').slice(0, 300),
    sku: p.model || undefined, mpn: p.model || undefined, category: category || undefined,
    brand: p.brand ? { '@type': 'Brand', name: p.brand } : undefined,
    offers: p.price > 0
      ? clean({
          '@type': 'Offer', url, priceCurrency: 'BDT', price: p.price, priceValidUntil: validUntil, availability: availability(p.stock),
          itemCondition: `https://schema.org/${cfg.product.item_condition}`, seller: { '@type': 'Organization', name: sellerName }, hasMerchantReturnPolicy: returns,
        })
      : undefined,
    // a rating only when real reviews stand behind it (an invented one is penalised)
    aggregateRating: p.reviews > 0 && p.rating > 0 ? { '@type': 'AggregateRating', ratingValue: Number(p.rating.toFixed(1)), reviewCount: p.reviews } : undefined,
  });
}

/** An information page (about, contact, help, policies ...) or any page with only a title. */
export function webPageSchema(opts: { name: string; path: string; description?: string }): Json {
  return clean({ '@context': 'https://schema.org', '@type': 'WebPage', name: opts.name, url: abs(opts.path), description: opts.description, isPartOf: { '@id': `${SITE_URL}/#website` } });
}

/** Offers: the products on offer, with the period the offer runs. */
export function offerSchema(opts: { name: string; path: string; description?: string; startISO?: string; endISO?: string; products: Pick<Product, 'id' | 'name' | 'image' | 'price'>[] }): Json[] {
  return [
    clean({
      '@context': 'https://schema.org', '@type': 'OfferCatalog', name: opts.name, url: abs(opts.path), description: opts.description,
      itemListElement: opts.products.slice(0, 24).map(p =>
        clean({ '@type': 'Offer', url: `${SITE_URL}/${p.id}`, priceCurrency: 'BDT', price: p.price > 0 ? p.price : undefined, validFrom: opts.startISO, validThrough: opts.endISO, itemOffered: { '@type': 'Product', name: p.name, image: abs(p.image) } }),
      ),
    }),
  ];
}

/** title + description + the page's own Open Graph / Twitter card, for a page whose text is fixed */
export const pageMeta = (o: { title: string; description: string; path: string }): Metadata => ({
  title: o.title,
  description: o.description,
  openGraph: ogCard({ title: o.title, description: o.description, path: o.path }, 'Munshiganj IT'),
  twitter: { card: 'summary_large_image' },
});

/** The Open Graph card of a page (a page's own openGraph replaces the layout's whole block, so every card states all of it). */
export function ogCard(opts: { title: string; description?: string | null; path: string; image?: string | null }, siteName: string): NonNullable<Metadata['openGraph']> {
  return {
    type: 'website', siteName, locale: 'en_BD', url: opts.path, title: opts.title,
    ...(opts.description ? { description: opts.description } : {}),
    images: [{ url: opts.image ? abs(opts.image) : abs(SHOP_LOGO) }],
  };
}

/* ---------- a Vercel address (xxx.vercel.app) is never the shop itself ---------- */
/** The same shop also answers on its Vercel address. That copy must never be indexed, whatever the admin's Block all says: Block all
 *  is the switch for the real domain, this rule is for the duplicate. */
export const isVercelHost = (host?: string | null) => /(^|\.)vercel\.app(:\d+)?$/i.test((host || '').trim());

/** On a Vercel address /robots.txt lets crawlers in on purpose: Google can only drop the pages it already indexed there when it is
 *  allowed to fetch them and see their noindex tag. Once they are gone from Google, change this to 'closed' (Disallow: /). */
export const VERCEL_ROBOTS: 'open' | 'closed' = 'open';

/* ---------- robots: the admin's "Block all" switch (Website > SEO > Config > Robots) ---------- */
export interface RobotsConfig { block_all: boolean; text: string }
const ROBOTS_CLOSED: RobotsConfig = { block_all: true, text: 'User-agent: *\nDisallow: /' };

/** Block all is on until the admin switches it off. A failed read counts as blocked: a shop that cannot ask must not open itself to
 *  search engines by accident. Used for /robots.txt and for the noindex / nofollow tag of every page. */
/** `fresh` (robots.txt itself) always asks the API; the pages may use a copy up to 30 seconds old. */
export const getRobotsConfig = cache(async (fresh = false): Promise<RobotsConfig> => {
  if (!API) return ROBOTS_CLOSED;
  try {
    const r = await fetch(`${API}/api/v1/storefront/robots-config`, { ...(fresh ? { cache: 'no-store' as const } : { next: { revalidate: 30 } }), signal: AbortSignal.timeout(6000) });
    if (!r.ok) return ROBOTS_CLOSED;
    const d = (await r.json())?.data;
    if (!d || typeof d.block_all !== 'boolean') return ROBOTS_CLOSED;
    return { block_all: d.block_all, text: String(d.text || '') };
  } catch {
    return ROBOTS_CLOSED;
  }
});

/* ---------- sitemap: what the admin (Website > SEO > Config > Sitemap) lets /sitemap.xml list ---------- */
export interface SitemapConfig { enabled: boolean; include_products: boolean; include_categories: boolean; include_brands: boolean; include_blog: boolean; include_pages: boolean; include_images: boolean }
const SITEMAP_ALL: SitemapConfig = { enabled: true, include_products: true, include_categories: true, include_brands: true, include_blog: true, include_pages: true, include_images: true };

export const getSitemapConfig = cache(async (): Promise<SitemapConfig> => {
  if (!API) return SITEMAP_ALL;
  try {
    const r = await fetch(`${API}/api/v1/storefront/sitemap-config`, { next: { revalidate: 60 }, signal: AbortSignal.timeout(6000) });
    if (!r.ok) return SITEMAP_ALL;
    const d = (await r.json())?.data;
    return d && typeof d.enabled === 'boolean' ? { ...SITEMAP_ALL, ...d } : SITEMAP_ALL;
  } catch {
    return SITEMAP_ALL;
  }
});
