import type { Product, Stock } from './data';

/** Bangladeshi lakh grouping: ৳1,18,500 */
export const money = (n: number) => { const v = Number(n); return '৳' + v.toLocaleString('en-IN', Number.isInteger(v) ? undefined : { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }; // whole taka as before; a coupon's paisa shows as 508.40
export const fmtSold = (n: number) => (n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : String(n));
export const disc = (p: Product) => (p.old ? Math.round((1 - p.price / p.old) * 100) : 0);
export const initials = (name: string) => name.split(' ').map(w => w[0]).join('');

export const STOCK: Record<Stock, [label: string, cls: string]> = {
  in: ['In Stock', 'in'],
  out: ['Out of Stock', 'out'],
  preorder: ['Pre Order', 'pre'],
  upcoming: ['Up Coming', 'up'],
};

export const warrantyFor = (cat: string) => (cat === 'laptops' ? '2 Years' : cat === 'components' ? '3 Years' : '1 Year');

/* ---------- routes (one place to change URL structure) ---------- */
/** Pages that have an address of their own: a product / category / brand slug equal to one of these would be hidden behind it, so
 *  such a slug keeps the old nested address (/product/<slug>, /category/<slug>). */
export const RESERVED = new Set(['about-us', 'account', 'all-pages', 'api', 'blog', 'brands', 'cart', 'categories', 'category', 'checkout', 'compare', 'complain', 'contact', 'corporate', 'deals', 'happy-hour', 'help-support', 'live-edit', 'login', 'my-gadget-setup', 'offers', 'partner', 'policy', 'product', 'products', 'register', 'reseller', 'reviews', 'search', 'service-center', 'track-order', 'wishlist', 'about', 'faq', 'pc-builder']);
/** a product's address: domain + its slug (/baseus-ppjp311-22-5w-10000mah-power-bank) */
export const productUrl = (id: string) => (RESERVED.has(id) ? `/product/${id}` : `/${id}`);
/* 'Home Theatre & Soundbar' → 'home-theatre-and-soundbar', 'TP-Link' → 'tp-link' */
export const slugify = (s: string) => s.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
/* SEO category URLs: /category/cameras · /category/cameras/dslr · /category/cameras/dslr/sony
   (a brand without a sub-category stays a filter: /category/cameras?brand=Sony) */
/** the slug of each sub-category ("<cat>|<name>" -> "hoco-earbuds"), filled from the catalog data (lib/data.ts); a name with no slug there falls back to its own text */
export const SUB_SLUGS: Record<string, string> = {};
export const subSlug = (cat: string, name: string, name2?: string) => SUB_SLUGS[cat + '|' + name + (name2 ? '|' + name2 : '')] || slugify(name2 || name);
/** a category's address is its own slug (/power-bank); a sub-category is its own slug too (/xiaomi-power-bank), never nested under the parent.
 *  A brand filter on a whole category stays a query (/power-bank?brand=Xiaomi). */
export const catUrl = (slug: string, q?: { sub?: string; sub2?: string; brand?: string }) => {
  if (q?.sub) { const s = subSlug(slug, q.sub, q.sub2); return RESERVED.has(s) ? `/category/${slug}/${s}` : `/${s}`; }
  const base = RESERVED.has(slug) ? `/category/${slug}` : `/${slug}`;
  return base + (q?.brand ? '?brand=' + encodeURIComponent(q.brand) : '');
};
/** a brand's page: domain + the brand's slug (/xiaomi) */
export const brandUrl = (name: string) => { const s = slugify(name); return RESERVED.has(s) ? '/brands?brand=' + encodeURIComponent(name) : '/' + s; };
export const blogUrl = (id: string) => `/blog/${id}`;

/* 10 Oct 2026 — Dhaka time (offer / deal date ranges) */
/* An offer with no start date is stored as the year 2000 and one with no end date as 2100 (the admin form shows both as empty). */
export const NO_START = Date.UTC(2001, 0, 1);
export const NO_END = Date.UTC(2099, 0, 1);
export const hasEnd = (iso: string) => Date.parse(iso) < NO_END;
export const dateRange = (a: string, b: string) => {
  const s = Date.parse(a) > NO_START, e = Date.parse(b) < NO_END;
  return s && e ? fmtDate(a) + ' - ' + fmtDate(b) : s ? 'From ' + fmtDate(a) : e ? 'Until ' + fmtDate(b) : '';
};
export const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Dhaka' });
