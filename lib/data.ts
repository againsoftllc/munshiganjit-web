/* =====================================================================
   Munshiganj IT storefront data layer.

   No data is written in the source. It comes from the AgainERP API
   (GET /api/v1/storefront/munshiganjit/catalog, /content, /gadget-setup, /partners/products).

   - BASELINE: lib/generated/storefront.json, pulled by scripts/sync-data.mjs at build time and bundled.
     It is what a visitor sees if the API cannot be reached.
   - LIVE: every request, the server asks the API for the current data (lib/live.ts), applies it here and
     sends the browser a small patch (what changed since the build) that components/DataSync.tsx applies
     before anything renders. So an admin edit shows on the next page load, with no rebuild.

   The exports below are live containers: their contents are replaced in place, so every existing
   `import { products } from '@/lib/data'` keeps working. This file also holds the types and lookups.
   ===================================================================== */
import raw from './generated/storefront.json';
import { apply, type Patch, type Store } from './patch';
import type { Gadget } from './gadget';
import { SUB_SLUGS } from './format';

export type Hue = 'blue' | 'orange' | 'navy' | 'slate';
export type Stock = 'in' | 'out' | 'preorder' | 'upcoming';
/** subs: the sub-categories (a brand is one named after it, e.g. Power Bank > Baseus). filters: category-wise filter groups */
export interface Category { slug: string; name: string; count: number; icon: string; art?: string; /** [name, product count, slug, and when it has sub-categories of its own (brands under Router): their [name, count, slug] list] */ subs: [string, number, string?, [string, number, string][]?][]; filters?: [string, string[]][] }
export interface Product {
  id: string; /** API product id, used to place orders */ uid?: string; name: string; brand: string; cat: string; sub: string; /** third level (Networking > Router > TP-Link), when the product is filed there */ sub2?: string;
  /** what the visitor pays now: the live offer with the lowest priority number when the product is on offer, else the regular price */
  price: number; old: number | null;
  /** only while an offer is live: the product's regular price (the EMI and partner prices are worked from it, never from the offer price) and when the offer ends (ISO) */
  regular?: number; offerEnds?: string;
  rating: number; reviews: number; sold: number; stock: Stock; qty: number; art: string; hue: Hue; emi: boolean; model: string;
  specs: string[]; colors?: [string, string, number][];
  /** filterable attributes, e.g. { Capacity: '10000mAh', Watt: '22.5W' } */
  attrs?: Record<string, string>;
  /** Discontinued: page stays reachable (and indexed) but the product is hidden from search, menus and listings */
  discontinued?: boolean;
  /** real product photo. Falls back to placeholder art when missing */
  image?: string;
}
export interface BlogPost { id: string; title: string; cat: string; date: string; read: number; author: string; art: string; hue: Hue; featured?: boolean; excerpt: string; product?: string; /** the cover picture set in the admin (otherwise the product's picture, else the drawn art) */ cover?: string }
export interface Review { name: string; area: string; rating: number; topic: string; at: string; text: string }
export interface NewsHeadline { text: string; active: boolean }
export interface FlashItem { id: string; limit: number; sold: number }
export interface FlashSale { id: string; name: string; startAt: string; endAt: string; items: FlashItem[] }
export interface Offer {
  id: string; title: string; desc: string; startAt: string; endAt: string; outlet: 'Online' | 'All Outlet';
  banner: { theme: string; kicker: string; head: string; big: string; bigSub: string; foot: string; products: string[] };
  intro: string; body: string; terms: string[]; links: [string, string][];
  /** the red line under the title of an automatic offer page (admin: Subtitle) */
  subtitle?: string;
  /** admin: Offer page = Auto (Deals-style page with the offer's products) or Custom (a page written in the description box) */
  mode?: 'auto' | 'custom';
  /** the description written in the admin's editor (HTML); `termsHtml` the terms of an automatic offer */
  descHtml?: string;
  termsHtml?: string;
  /** the banner picture uploaded in the admin (Promotions > Offers); without it the banner is drawn from `banner` */
  image?: string;
  /** admin: Show on the Offers list (off = no card on /offers; the offer's own page still works) */
  showInList?: boolean;
  isDeals?: boolean;
  /** set in the admin: "View Details" goes to this address instead of the offer's own product page */
  customLink?: string;
  /** the offer's products (slugs), from the admin; without them the products shown on the banner and of the linked categories */
  items?: string[];
}
export interface Deal {
  id: string; name: string; head: string; tagline: string; body: string; startAt: string; endAt: string; items: string[];
  /** the details / terms written in the admin's editor (HTML): the deal is an offer of Promotions > Offers marked "Use as the Deals page" */
  bodyHtml?: string; termsHtml?: string;
}
export interface ProductReview { n: string; r: number; d: string; t: string; v: boolean }
/** Specification table: attribute groups of the product's attribute profile, each with [name, value] rows */
export interface SpecGroup { g: string; r: [string, string][] }
/** Product-page text kept on the product in the admin: description (HTML), meta title / description, warranty line, reviews, questions, specs */
/** One variant of a product as the catalog feed sends it (price with the live offer worked in) */
export interface VariantRow {
  id: string; sku: string; name: string; price: number; stock: number; inStock?: boolean | null; image?: string; gallery?: string[]; videos?: string[]; videoFirst?: boolean; isDefault?: boolean;
  options?: { name: string; value: string; image?: string }[];
}
export interface ProductDetails {
  desc: string; seoTitle: string; seoDesc: string; warranty: string; rv: ProductReview[]; qa: [string, string][]; specs: SpecGroup[];
  /** the photos of the product's gallery (admin order), when it has more than its thumbnail; the video links (YouTube or a file); true when the admin put the video before the photos */
  gallery?: string[]; videos?: string[]; videoFirst?: boolean;
  /** the variants (colour / size ...), when the product has more than one */
  variants?: VariantRow[];
}
type Site = {
  name: string; hotline: string; phones?: string[]; phone: string; whatsapp: string; email: string; resellerEmail: string;
  map: { embed: string; place: string; directions: string }; address: string; hours: string; totalOrders: number;
  legal: { bin: string; tin: string; tradeLicense: string };
};
/** a promo banner under a product's picture gallery (admin: Website > Promotions > Product Banners); the targets are in the storefront's words */
export interface ProductBanner {
  id: string; image: string; href: string; alt: string; scope: 'all' | 'category' | 'brand' | 'product';
  startsAt: string | null; endsAt: string | null;
  cats?: { cat: string; sub?: string; sub2?: string }[]; brands?: string[]; products?: string[];
}
interface StoreShape {
  productBanners?: ProductBanner[];
  categories: Category[]; products: Product[]; brands: [string, number][]; brandLogos: Record<string, string>;
  site: Site; chatAgents: { id: string; name: string; role: string; photo: string; online: boolean }[];
  headerLogoAnim: { image: string; label: string }[]; alternatives: Record<string, string[]>; blog: BlogPost[];
  recentBuyers: [string, string, string, number, boolean][]; testimonials: [string, string, number, string][];
  REVIEW_TOPICS: [string, string][]; reviews: Review[]; spotlightCategories: string[];
  homeRails: { title: string; icon: string; tone: 'new' | 'top' | 'cat'; source: string; link: string }[];
  trustItems: { icon: string; title: string; points: string[] }[];
  seoText: { title: string; paragraphs: (string | [string, string])[][]; /** the shop's own home-page description (headings + paragraphs), when set it is shown instead of `paragraphs` */ html?: string };
  newsHeadlines: NewsHeadline[]; flashSales: FlashSale[]; offers: Offer[]; deals: Deal[];
  details: Record<string, ProductDetails>;
  gadget: { v2?: Gadget } | null;
  partnerProducts: { reseller: string[]; corporate: string[] };
  mainMenu?: import('./menu').MenuItem[];
  /** Live Edit's home page content (`blocks.munshiganjit` of the admin's Website > Homepage), raw; see lib/home.ts */
  home?: Record<string, unknown>;
}

/* ---------- live containers (contents are replaced in place) ---------- */
export const categories: Category[] = [];
export const products: Product[] = [];
export const brands: [string, number][] = [];
export const productBanners: ProductBanner[] = [];
export const brandLogos: Record<string, string> = {};
export const site = {} as Site;
export const chatAgents: StoreShape['chatAgents'] = [];
export const headerLogoAnim: StoreShape['headerLogoAnim'] = [];
export const alternatives: Record<string, string[]> = {};
export const blog: BlogPost[] = [];
export const recentBuyers: StoreShape['recentBuyers'] = [];
export const testimonials: StoreShape['testimonials'] = [];
export const REVIEW_TOPICS: [string, string][] = [];
export const reviews: Review[] = [];
export const spotlightCategories: string[] = [];
export const homeRails: StoreShape['homeRails'] = [];
export const trustItems: StoreShape['trustItems'] = [];
export const seoText = {} as StoreShape['seoText'];
/** raw `blocks.munshiganjit`; read it through toHome() (lib/home.ts) */
export const homeRaw: Record<string, unknown> = {};
export const newsHeadlines: NewsHeadline[] = [];
export const flashSales: FlashSale[] = [];
export const offers: Offer[] = [];
export const deals: Deal[] = [];
/** what the admin wrote for a category page (description, meta title / description), by category slug; filled on the server only (see lib/live.ts), never sent to the browser as data */
export interface CategoryText { description?: string; metaTitle?: string; metaDescription?: string }
export const categoryText: Record<string, CategoryText> = {};
/** the text of the most specific category of a page: the third level, else the sub-category, else the category */
export function categoryTextFor(cat: Category | undefined, sub?: string, sub2?: string): CategoryText | undefined {
  if (!cat) return undefined;
  const s = sub ? cat.subs.find(x => x[0] === sub) : undefined;
  const kid = s && sub2 ? (s[3] as [string, number, string][] | undefined)?.find(k => k[0] === sub2) : undefined;
  return categoryText[kid?.[2] || s?.[2] || cat.slug];
}
/** products that are not discontinued */
export const visibleProducts: Product[] = [];
const detailsMap: Record<string, ProductDetails> = {};
/** My Gadget Setup plugin data in the generic shape (types, their columns, groups and rules, and the devices); empty while the plugin is off */
export const gadgetData: Gadget = { types: [], devices: [] };
/** ids of the products that have a reseller / corporate price (the prices themselves come after partner sign-in) */
export const partnerProductIds = { reseller: new Set<string>(), corporate: new Set<string>() };
/** the main menu bar made in Live Edit (empty = the built-in menu, the catalog's categories); see lib/menu.ts */
export const mainMenu: import('./menu').MenuItem[] = [];

const swap = <T,>(target: T[], src: T[] | undefined) => { target.splice(0, target.length, ...(src || [])); };
const swapObj = (target: object, src: object | undefined) => {
  const t = target as Record<string, unknown>;
  for (const k of Object.keys(t)) delete t[k];
  Object.assign(t, src || {});
};
const listeners: (() => void)[] = [];
/** run `cb` now and again every time new data has been applied (used by lib/phones.ts) */
export const onDataApplied = (cb: () => void) => { listeners.push(cb); cb(); };

/** replace the contents of every container with this data */
export function applyStore(s: StoreShape) {
  swap(productBanners, s.productBanners);
  swap(categories, s.categories); swap(products, s.products); swap(brands, s.brands); swapObj(brandLogos, s.brandLogos);
  swapObj(site, s.site); swap(chatAgents, s.chatAgents); swap(headerLogoAnim, s.headerLogoAnim); swapObj(alternatives, s.alternatives);
  swap(blog, s.blog); swap(recentBuyers, s.recentBuyers); swap(testimonials, s.testimonials); swap(REVIEW_TOPICS, s.REVIEW_TOPICS);
  swap(reviews, s.reviews); swap(spotlightCategories, s.spotlightCategories); swap(homeRails, s.homeRails); swap(trustItems, s.trustItems);
  swapObj(homeRaw, s.home); swapObj(seoText, s.seoText); swap(newsHeadlines, s.newsHeadlines); swap(flashSales, s.flashSales); swap(offers, s.offers); swap(deals, s.deals);
  swap(visibleProducts, (s.products || []).filter(p => !p.discontinued));
  swapObj(detailsMap, s.details);
  gadgetData.types = s.gadget?.v2?.types || []; gadgetData.devices = s.gadget?.v2?.devices || [];
  swap(mainMenu, s.mainMenu);
  for (const k of Object.keys(SUB_SLUGS)) delete SUB_SLUGS[k];
  for (const c of s.categories || []) for (const sub of c.subs || []) {
    if (sub[2]) SUB_SLUGS[c.slug + '|' + sub[0]] = sub[2];
    for (const k of sub[3] || []) if (k[2]) SUB_SLUGS[c.slug + '|' + sub[0] + '|' + k[0]] = k[2];
  }
  partnerProductIds.reseller.clear(); (s.partnerProducts?.reseller || []).forEach(id => partnerProductIds.reseller.add(id));
  partnerProductIds.corporate.clear(); (s.partnerProducts?.corporate || []).forEach(id => partnerProductIds.corporate.add(id));
  listeners.forEach(cb => cb());
}

/** the data this build was made with; never changed */
export const baselineStore = raw as unknown as Store;
applyStore(baselineStore as unknown as StoreShape);

let lastKey = '';
/** browser + SSR side: baseline + the server's patch. `key` identifies the patch so it is applied once. */
export function applyPatch(patch: Patch | null, key: string) {
  if (key === lastKey) return;
  lastKey = key;
  applyStore(apply(baselineStore, patch) as unknown as StoreShape);
}

/* ---------- lookups ---------- */
export const detailsOf = (id: string): ProductDetails => detailsMap[id] ?? { desc: '', seoTitle: '', seoDesc: '', warranty: '', rv: [], qa: [], specs: [] };
export const byId = (id: string | null | undefined) => products.find(p => p.id === id);
export const catBySlug = (s: string | null | undefined) => categories.find(c => c.slug === s);

export const activeFlashSale = (now = Date.now()) =>
  flashSales.find(s => Date.parse(s.startAt) <= now && now < Date.parse(s.endAt)) || null;

export const offerLive = (o: Offer, now = Date.now()) => Date.parse(o.startAt) <= now && now < Date.parse(o.endAt);

export const activeDeal = (now = Date.now()) =>
  deals.find(d => Date.parse(d.startAt) <= now && now < Date.parse(d.endAt)) || null;
